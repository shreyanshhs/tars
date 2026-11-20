import pytest
from fastapi.testclient import TestClient

from app import seed


@pytest.fixture(scope="session")
def client(tmp_path_factory, monkeypatch_session):
    tmp = tmp_path_factory.mktemp("tars")
    monkeypatch_session.setattr(seed, "DB", tmp / "tars.db")
    monkeypatch_session.setattr(seed, "MOCK", tmp / "mock")  # don't overwrite frontend/mock
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


def H(user_id):
    return {"X-User-Id": user_id}
