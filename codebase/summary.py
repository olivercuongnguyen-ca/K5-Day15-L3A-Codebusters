"""AI summary: "tuần này mình còn cần làm gì" — one model call over what is LEFT of the student's week.

Only items that are still ongoing or ahead of `now` are summarised (past classes and missed deadlines are dropped
in code before the model sees anything).

Facts only (titles, times, rooms, deadlines); no Phoenix links or passcodes go to the model.
Output JSON: {"headline": str, "items": [{"when": str, "what": str}], "tip": str}
Guard: every "when" must reference a date that exists in the facts; otherwise fall back to a rule-based list.
"""
import json
import re

from ai import MODEL_PROVIDER, call_model

SYSTEM = """Bạn là trợ lý lịch học của một học viên AI20K. Dựa DUY NHẤT vào FACTS (lịch tuần), viết bản tóm tắt
"tuần này mình còn cần làm gì" bằng tiếng Việt, xưng "bạn". FACTS chỉ gồm những việc từ thời điểm "now" đến hết
tuần (việc đã qua đã bị bỏ); không nhắc tới việc đã qua.
- headline: 1 câu nêu điều quan trọng nhất từ giờ đến hết tuần (việc gần nhất, hạn nộp, chỗ trùng giờ).
- items: tối đa 6 việc theo thứ tự thời gian, mỗi việc {"when": "T5 27/11 16:00", "what": "..."}; ưu tiên hạn nộp,
  buổi học có phòng, chỗ trùng giờ. Gộp các hạn lặp lại hằng ngày thành một dòng.
- tip: 1 gợi ý ngắn, thực tế (vd chuẩn bị trước buổi, xử lý chỗ trùng giờ).
Không bịa sự kiện, giờ hay phòng không có trong FACTS. Trả về DUY NHẤT JSON {"headline","items","tip"}."""
DOW = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]


def remaining(week: dict, now: str) -> dict:
    """Keep only items not yet over at `now` ("YYYY-MM-DDTHH:MM", VN local, same clock as the item times).
    Deadlines count until their due time; classes/events until they end."""
    keep = [i for i in week["items"] if (i["start"] if i.get("is_deadline") else i["end"])[:16] > now[:16]]
    ids = {i["id"] for i in keep}
    return dict(week, items=keep, now=now[:16], days=[d for d in week["days"] if d >= now[:10]] or week["days"][-1:],
                clashes=[c for c in week.get("clashes", []) if c[0] in ids and c[1] in ids])


def _facts(week: dict) -> dict:
    from datetime import date
    items = []
    for i in week["items"]:
        d = date.fromisoformat(i["start"][:10])
        items.append({"when": "%s %s %s" % (DOW[d.weekday()], d.strftime("%d/%m"), i["start"][11:16]),
                      "title": i["title"], "type": "deadline" if i.get("is_deadline") else i["kind"],
                      "room": i.get("my_room") or "", "source": i["source"]})
    ids = {i["id"]: i for i in week["items"]}
    clashes = [[ids[a]["title"], ids[b]["title"]] for a, b in week.get("clashes", []) if a in ids and b in ids]
    return {"now": week.get("now", ""), "until": week["days"][-1], "items": items, "clashes": clashes}


def _fallback(facts: dict) -> dict:
    dls = [i for i in facts["items"] if i["type"] == "deadline"]
    cls = [i for i in facts["items"] if i["source"] == "tkb"]
    items = [{"when": i["when"], "what": i["title"] + (" · phòng " + i["room"] if i["room"] else "")} for i in cls]
    seen = set()
    for i in dls:
        if i["title"] not in seen:
            seen.add(i["title"])
            items.append({"when": i["when"], "what": i["title"]})
    head = "Từ giờ đến hết tuần bạn còn %d buổi học và %d hạn nộp." % (len(cls), len(dls))
    tip = ("Có %d chỗ trùng giờ, xem lại để chọn ưu tiên." % len(facts["clashes"])) if facts["clashes"] else \
        "Xem trước phòng học để không đi nhầm tòa."
    return {"headline": head, "items": items[:6], "tip": tip, "ai": False}


def summarize(week: dict) -> dict:
    facts = _facts(week)
    if not facts["items"]:
        return {"headline": "Tuần này bạn không còn việc nào. Nghỉ ngơi nhé!", "items": [], "tip": "", "ai": False}
    if MODEL_PROVIDER == "fake":
        return _fallback(facts)
    r = call_model(SYSTEM, "FACTS:\n" + json.dumps(facts, ensure_ascii=False))
    m = re.search(r"\{.*\}", r["text"], re.S)
    try:
        out = json.loads(m.group(0)) if m else {}
    except ValueError:
        out = {}
    whens = " ".join(i["when"] for i in facts["items"])
    items = [x for x in out.get("items", []) if isinstance(x, dict)
             and re.search(r"\d{2}/\d{2}", str(x.get("when", ""))) and re.search(r"\d{2}/\d{2}", str(x.get("when"))).group(0) in whens]
    if not out.get("headline") or not items:
        return _fallback(facts)
    return {"headline": out["headline"], "items": items[:6], "tip": out.get("tip", ""), "ai": True,
            "usage": {"model": r["model"], "tokens_in": r["tokens_in"], "tokens_out": r["tokens_out"]}}
