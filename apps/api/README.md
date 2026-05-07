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
- `POST /oauth/sync`
- `POST /extension/captures`
- `GET /applications/:appId/timeline`
- `POST /applications/:appId/match-score`
- `GET /insights`
- `GET /privacy/export`
- `POST /privacy/delete`

See `../../docs/automated-intelligence-backend.md` for the production service map, credentials, and which integrations are currently stubbed.

## Run

```bash
npm run dev -w api
```
