"""Evidence mining (guide step 1.2): how often does a student's room change between sessions?

Reads the real weekly schedule HTML locally and prints AGGREGATES ONLY (no IDs, no names).
Counting rules (written before running):
  - Population N = every student in STU.
  - A "session with a room" = a session where STU gives that student a non-empty room.
  - "Room change" = this session's room differs from the student's previous session-with-a-room.
  - Per student: distinct rooms, distinct buildings, change rate = changes / (sessions_with_room - 1).
Usage: python scripts/mine_room_changes.py PATH/TO/Thoi_khoa_bieu.html
"""
import os
import statistics
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "codebase"))
from tkb import _const, _script, parse  # noqa: E402


def main(path):
    with open(path, encoding="utf-8") as f:
        html = f.read()
    data = parse(html)
    stu = _const(_script(html), "STU")
    distinct, buildings, rates, multi_bld = [], [], [], 0
    for row in stu.values():
        rooms = [r.rstrip("*") for r in row[1:] if r]
        if len(rooms) < 2:
            continue
        changes = sum(1 for a, b in zip(rooms, rooms[1:]) if a != b)
        distinct.append(len(set(rooms)))
        blds = set(r[0] for r in rooms)
        buildings.append(len(blds))
        multi_bld += len(blds) >= 2
        rates.append(changes / (len(rooms) - 1))
    n = len(rates)
    print("Students with >=2 roomed sessions: %d / %d" % (n, len(stu)))
    print("Distinct rooms per student: median %s, max %d" % (statistics.median(distinct), max(distinct)))
    print("Students using >=2 buildings: %d/%d (%.0f%%)" % (multi_bld, n, 100 * multi_bld / n))
    print("Room-change rate between consecutive sessions: median %.0f%%, mean %.0f%%"
          % (100 * statistics.median(rates), 100 * statistics.mean(rates)))
    sess = [s for g in data["groups"].values() for s in g["sessions"]]
    split = sum(1 for s in sess if len(s["rooms"]) >= 2)
    print("Class sessions split across >=2 rooms: %d/%d (%.0f%%)" % (split, len(sess), 100 * split / len(sess)))


if __name__ == "__main__":
    main(sys.argv[1])
