# SafeExam — Product A (Exam Platform)

FastAPI + PostgreSQL backend, React + Vite frontend. Backend modules A-01..A-24 and frontend modules F-01..F-08 are implemented.

## Run locally (Windows PowerShell)

```powershell
# 1) Database + backend
docker compose up --build            # db :5432, backend :8000

# 2) Frontend
cd frontend
copy .env.example .env
npm install
npm run dev                          # http://localhost:5173
```

Backend without Docker:
```powershell
cd backend
python -m venv .venv ; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env               # JWT_SECRET min 32 chars
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

## Tests
```powershell
cd backend ; pytest                  # needs TEST_DATABASE_URL (PostgreSQL), see .env.example
cd frontend ; npm test               # Vitest + React Testing Library
```
Last verified: backend 158 passed, frontend 46 passed, `vite build` OK.

## Roles
`POST /auth/register` always creates a STUDENT. Instructor / Reviewer / Admin accounts are created by an admin via `POST /users` (bootstrap the first admin directly in the DB or with a one-off script).

## Frontend notes
- Access token lives in memory only; refresh token in `sessionStorage` (documented risk; move to an HttpOnly cookie later).
- All HTTP goes through `src/api/*`; pages never call `fetch` directly.
- `features/attempt/MonitoringSlot.jsx` is a placeholder; Product B (B-17) replaces it with the real monitoring provider.

## Known limitations
- This platform does **not** stop cheating 100%. It reduces common digital cheating opportunities, records suspicious behaviour, and gives evidence for human review.
- Browser events are signals, not proof. A network disconnect is not cheating.
- Nothing can stop a photo of the screen taken with a second phone — question design (variants, unique parameters, a large pool) matters too.
- The risk score is not a final verdict; manual review and appeal are mandatory.

## Impact metrics (measure before claiming)
`answer_save_failure_rate`, `submission_failure_rate`, `duplicate_submission_rate` (target 0), `event_upload_success_rate`, average investigation time per flagged attempt, `false_positive_review_rate`. Targets (not achieved claims): answer loss < 0.1%, event upload success > 99%, auto-submit duplicates 0.

## Launch checklist
HTTPS · secrets in env · DB backups · CORS restricted · rate limiting · JWT expiry · Argon2 · admin MFA (future) · no passwords/answers in logs · privacy notice · load test.

Audit repair scope, reproducible checks and remaining limitations: [AUDIT_FIXES.md](AUDIT_FIXES.md).
