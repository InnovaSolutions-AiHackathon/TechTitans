from fastapi.testclient import TestClient

import backend.main as main


def test_signup_allows_login_and_blocks_duplicates():
    client = TestClient(main.app)

    username = "signup_tester"
    password = "pass1234"

    r1 = client.post("/api/signup", json={"username": username, "password": password})
    assert r1.status_code == 200
    token_1 = r1.json().get("token")
    assert isinstance(token_1, str) and token_1

    r2 = client.post("/api/login", json={"username": username, "password": password})
    assert r2.status_code == 200
    token_2 = r2.json().get("token")
    assert isinstance(token_2, str) and token_2

    r3 = client.post("/api/signup", json={"username": username, "password": password})
    assert r3.status_code == 409


def test_signup_validation():
    client = TestClient(main.app)

    r = client.post("/api/signup", json={"username": "ab", "password": "1234"})
    assert r.status_code == 400

    r2 = client.post("/api/signup", json={"username": "validuser", "password": "123"})
    assert r2.status_code == 400

