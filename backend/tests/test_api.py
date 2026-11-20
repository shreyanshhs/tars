from conftest import H, seed_name

SLOT_KEYS = {"id", "day", "period", "start", "end", "section", "subject_code", "subject_name",
             "faculty_id", "faculty_name", "room_id", "status"}


def test_login_student_by_usn_case_insensitive(client):
    r = client.post("/api/auth/login", json={"login_id": "  1ab25cs001 "})
    assert r.status_code == 200
    body = r.json()
    assert {k: body[k] for k in ("user_id", "usn", "role", "section")} == {
        "user_id": "S001", "usn": "1AB25CS001", "role": "student", "section": "CSE-A"}
    assert body["name"] == seed_name("S001")  # name comes from seed_data.json, not code


def test_login_staff_and_unknown(client):
    assert client.post("/api/auth/login", json={"login_id": "f08"}).json()["role"] == "faculty"
    assert client.post("/api/auth/login", json={"login_id": "H01"}).json()["role"] == "hod"
    r = client.post("/api/auth/login", json={"login_id": "nope"})
    assert r.status_code == 404 and r.json()["error"] == "not_found"


def test_demo_users(client):
    users = client.get("/api/auth/demo-users").json()
    assert len(users) == 12
    assert [u["user_id"] for u in users[:4]] == ["S001", "S002", "S003", "H01"]


def test_auth_required(client):
    assert client.get("/api/me").status_code == 401
    r = client.get("/api/me", headers=H("X99"))
    assert r.status_code == 401 and r.json() == {"error": "unauthorized", "detail": "Unknown user id"}
    assert client.get("/api/me", headers=H("S001")).json()["section"] == "CSE-A"


def test_hod_only(client):
    for path in ("/api/decisions", "/api/stats"):
        assert client.get(path, headers=H("S001")).status_code == 403
        assert client.get(path, headers=H("F01")).status_code == 403
        assert client.get(path, headers=H("H01")).status_code == 200
    assert client.get("/api/stats", headers=H("H01")).json() == {
        "classes_lost": 0, "rescued": 0, "nudges_acted": 0, "avg_response_s": 0}


def test_timetable_demo_scenario(client):
    slots = client.get("/api/timetable", headers=H("S001")).json()  # defaults to own section
    assert len(slots) == 24 and set(slots[0]) == SLOT_KEYS
    mon_f01 = [(s["period"], s["subject_code"]) for s in slots if s["day"] == "MON" and s["faculty_id"] == "F01"]
    assert mon_f01 == [(1, "DSL"), (2, "DS")]
    assert client.get("/api/timetable", headers=H("F01")).status_code == 422
    assert client.get("/api/timetable?section=CSE-B", headers=H("F01")).json()[0]["section"] == "CSE-B"


def test_faculty_timetable(client):
    slots = client.get("/api/timetable/faculty/F08", headers=H("S001")).json()
    assert slots and all(s["faculty_id"] == "F08" for s in slots)
    assert client.get("/api/timetable/faculty/F99", headers=H("S001")).status_code == 404


def test_rooms(client):
    rooms = client.get("/api/rooms?day=MON&period=1", headers=H("S001")).json()
    by_id = {r["id"]: r for r in rooms}
    assert by_id["LAB1"]["free"] is False      # CSE-A DSL is in LAB1 MON P1
    assert by_id["R104"]["free"] is True       # spare room never used
    assert client.get("/api/rooms?day=SUN&period=1", headers=H("S001")).status_code == 422


def test_today_and_attendance(client):
    t = client.get("/api/today", headers=H("S001")).json()
    assert t["day"] == "MON" and all(s["section"] == "CSE-A" for s in t["slots"]) and t["nudges"] == []
    att = {a["subject_code"]: a["percent"] for a in client.get("/api/attendance", headers=H("S001")).json()}
    assert att["DS"] == 71


def test_events_clashes(client):
    ev = client.get("/api/events", headers=H("S001")).json()
    assert len(ev) == 3 and all(isinstance(e["clashes_with"], list) for e in ev)
    assert client.get("/api/events", headers=H("H01")).json()[0]["clashes_with"] == []


def test_openapi_model_names(client):
    names = set(client.get("/openapi.json").json()["components"]["schemas"])
    assert {"Slot", "Decision", "Nudge", "Event", "User", "LoginRequest", "Stats"} <= names
