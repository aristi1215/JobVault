# API package

Local Lambda-style API simulation for:

- Application CRUD.
- Allowlist rule management.
- Email ingestion classification.
- Follow-up draft generation with bounded limits.
- Candidate privacy actions (export/delete stubs).

## Endpoints

- `GET /health`
- `GET|POST /applications`
- `GET|POST /allowlist`
- `GET|POST /ingestions`
- `GET|POST /followups`
- `GET /oauth`
- `POST /oauth/connect`
- `POST /oauth/revoke`
- `GET /privacy/export`
- `POST /privacy/delete`

## Run

```bash
npm run dev -w api
```
