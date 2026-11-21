"""Tests for POST /api/admin/import-timetable and GET /api/admin/timetable-template."""
import pytest
from tests.conftest import H

IMPORT_URL = "/api/admin/import-timetable"
TEMPLATE_URL = "/api/admin/timetable-template"


def _row(section="CSE-A", day="MON", period=1, subject="DS", faculty="F01", room="R101", **kwargs):
    d = {"section": section, "day": day, "period": period, "subject": subject, "faculty": faculty, "room": room}
    d.update(kwargs)
    return d


class TestImportAuth:
    def test_requires_auth(self, client):
        r = client.post(IMPORT_URL, json={"rows": [_row()]})
        assert r.status_code == 401

    def test_student_forbidden(self, client):
        r = client.post(IMPORT_URL, json={"rows": [_row()]}, headers=H("S001"))
        assert r.status_code == 403

    def test_faculty_forbidden(self, client):
        r = client.post(IMPORT_URL, json={"rows": [_row()]}, headers=H("F01"))
        assert r.status_code == 403

    def test_hod_allowed(self, client):
        r = client.post(IMPORT_URL, json={"rows": [_row()]}, headers=H("H01"))
        assert r.status_code == 200

    def test_template_auth(self, client):
        assert client.get(TEMPLATE_URL).status_code == 401
        assert client.get(TEMPLATE_URL, headers=H("S001")).status_code == 403
        assert client.get(TEMPLATE_URL, headers=H("F01")).status_code == 403
        r = client.get(TEMPLATE_URL, headers=H("H01"))
        assert r.status_code == 200
        assert "section,day,period,subject,faculty,room" in r.text


class TestImportDryRunValidation:
    def test_valid_dry_run_preserves_database(self, client):
        before = client.get("/api/timetable?section=CSE-A", headers=H("H01")).json()
        r = client.post(IMPORT_URL, json={"rows": [_row()]}, headers=H("H01"))
        assert r.status_code == 200
        data = r.json()
        assert data["valid"] is True
        assert data["errors"] == []
        assert data["summary"]["total_rows"] == 1
        assert data["summary"]["errors"] == 0
        assert data["preview"] is not None
        assert len(data["preview"]) == 1
        assert data["preview"][0]["subject_code"] == "DS"
        assert data["preview"][0]["faculty_id"] == "F01"
        assert data["preview"][0]["room_id"] == "R101"

        # Verify DB untouched
        after = client.get("/api/timetable?section=CSE-A", headers=H("H01")).json()
        assert len(before) == len(after)

    def test_name_matching_resolution(self, client):
        """Names like 'Data Structures', 'Dr. Ananya Rao', 'Room 101' should resolve to IDs."""
        rows = [
            _row(section="cse-a", day="Monday", period=1,
                 subject="Data Structures", faculty="Dr. Ananya Rao", room="Room 101")
        ]
        r = client.post(IMPORT_URL, json={"rows": rows}, headers=H("H01"))
        assert r.status_code == 200
        data = r.json()
        assert data["valid"] is True
        assert data["preview"][0]["subject_code"] == "DS"
        assert data["preview"][0]["faculty_id"] == "F01"
        assert data["preview"][0]["room_id"] == "R101"

    def test_missing_field_detection(self, client):
        rows = [{"section": "CSE-A", "day": "MON", "period": 1}]
        r = client.post(IMPORT_URL, json={"rows": rows}, headers=H("H01"))
        assert r.status_code == 200
        data = r.json()
        assert data["valid"] is False
        assert any(e["field"] == "subject" and e["type"] == "missing" for e in data["errors"])
        assert any(e["field"] == "faculty" and e["type"] == "missing" for e in data["errors"])
        assert any(e["field"] == "room" and e["type"] == "missing" for e in data["errors"])

    def test_unknown_records(self, client):
        rows = [
            _row(section="ECE-A"),  # unknown section
            _row(subject="Quantum Computing"),  # unknown subject
            _row(faculty="Dr. Unknown Person"),  # unknown faculty
            _row(room="SkyLab 9000"),  # unknown room
        ]
        r = client.post(IMPORT_URL, json={"rows": rows}, headers=H("H01"))
        assert r.status_code == 200
        data = r.json()
        assert data["valid"] is False
        errors = data["errors"]
        assert any("ECE-A" in e["message"] for e in errors)
        assert any("Quantum Computing" in e["message"] for e in errors)
        assert any("Dr. Unknown Person" in e["message"] for e in errors)
        assert any("SkyLab 9000" in e["message"] for e in errors)

    def test_invalid_day_and_period(self, client):
        rows = [
            _row(day="SATURDAY"),
            _row(period=7),
            _row(period=0),
        ]
        r = client.post(IMPORT_URL, json={"rows": rows}, headers=H("H01"))
        data = r.json()
        assert data["valid"] is False
        assert any("SATURDAY" in e["message"] for e in data["errors"])
        assert any("7" in e["message"] for e in data["errors"])
        assert any("0" in e["message"] for e in data["errors"])

    def test_faculty_unqualified_for_subject(self, client):
        # Dr. Meera Iyer (F03) only teaches MATH, cannot teach DS
        rows = [_row(subject="DS", faculty="F03")]
        r = client.post(IMPORT_URL, json={"rows": rows}, headers=H("H01"))
        data = r.json()
        assert data["valid"] is False
        assert any(e["type"] == "mismatch" and "not qualified" in e["message"] for e in data["errors"])

    def test_duplicate_slot_in_file(self, client):
        rows = [
            _row(section="CSE-A", day="MON", period=1, subject="DS", faculty="F01", room="R101"),
            _row(section="CSE-A", day="MON", period=1, subject="MATH", faculty="F03", room="R101"),
        ]
        r = client.post(IMPORT_URL, json={"rows": rows}, headers=H("H01"))
        data = r.json()
        assert data["valid"] is False
        assert any(e["type"] == "duplicate" for e in data["errors"])

    def test_faculty_clash_within_import(self, client):
        # F01 assigned to CSE-A and CSE-B at the exact same day+period
        rows = [
            _row(section="CSE-A", day="MON", period=1, faculty="F01", room="R101"),
            _row(section="CSE-B", day="MON", period=1, faculty="F01", room="R102"),
        ]
        r = client.post(IMPORT_URL, json={"rows": rows}, headers=H("H01"))
        data = r.json()
        assert data["valid"] is False
        assert any(e["type"] == "clash" and e["field"] == "faculty" for e in data["errors"])

    def test_room_clash_within_import(self, client):
        # R101 used by CSE-A and CSE-B at the exact same day+period
        rows = [
            _row(section="CSE-A", day="MON", period=1, faculty="F01", room="R101"),
            _row(section="CSE-B", day="MON", period=1, faculty="F03", subject="MATH", room="R101"),
        ]
        r = client.post(IMPORT_URL, json={"rows": rows}, headers=H("H01"))
        data = r.json()
        assert data["valid"] is False
        assert any(e["type"] == "clash" and e["field"] == "room" for e in data["errors"])

    def test_section_not_in_replace_sections(self, client):
        rows = [_row(section="CSE-B")]
        r = client.post(IMPORT_URL, json={"rows": rows, "replace_sections": ["CSE-A"]}, headers=H("H01"))
        data = r.json()
        assert data["valid"] is False
        assert any("not included in replace_sections" in e["message"] for e in data["errors"])

    def test_cross_section_clash_with_non_replaced_section(self, client):
        # CSE-B has active slots that are NOT being replaced if we only replace CSE-A.
        # Find a slot in CSE-B:
        b_slots = client.get("/api/timetable?section=CSE-B", headers=H("H01")).json()
        if b_slots:
            target = b_slots[0]
            # Try importing a slot for CSE-A that books the same faculty at that same day+period
            rows = [_row(section="CSE-A", day=target["day"], period=target["period"],
                         faculty=target["faculty_id"], subject=target["subject_code"], room="R104")]
            r = client.post(IMPORT_URL, json={"rows": rows, "replace_sections": ["CSE-A"]}, headers=H("H01"))
            data = r.json()
            assert data["valid"] is False
            assert any(e["type"] == "clash" and "already teaching section CSE-B" in e["message"] for e in data["errors"])


class TestImportApply:
    def test_apply_invalid_returns_422_and_does_not_mutate(self, client):
        before = client.get("/api/timetable?section=CSE-A", headers=H("H01")).json()
        rows = [_row(faculty="F99")]
        r = client.post(f"{IMPORT_URL}?dry_run=false", json={"rows": rows}, headers=H("H01"))
        assert r.status_code == 422
        assert r.json()["error"] == "validation"

        after = client.get("/api/timetable?section=CSE-A", headers=H("H01")).json()
        assert len(before) == len(after)

    def test_apply_valid_replaces_target_section_and_preserves_others(self, client):
        before_b = client.get("/api/timetable?section=CSE-B", headers=H("H01")).json()

        # Build a valid replacement for CSE-A using its designated teachers and rooms
        # On MON P1 and P2, F01 teaches CSE-A
        rows = [
            _row(section="CSE-A", day="MON", period=1, subject="DS", faculty="F01", room="R101"),
            _row(section="CSE-A", day="MON", period=2, subject="DSL", faculty="F01", room="LAB1"),
        ]
        r = client.post(f"{IMPORT_URL}?dry_run=false",
                        json={"rows": rows, "replace_sections": ["CSE-A"]},
                        headers=H("H01"))
        assert r.status_code == 200
        data = r.json()
        assert data["valid"] is True
        assert data["imported"] == 2

        # Verify: CSE-A now has exactly 2 slots
        after_a = client.get("/api/timetable?section=CSE-A", headers=H("H01")).json()
        assert len(after_a) == 2
        assert [s["period"] for s in after_a] == [1, 2]

        # Verify: Today endpoint reflects the new slots
        today_res = client.get("/api/today", headers=H("S001")).json()
        if today_res["day"] == "MON":
            assert len(today_res["slots"]) == 2

        # Verify: CSE-B was preserved
        after_b = client.get("/api/timetable?section=CSE-B", headers=H("H01")).json()
        assert len(before_b) == len(after_b)

    def test_apply_replaces_multiple_sections(self, client):
        rows = [
            _row(section="CSE-A", day="MON", period=1, subject="DS", faculty="F01", room="R101"),
            _row(section="CSE-B", day="MON", period=1, subject="OOP", faculty="F02", room="R102"),
        ]
        r = client.post(f"{IMPORT_URL}?dry_run=false",
                        json={"rows": rows, "replace_sections": ["CSE-A", "CSE-B"]},
                        headers=H("H01"))
        assert r.status_code == 200
        data = r.json()
        assert data["valid"] is True
        assert data["imported"] == 2

    def test_demo_reset_after_import(self, client, monkeypatch):
        """HOD reset-demo restores the full seeded timetable."""
        monkeypatch.setenv("TARS_DEMO_MODE", "1")
        # First import a 1-slot timetable
        rows = [_row(section="CSE-A", day="MON", period=1, subject="DS", faculty="F01", room="R101")]
        client.post(f"{IMPORT_URL}?dry_run=false", json={"rows": rows, "replace_sections": ["CSE-A"]}, headers=H("H01"))
        assert len(client.get("/api/timetable?section=CSE-A", headers=H("H01")).json()) == 1

        # Reset demo
        res = client.post("/api/admin/reset-demo", headers=H("H01"))
        assert res.status_code == 200

        # Now CSE-A should have its full week of slots back
        restored = client.get("/api/timetable?section=CSE-A", headers=H("H01")).json()
        assert len(restored) > 1
