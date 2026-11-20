"""
TARS seed: builds tars.db (clash-free timetable) and exports mock JSON for the frontend.
Run from the repo root:   python3 backend/app/seed.py
Uses only the Python standard library.
"""
import json, random, sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DB = ROOT / "backend" / "tars.db"
SCHEMA = Path(__file__).with_name("schema.sql")
MOCK = ROOT / "frontend" / "mock"
DAYS = ["MON", "TUE", "WED", "THU", "FRI"]

PERIODS = [(1, "09:00", "09:55"), (2, "09:55", "10:50"), (3, "11:05", "12:00"),
           (4, "12:00", "12:55"), (5, "13:45", "14:40"), (6, "14:40", "15:35")]

SUBJECTS = [("DS", "Data Structures", 0), ("MATH", "Engineering Maths", 0),
            ("DLD", "Digital Logic Design", 0), ("OOP", "OOP with Java", 0),
            ("COA", "Computer Organisation", 0), ("DSL", "Data Structures Lab", 1)]
HOURS = {"DS": 5, "MATH": 5, "DLD": 4, "OOP": 4, "COA": 4, "DSL": 2}

FACULTY = [  # id, name, subjects they can teach
    ("F01", "Dr. Ananya Rao", "DS,DSL"),     ("F02", "Prof. Kiran Kumar", "DS,OOP"),
    ("F03", "Dr. Meera Iyer", "MATH"),       ("F04", "Prof. Rahul Nair", "MATH,DLD"),
    ("F05", "Dr. Sneha Patil", "DLD,COA"),   ("F06", "Prof. Arjun Shetty", "COA,OOP"),
    ("F07", "Dr. Farah Khan", "OOP,DSL"),    ("F08", "Prof. Vikram Joshi", "DS,MATH"),
]
# who teaches what to which section
ASSIGN = {
    "CSE-A": {"DS": "F01", "MATH": "F03", "DLD": "F05", "OOP": "F02", "COA": "F06", "DSL": "F01"},
    "CSE-B": {"DS": "F02", "MATH": "F04", "DLD": "F05", "OOP": "F07", "COA": "F06", "DSL": "F07"},
    "CSE-C": {"DS": "F08", "MATH": "F03", "DLD": "F04", "OOP": "F06", "COA": "F05", "DSL": "F01"},
}
HOME_ROOM = {"CSE-A": "R101", "CSE-B": "R102", "CSE-C": "R103"}
ROOMS = [("R101", "Room 101", "classroom", 60), ("R102", "Room 102", "classroom", 60),
         ("R103", "Room 103", "classroom", 60), ("R104", "Room 104 (spare)", "classroom", 60),
         ("LAB1", "DS Lab 1", "lab", 40), ("LAB2", "DS Lab 2", "lab", 40),
         ("HALL", "Main Auditorium", "hall", 300)]

USERS = [("S001", "Shreyansh", "student", "CSE-A", "1AB25CS001"), ("S002", "Aditi", "student", "CSE-B", "1AB25CS002"),
         ("S003", "Rohan", "student", "CSE-C", "1AB25CS003"), ("H01", "HOD (CSE)", "hod", None, None)]

ATTENDANCE = {  # deliberately some < 75% so the priority rule matters in the demo
    "CSE-A": {"DS": 71, "MATH": 82, "DLD": 88, "OOP": 79, "COA": 74, "DSL": 92},
    "CSE-B": {"DS": 85, "MATH": 69, "DLD": 81, "OOP": 90, "COA": 77, "DSL": 95},
    "CSE-C": {"DS": 78, "MATH": 80, "DLD": 72, "OOP": 86, "COA": 83, "DSL": 89},
}
EVENTS = [
    ("CyberSec Workshop: Intro to CTFs", "CyberSec Student Chapter", "Main Auditorium", "WED", "14:00", "16:00"),
    ("Startup Pitch Night", "Tech Park Innovation Hub", "Seminar Hall", "THU", "16:00", "18:00"),
    ("Placement Talk: Product Companies", "Campus Career Cell", "Main Auditorium", "FRI", "11:05", "12:55"),
]


def build_timetable(seed=7):
    """Greedy random placement with retries; guarantees no section/faculty/room clash."""
    rng = random.Random(seed)
    for _ in range(500):
        busy_fac, busy_room, slots, ok = set(), set(), [], True
        for section, subj_map in ASSIGN.items():
            todo = [s for s, n in HOURS.items() for _ in range(n)]
            rng.shuffle(todo)
            cells = [(d, p) for d in DAYS for p, _, _ in PERIODS]
            rng.shuffle(cells)
            per_day = {}
            for subj in todo:
                fac = subj_map[subj]
                placed = False
                for cell in cells:
                    d, p = cell
                    if (d, subj) in per_day and subj != "DSL" and per_day[(d, subj)] >= 1:
                        continue  # max 1 theory class of a subject per day
                    if (fac, d, p) in busy_fac:
                        continue
                    rooms = ["LAB1", "LAB2"] if subj == "DSL" else [HOME_ROOM[section]]
                    room = next((r for r in rooms if (r, d, p) not in busy_room), None)
                    if room is None:
                        continue
                    busy_fac.add((fac, d, p)); busy_room.add((room, d, p))
                    per_day[(d, subj)] = per_day.get((d, subj), 0) + 1
                    slots.append((d, p, section, subj, fac, room))
                    cells.remove(cell); placed = True
                    break
                if not placed:
                    ok = False; break
            if not ok:
                break
        if ok:
            return slots
        seed += 1; rng = random.Random(seed)
    raise RuntimeError("could not build a clash-free timetable")


def main():
    DB.unlink(missing_ok=True)
    con = sqlite3.connect(DB)
    con.executescript(SCHEMA.read_text())
    cur = con.cursor()
    cur.executemany("INSERT INTO periods VALUES (?,?,?)", PERIODS)
    cur.executemany("INSERT INTO subjects VALUES (?,?,?)", SUBJECTS)
    cur.executemany("INSERT INTO rooms VALUES (?,?,?,?)", ROOMS)
    for fid, name, subs in FACULTY:
        cur.execute("INSERT INTO users (id,name,role) VALUES (?,?, 'faculty')", (fid, name))
        cur.execute("INSERT INTO faculty (id,subjects) VALUES (?,?)", (fid, subs))
    cur.executemany("INSERT INTO users (id,name,role,section,usn) VALUES (?,?,?,?,?)", USERS)
    for sec, m in ATTENDANCE.items():
        cur.executemany("INSERT INTO attendance VALUES (?,?,?)", [(sec, s, v) for s, v in m.items()])
    cur.executemany("INSERT INTO events (title,org,venue,day,start,end) VALUES (?,?,?,?,?,?)", EVENTS)
    cur.executemany("INSERT INTO slots (day,period,section,subject_code,faculty_id,room_id) VALUES (?,?,?,?,?,?)",
                    build_timetable())
    con.commit()
    export_mock(con)

    # demo hint: F01 absent on MON
    rows = con.execute("SELECT period, section, subject_code FROM slots WHERE faculty_id='F01' AND day='MON' ORDER BY period").fetchall()
    n = con.execute("SELECT COUNT(*) FROM slots").fetchone()[0]
    print(f"OK  tars.db created with {n} slots, 0 clashes (enforced by unique indexes)")
    print(f"Demo: Dr. Ananya Rao (F01) absent MON -> affects {[tuple(r) for r in rows]}")
    print(f"Mock JSON written to {MOCK}")
    con.close()


def export_mock(con):
    con.row_factory = sqlite3.Row
    MOCK.mkdir(parents=True, exist_ok=True)
    q = """SELECT s.id, s.day, s.period, p.start, p.end, s.section, s.subject_code,
                  sub.name AS subject_name, s.faculty_id, u.name AS faculty_name, s.room_id, s.status
           FROM slots s JOIN periods p USING(period) JOIN subjects sub ON sub.code=s.subject_code
           JOIN users u ON u.id=s.faculty_id WHERE s.section=? ORDER BY
           CASE s.day WHEN 'MON' THEN 1 WHEN 'TUE' THEN 2 WHEN 'WED' THEN 3 WHEN 'THU' THEN 4 ELSE 5 END, s.period"""
    for sec in ASSIGN:
        rows = [dict(r) for r in con.execute(q, (sec,))]
        (MOCK / f"timetable_{sec}.json").write_text(json.dumps(rows, indent=2))
    (MOCK / "attendance_CSE-A.json").write_text(json.dumps(
        [{"subject_code": s, "percent": v} for s, v in ATTENDANCE["CSE-A"].items()], indent=2))
    (MOCK / "me.json").write_text(json.dumps({"user_id": "S001", "usn": "1AB25CS001", "name": "Shreyansh", "role": "student", "section": "CSE-A"}, indent=2))
    demo = [dict(user_id=u, usn=usn, name=n, role=r, section=s) for u, n, r, s, usn in USERS]
    demo += [dict(user_id=f, usn=None, name=n, role="faculty", section=None) for f, n, _ in FACULTY]
    (MOCK / "demo_users.json").write_text(json.dumps(demo, indent=2))
    (MOCK / "stream_events.json").write_text(json.dumps([
        {"event": "agent_step", "data": {"decision_id": 1, "step": "perceive", "text": "Dr. Ananya Rao absent MON: 2 slots affected (CSE-A P1 DSL, P2 DS)", "ts": "2026-11-25T10:42:01"}},
        {"event": "agent_step", "data": {"decision_id": 1, "step": "tool_call", "text": "get_attendance(CSE-A, DS) -> 71%", "ts": "2026-11-25T10:42:02"}},
        {"event": "agent_step", "data": {"decision_id": 1, "step": "tool_call", "text": "find_substitute(DS, MON P2) -> Prof. Vikram Joshi (load 5)", "ts": "2026-11-25T10:42:03"}},
        {"event": "agent_step", "data": {"decision_id": 1, "step": "act", "text": "validate_clash OK, committed, Telegram sent to F08", "ts": "2026-11-25T10:42:04"}},
        {"event": "timetable_updated", "data": {"section": "CSE-A", "slot_ids": [1, 2]}},
        {"event": "nudge_created", "data": {"id": 3, "user_id": "S001", "kind": "replan", "title": "TARS re-planned your day", "body": "DS at 09:55 is now with Prof. Vikram Joshi.", "created_at": "2026-11-25T10:42:05", "read": False}}
    ], indent=2))
    (MOCK / "events.json").write_text(json.dumps(
        [dict(id=i + 1, title=t, org=o, venue=v, day=d, start=s, end=e, clashes_with=[])
         for i, (t, o, v, d, s, e) in enumerate(EVENTS)], indent=2))
    (MOCK / "decisions.json").write_text(json.dumps([{
        "id": 1, "created_at": "2026-11-25T10:42:00", "trigger": "absence",
        "summary": "Dr. Ananya Rao absent: CSE-A DS (MON P3) reassigned to Prof. Vikram Joshi in R101",
        "reasoning": "CSE-A DS attendance is 71% (<75%), so cancelling was rejected. Prof. Joshi teaches DS, is free MON P3 and has the lowest weekly load (5).",
        "affected_slot_ids": [1], "status": "pending_ack"}], indent=2))
    (MOCK / "nudges.json").write_text(json.dumps([
        {"id": 1, "user_id": "S001", "kind": "replan", "title": "TARS re-planned your day",
         "body": "DS at 11:05 is now with Prof. Vikram Joshi, same room.", "created_at": "2026-11-25T10:43:00", "read": False},
        {"id": 2, "user_id": "S001", "kind": "free_slot", "title": "Free slot recommended",
         "body": "You're free 14:40–15:35. DS assignment due tomorrow; block it?", "created_at": "2026-11-25T09:00:00", "read": False}], indent=2))
    (MOCK / "stats.json").write_text(json.dumps({"classes_lost": 0, "rescued": 4, "nudges_acted": 17, "avg_response_s": 38}, indent=2))


if __name__ == "__main__":
    main()
