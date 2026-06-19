"""Aislamiento multi-empresa: cada rol solo ve lo que le corresponde."""

from __future__ import annotations

from app.models.expert_assignment import ExpertCompanyAssignment
from tests.conftest import TenantFixture, auth_header


class TestUsersScope:
    def test_admin_a_lists_only_company_a_users_and_assigned_expert(
        self, client, tenants: TenantFixture
    ):
        r = client.get("/users", headers=auth_header(tenants.admin_a))
        assert r.status_code == 200
        emails = {u["email"] for u in r.json()}
        assert "inspector-a@test.co" in emails
        assert "admin-a@test.co" in emails
        assert "expert-a@test.co" in emails
        assert "inspector-b@test.co" not in emails
        assert "admin-b@test.co" not in emails
        assert "expert-x@test.co" not in emails

    def test_admin_a_cannot_patch_user_from_company_b(
        self, client, tenants: TenantFixture
    ):
        r = client.patch(
            f"/users/{tenants.inspector_b.id}",
            headers=auth_header(tenants.admin_a),
            json={"name": "Hackeado"},
        )
        assert r.status_code == 403

    def test_admin_a_cannot_patch_unassigned_expert(
        self, client, tenants: TenantFixture
    ):
        r = client.patch(
            f"/users/{tenants.expert_unassigned.id}",
            headers=auth_header(tenants.admin_a),
            json={"name": "No debe"},
        )
        assert r.status_code == 403

    def test_super_admin_lists_all_users(self, client, tenants: TenantFixture):
        r = client.get("/users", headers=auth_header(tenants.super_admin))
        assert r.status_code == 200
        assert len(r.json()) >= 7


class TestSitesScope:
    def test_inspector_a_sites_only_company_a(self, client, tenants: TenantFixture):
        r = client.get("/sites/mine", headers=auth_header(tenants.inspector_a))
        assert r.status_code == 200
        ids = {s["id"] for s in r.json()}
        assert tenants.site_a.id in ids
        assert tenants.site_b.id not in ids

    def test_expert_a_sites_only_assigned_companies(self, client, tenants: TenantFixture):
        r = client.get("/sites/mine", headers=auth_header(tenants.expert_a))
        assert r.status_code == 200
        ids = {s["id"] for s in r.json()}
        assert tenants.site_a.id in ids
        assert tenants.site_b.id not in ids

    def test_expert_cannot_create_site(self, client, tenants: TenantFixture):
        r = client.post(
            "/sites",
            headers=auth_header(tenants.expert_a),
            json={"company_id": tenants.company_a.id, "name": "Nueva", "address": None},
        )
        assert r.status_code == 403

    def test_admin_a_cannot_see_company_b_sites_via_filter(self, client, tenants: TenantFixture):
        r = client.get(
            f"/sites?company_id={tenants.company_b.id}",
            headers=auth_header(tenants.admin_a),
        )
        assert r.status_code == 403


class TestSessionsScope:
    def test_inspector_cannot_start_session_on_other_company_site(
        self, client, tenants: TenantFixture
    ):
        r = client.post(
            "/sessions",
            headers=auth_header(tenants.inspector_a),
            json={"site_id": tenants.site_b.id},
        )
        assert r.status_code == 403

    def test_admin_b_sessions_exclude_company_a(self, client, tenants: TenantFixture):
        r = client.get("/sessions/company", headers=auth_header(tenants.admin_b))
        assert r.status_code == 200
        site_ids = {row["site_id"] for row in r.json()}
        assert tenants.site_b.id in site_ids or not site_ids
        assert tenants.site_a.id not in site_ids


class TestAssessmentsScope:
    def test_inspector_a_cannot_read_assessment_b(
        self, client, tenants: TenantFixture
    ):
        r = client.get(
            f"/assessments/{tenants.assessment_b.id}",
            headers=auth_header(tenants.inspector_a),
        )
        assert r.status_code == 403

    def test_inspector_b_cannot_read_assessment_a(
        self, client, tenants: TenantFixture
    ):
        r = client.get(
            f"/assessments/{tenants.assessment_a.id}",
            headers=auth_header(tenants.inspector_b),
        )
        assert r.status_code == 403

    def test_admin_a_company_assessments_only_company_a(
        self, client, tenants: TenantFixture
    ):
        r = client.get("/assessments/company", headers=auth_header(tenants.admin_a))
        assert r.status_code == 200
        ids = {row["id"] for row in r.json()}
        assert tenants.assessment_a.id in ids
        assert tenants.assessment_b.id not in ids

    def test_expert_unassigned_review_queue_empty(
        self, client, tenants: TenantFixture
    ):
        r = client.get(
            "/assessments/review-queue?status=pending",
            headers=auth_header(tenants.expert_unassigned),
        )
        assert r.status_code == 200
        assert r.json() == []

    def test_expert_a_sees_pending_from_company_a_only(
        self, client, tenants: TenantFixture
    ):
        r = client.get(
            "/assessments/review-queue?status=pending",
            headers=auth_header(tenants.expert_a),
        )
        assert r.status_code == 200
        ids = {row["id"] for row in r.json()}
        assert tenants.assessment_a.id in ids
        assert tenants.assessment_b.id not in ids

    def test_expert_unassigned_cannot_submit_review(
        self, client, tenants: TenantFixture
    ):
        r = client.patch(
            f"/assessments/{tenants.assessment_a.id}/expert-review",
            headers=auth_header(tenants.expert_unassigned),
            json={"action": "approve"},
        )
        assert r.status_code == 403

    def test_inspector_cannot_list_company_assessments(
        self, client, tenants: TenantFixture
    ):
        r = client.get("/assessments/company", headers=auth_header(tenants.inspector_a))
        assert r.status_code == 403


class TestReportsScope:
    def test_admin_a_can_report_own_site(self, client, tenants: TenantFixture):
        r = client.get(
            f"/reports/sites/{tenants.site_a.id}",
            headers=auth_header(tenants.admin_a),
        )
        assert r.status_code == 200

    def test_admin_a_cannot_report_other_company_site(
        self, client, tenants: TenantFixture
    ):
        r = client.get(
            f"/reports/sites/{tenants.site_b.id}",
            headers=auth_header(tenants.admin_a),
        )
        assert r.status_code == 403

    def test_expert_a_can_report_assigned_site(self, client, tenants: TenantFixture):
        r = client.get(
            f"/reports/sites/{tenants.site_a.id}",
            headers=auth_header(tenants.expert_a),
        )
        assert r.status_code == 200

    def test_expert_a_cannot_report_unassigned_site(
        self, client, tenants: TenantFixture
    ):
        r = client.get(
            f"/reports/sites/{tenants.site_b.id}",
            headers=auth_header(tenants.expert_a),
        )
        assert r.status_code == 403


class TestExpertAssignments:
    def test_company_admin_put_preserves_other_company_assignments(
        self, client, db, tenants: TenantFixture
    ):
        db.add(
            ExpertCompanyAssignment(
                user_id=tenants.expert_a.id,
                company_id=tenants.company_b.id,
            )
        )
        db.commit()

        r = client.put(
            f"/users/{tenants.expert_a.id}/expert-companies",
            headers=auth_header(tenants.admin_a),
            json={"company_ids": [tenants.company_a.id]},
        )
        assert r.status_code == 200
        assert tenants.company_a.id in r.json()

        rows = db.scalars(
            __import__("sqlalchemy").select(ExpertCompanyAssignment.company_id).where(
                ExpertCompanyAssignment.user_id == tenants.expert_a.id
            )
        ).all()
        assert tenants.company_a.id in rows
        assert tenants.company_b.id in rows

    def test_company_admin_cannot_assign_other_company_to_expert(
        self, client, tenants: TenantFixture
    ):
        r = client.put(
            f"/users/{tenants.expert_a.id}/expert-companies",
            headers=auth_header(tenants.admin_a),
            json={"company_ids": [tenants.company_b.id]},
        )
        assert r.status_code == 403


class TestCompaniesScope:
    def test_company_admin_cannot_list_all_companies(
        self, client, tenants: TenantFixture
    ):
        r = client.get("/companies", headers=auth_header(tenants.admin_a))
        assert r.status_code == 403

    def test_company_admin_get_mine_only(self, client, tenants: TenantFixture):
        r = client.get("/companies/mine", headers=auth_header(tenants.admin_a))
        assert r.status_code == 200
        assert r.json()["id"] == tenants.company_a.id

    def test_expert_assigned_companies(self, client, tenants: TenantFixture):
        r = client.get("/companies/assigned", headers=auth_header(tenants.expert_a))
        assert r.status_code == 200
        ids = {c["id"] for c in r.json()}
        assert tenants.company_a.id in ids
        assert tenants.company_b.id not in ids
