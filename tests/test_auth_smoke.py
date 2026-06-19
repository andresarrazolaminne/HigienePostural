"""Humo: login y /auth/me por rol."""

from tests.conftest import TenantFixture, auth_header


def test_login_success(client, tenants: TenantFixture):
    r = client.post(
        "/auth/login",
        data={"username": "inspector-a@test.co", "password": "password123"},
    )
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_login_wrong_password(client, tenants: TenantFixture):
    r = client.post(
        "/auth/login",
        data={"username": "inspector-a@test.co", "password": "wrong"},
    )
    assert r.status_code == 401


def test_me_returns_role(client, tenants: TenantFixture):
    r = client.get("/auth/me", headers=auth_header(tenants.admin_a))
    assert r.status_code == 200
    assert r.json()["role"] == "company_admin"
    assert r.json()["company_id"] == tenants.company_a.id
