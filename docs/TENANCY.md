# Aislamiento por empresa (multi-tenant)

Cada **administrador de empresa** e **inspector** solo accede a datos de su `company_id`. Los **expertos** acceden solo a empresas listadas en `expert_company_assignments`. El **super admin** ve todo.

## Matriz de acceso (resumen)

| Recurso | Super admin | Admin empresa | Inspector | Experto |
|---------|-------------|---------------|-----------|---------|
| Empresas (CRUD) | Sí | Solo la suya (`/companies/mine`) | No | Asignadas (`/companies/assigned`) |
| Sedes | Todas | Su empresa | Su empresa | Sedes de empresas asignadas |
| Usuarios | Todos | Miembros de su empresa + expertos **asignados** a su empresa | No | No |
| Sesiones | Todas | Su empresa | Solo las propias | No (API sesiones) |
| Informes / fotos | Todos | Su empresa | Solo los propios | Empresas asignadas |
| Informe sede PDF | Sí | Su empresa | No | Si asignado |
| Cola revisión experta | Sí | Su empresa | No | Empresas asignadas |

## Reglas implementadas

- [`app/core/tenancy.py`](../app/core/tenancy.py): `assert_site_visible`, alcance de usuarios para admin empresa.
- [`app/core/permissions.py`](../app/core/permissions.py): gestión de expertos solo si están asignados a la empresa del admin.
- `PUT /users/{id}/expert-companies`: el **super admin** reemplaza todas las asignaciones; el **admin empresa** solo añade o quita **su** empresa (no borra otras asignaciones del experto).

## Comprobaciones al cambiar código

1. Todo listado con `join(Site)` o filtro `company_id` para roles no super-admin.
2. Todo `GET /{id}` debe validar pertenencia antes de devolver el recurso.
3. Expertos nunca deben usar `require_company_id` (no tienen `company_id` en `users`).

## Tests automáticos

```powershell
pip install -r requirements-dev.txt
pytest
```

Cobertura principal en `tests/test_tenancy_permissions.py` (usuarios, sedes, sesiones, informes, informes por sede, cola experto, asignaciones multi-empresa).
