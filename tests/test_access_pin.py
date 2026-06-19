"""Login por clave de ingreso (PIN) y gestión del PIN."""

from tests.conftest import TenantFixture, auth_header


def _create_user(client, tenants: TenantFixture, email: str = "nuevo@test.co"):
    return client.post(
        "/users",
        headers=auth_header(tenants.super_admin),
        json={
            "name": "Nuevo Inspector",
            "email": email,
            "password": "password123",
            "role": "user",
            "company_id": tenants.company_a.id,
        },
    )


def test_create_user_assigns_pin(client, tenants: TenantFixture):
    r = _create_user(client, tenants)
    assert r.status_code == 201
    pin = r.json()["access_pin"]
    assert pin and pin.isdigit() and len(pin) == 6


def test_login_with_code(client, tenants: TenantFixture):
    pin = _create_user(client, tenants).json()["access_pin"]
    r = client.post("/auth/login-code", json={"code": pin})
    assert r.status_code == 200
    token = r.json()["access_token"]
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "nuevo@test.co"


def test_login_with_wrong_code(client, tenants: TenantFixture):
    r = client.post("/auth/login-code", json={"code": "000000"})
    assert r.status_code == 401


def test_regenerate_pin_changes_code(client, tenants: TenantFixture):
    created = _create_user(client, tenants).json()
    old_pin = created["access_pin"]
    r = client.post(f"/users/{created['id']}/pin", headers=auth_header(tenants.super_admin))
    assert r.status_code == 200
    new_pin = r.json()["access_pin"]
    assert new_pin != old_pin
    # La clave antigua deja de funcionar; la nueva entra.
    assert client.post("/auth/login-code", json={"code": old_pin}).status_code == 401
    assert client.post("/auth/login-code", json={"code": new_pin}).status_code == 200
