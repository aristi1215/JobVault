# API package

Local Lambda-style API simulation for:

- Application CRUD.
- Allowlist rule management.
- Automated email ingestion classification and application upserts.
- Gmail/Outlook OAuth connection metadata and sync stubs.
- Browser extension capture preparation.
- Timeline, stored email, match scoring, and insight endpoints.
- Follow-up draft generation with bounded limits.
- Candidate privacy actions (export/delete stubs).

## Endpoints

- `GET /health`
- `GET|POST /applications`
- `GET|POST /allowlist`
- `GET|POST /ingestions`
- `GET /emails?appId=<id>`
- `GET /applications/:appId/timeline`
- `GET|POST /extension/captures`
- `POST /match-score`
- `GET /insights`
- `GET|POST /followups`
- `GET /oauth`
- `POST /oauth/connect`
- `POST /oauth/sync`
- `POST /oauth/revoke`
- `GET /privacy/export`
- `POST /privacy/delete`

## Credential-backed integrations

The local API is credential-ready and uses deterministic stubs when secrets are absent.

- Gmail: set `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, and store refresh tokens in Secrets Manager at `jobvault/<userId>/gmail/refresh-token`.
- Outlook: set `MICROSOFT_GRAPH_CLIENT_ID`, `MICROSOFT_GRAPH_CLIENT_SECRET`, `MICROSOFT_GRAPH_REDIRECT_URI`, and store refresh tokens in Secrets Manager at `jobvault/<userId>/outlook/refresh-token`.
- AI classification/scoring: set `OPENAI_API_KEY` to replace deterministic fallback classification and scoring.
- Storage/queues in production: DynamoDB single-table records, S3 raw email retention, SQS parse queue/DLQ, EventBridge scheduled sync, Gmail watch webhook, and Microsoft Graph delta polling.

## Run

```bash
npm run dev -w api
```
