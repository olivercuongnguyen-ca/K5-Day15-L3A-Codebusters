"""Nối model — chỗ DUY NHẤT trong bản chạy thử gọi model AI. NHÓM VIẾT phần gọi model thật.

Hợp đồng (giữ nguyên để khung đo được token):
    call_model(system: str, user: str) -> dict với 4 khoá
        "text":       str   chữ model trả về
        "model":      str   tên model đã gọi (để tra giá ở bảng giá model)
        "tokens_in":  int   số token vào, lấy từ trường usage trong phản hồi API — KHÔNG ước lượng
        "tokens_out": int   số token ra, gồm cả token suy luận / suy nghĩ nếu API tính riêng
    @model_call (từ tracing.py) tự ghi mỗi lần gọi vào trace; agent.py gọi call_model bao nhiêu lần
    cũng được, khung tự cộng token.
    Lỗi gọi model (hết lượt, sai key, mất mạng): cứ để exception bay ra — khung ghi lỗi vào cột error.

Chế độ giả (mặc định khi .env chưa có MODEL_PROVIDER, hoặc MODEL_PROVIDER=fake):
    trả một câu giả cố định, model "fake", token 0 — để luồng chạy hết từ trước CP2 (guide bước 3.2).
    Lượt `run.py eval` / `run.py simulate` chạy bằng model giả KHÔNG được tính.

Nối model thật: điền .env (chép từ .env.example), rồi viết nhánh gọi API ở dưới theo docs/connect-model.md
(có ví dụ OpenAI, Claude, model chạy trên máy, và cách nối nhà cung cấp khác). Không dán API key vào file này.
"""
import json
import os
import urllib.error
import urllib.request

from tracing import model_call

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_env(path=os.path.join(ROOT, ".env")):
    """Đọc file .env (KEY=VALUE mỗi dòng) vào biến môi trường, không ghi đè biến đã có. Khung — không cần sửa."""
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env()
MODEL_PROVIDER = (os.environ.get("MODEL_PROVIDER") or "fake").strip().lower()
MODEL_NAME = (os.environ.get("MODEL_NAME") or "").strip()
API_KEY = (os.environ.get("API_KEY") or "").strip()


@model_call
def call_model(system: str, user: str) -> dict:
    if MODEL_PROVIDER == "fake":
        last = (user.strip().splitlines() or [""])[-1]
        return {"text": "[câu trả lời giả — chưa nối model] " + last[:60], "model": "fake", "tokens_in": 0, "tokens_out": 0}

    if MODEL_PROVIDER == "openai":
        r = call_openai(system, user)
    elif MODEL_PROVIDER == "openrouter":
        r = call_openrouter(system, user)
    elif MODEL_PROVIDER == "gemini":
        r = call_gemini(system, user)
    else:
        raise NotImplementedError(
            "chưa viết phần gọi model thật cho MODEL_PROVIDER=%s trong codebase/ai.py — xem docs/connect-model.md"
            % MODEL_PROVIDER)
    return {"text": r["text"], "model": MODEL_NAME, "tokens_in": int(r["tokens_in"]), "tokens_out": int(r["tokens_out"])}


URL_OPENAI = "https://api.openai.com/v1/chat/completions"
URL_OPENROUTER = "https://openrouter.ai/api/v1/chat/completions"
URL_GEMINI = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent"


def post_json(url, headers, body, timeout=90):
    """POST JSON with stdlib urllib, return parsed JSON."""
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), method="POST",
                                 headers=dict({"Content-Type": "application/json"}, **headers))
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise RuntimeError("HTTP %d: %s" % (e.code, e.read().decode("utf-8", "replace")[:300]))


def call_openai(system, user):
    messages = ([{"role": "system", "content": system}] if system else []) + [{"role": "user", "content": user}]
    data = post_json(URL_OPENAI, {"Authorization": "Bearer " + API_KEY},
                     {"model": MODEL_NAME, "messages": messages, "response_format": {"type": "json_object"},
                      "reasoning_effort": "low"})
    u = data["usage"]
    return {"text": data["choices"][0]["message"]["content"],
            "tokens_in": u["prompt_tokens"], "tokens_out": u["completion_tokens"]}


def call_openrouter(system, user):
    """OpenRouter: OpenAI-compatible chat API. MODEL_NAME like "google/gemini-2.5-flash" or "openai/gpt-5-mini".
    `reasoning` is ignored by models that do not reason; completion_tokens already include reasoning tokens."""
    messages = ([{"role": "system", "content": system}] if system else []) + [{"role": "user", "content": user}]
    data = post_json(URL_OPENROUTER, {"Authorization": "Bearer " + API_KEY, "X-Title": "Codebusters AI20K"},
                     {"model": MODEL_NAME, "messages": messages, "response_format": {"type": "json_object"},
                      "reasoning": {"effort": "low"}})
    if "error" in data:
        raise RuntimeError("OpenRouter: %s" % str(data["error"])[:300])
    u = data["usage"]
    return {"text": data["choices"][0]["message"]["content"] or "",
            "tokens_in": u["prompt_tokens"], "tokens_out": u["completion_tokens"]}


def call_gemini(system, user):
    """Google Gemini API (generateContent). MODEL_NAME like "gemini-2.5-flash". Key goes in a header, not the URL.
    tokens_out = candidates + thinking tokens (Gemini reports thinking separately)."""
    body = {"contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": {"responseMimeType": "application/json"}}
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}
    data = post_json(URL_GEMINI % MODEL_NAME, {"x-goog-api-key": API_KEY}, body)
    cand = (data.get("candidates") or [{}])[0]
    parts = (cand.get("content") or {}).get("parts") or []
    text = "".join(p.get("text", "") for p in parts if not p.get("thought"))
    if not text:
        raise RuntimeError("Gemini returned no text (finishReason=%s)" % cand.get("finishReason"))
    u = data.get("usageMetadata", {})
    return {"text": text, "tokens_in": u.get("promptTokenCount", 0),
            "tokens_out": u.get("candidatesTokenCount", 0) + u.get("thoughtsTokenCount", 0)}
