# Revisión experta de informes IA

## Roles

| Rol | Valor API | Uso |
|-----|-----------|-----|
| Experto ergonómico | `expert` | Valida o corrige score y hallazgos tras la IA |
| Inspector | `user` | Captura fotos; ve score provisional hasta validación |
| Admin empresa | `company_admin` | Gestiona equipo; puede ver cola de revisión |
| Super admin | `super_admin` | Asigna expertos a empresas |

## Flujo

1. Inspector sube foto → IA genera `raw_ai_json`, `calculated_score`, `primary_issue` (inmutables).
2. Informe queda en `review_status = pending`.
3. Experto con asignación a la empresa revisa en `/experto`.
4. `PATCH /assessments/{id}/expert-review` con `approve` o `correct`.
5. Inspector y reportes usan **valores efectivos** (`expert_*` si revisado).

## Asignación multi-empresa

- Tabla `expert_company_assignments`.
- `PUT /users/{id}/expert-companies` con `{ "company_ids": [1, 2] }`.
- Admin empresa: solo puede asignar su propia empresa al crear/gestionar expertos.

## Cuenta demo

Tras `scripts/seed_demo.py`:

- **experto@demo.co** / **experto123** (asignado a Demo HSEQ)

## Migración

```powershell
alembic upgrade head
```

Informes históricos completados se marcan `approved` automáticamente en la migración.
