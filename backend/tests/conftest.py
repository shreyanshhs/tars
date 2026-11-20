import os

import pytest
from fastapi.testclient import TestClient

import app.main  # noqa: F401  (loads .env first)
from app import seed

# Tests must never poll or message the real Telegram bot: blank the token that .env just loaded.
os.environ["TELEGRAM_BOT_TOKEN"] = ""


@pytest.fixture(scope="session")
def client(tmp_path_factory, monkeypatch_session):
    tmp = tmp_path_factory.mktemp("tars")
    monkeypatch_session.setattr(seed, "DB", tmp / "tars.db")
    monkeypatch_session.setattr(seed, "MOCK", tmp / "mock")  # don't overwrite docs/mock
    seed.main()
    monkeypatch_session.setenv("TARS_DB", str(tmp / "tars.db"))
    monkeypatch_session.setenv("DEMO_DAY", "MON")
    from app.main import app
    return TestClient(app)


@pytest.fixture(scope="session")
def monkeypatch_session():
    mp = pytest.MonkeyPatch()
    yield mp
    mp.undo()


@pytest.fixture
def db(tmp_path, monkeypatch):
    """Fresh seeded DB per test (tools mutate it); yields an open connection."""
    monkeypatch.setattr(seed, "DB", tmp_path / "tars.db")
    monkeypatch.setattr(seed, "MOCK", tmp_path / "mock")
    seed.main()
    monkeypatch.setenv("TARS_DB", str(tmp_path / "tars.db"))
    from app.db import connect
    con = connect()
    yield con
    con.close()


def slot_id(con, section, day, period):
    return con.execute("SELECT id FROM slots WHERE section=? AND day=? AND period=?",
                       (section, day, period)).fetchone()[0]


def seed_name(user_id):
    """Name for an id as configured in seed_data.json (tests never hardcode names)."""
    data = seed.load_data()
    return {u["id"]: u["name"] for u in data["faculty"] + data["students"] + data["hods"]}[user_id]


def H(user_id):
    return {"X-User-Id": user_id}
