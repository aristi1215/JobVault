# OAuth onboarding checklist

## Google (Gmail)

1. Create OAuth consent screen.
2. Request `gmail.readonly` as baseline and `gmail.send` as optional.
3. Add production redirect URIs:
   - `https://app.<domain>/api/oauth/google/callback`
4. Submit verification in week 1.
5. Document privacy language:
   - "Only messages from your allowlist are processed."

## Microsoft Graph (Outlook)

1. Register app in Azure App registrations.
2. Configure delegated permissions:
   - `Mail.Read` (required)
   - `Mail.Send` (optional)
3. Add redirect URI:
   - `https://app.<domain>/api/oauth/microsoft/callback`
4. Admin consent only when required by tenant policy.

## Token handling

- Store refresh tokens in AWS Secrets Manager with one secret per user/provider pair.
- Track `lastSyncAt`, `watchExpiry`, and scope set in `OAuthConnection` entity.

## Backend environment variables

### Gmail

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `GOOGLE_PUBSUB_TOPIC` (for Gmail watch notifications in production)

### Microsoft Graph

- `MICROSOFT_GRAPH_CLIENT_ID`
- `MICROSOFT_GRAPH_CLIENT_SECRET`
- `MICROSOFT_TENANT_ID` (`common` is acceptable for multi-tenant delegated auth)
- `MICROSOFT_OAUTH_REDIRECT_URI`

### AI classification and scoring

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional, defaults to a small structured-output-capable model)

The local backend exposes credential-ready integration records even when these values are absent. Missing credentials switch provider sync and AI work to deterministic stubs so local testing can still exercise the full ingestion, timeline, match score, and insight flow.

## Production sync workers

1. Run the API handlers behind API Gateway or an equivalent HTTP layer.
2. Schedule `/oauth/sync` every 10 minutes per connected provider, or wire Gmail Pub/Sub watch notifications to enqueue provider sync jobs.
3. On first connection, call `/oauth/sync` with `historicalImportMonths` between 3 and 6 to reconstruct recent history.
4. Persist OAuth refresh tokens in Secrets Manager, referenced by `OAuthConnection.secureTokenRef`.
5. Enqueue fetched messages to the parser queue with idempotency key `provider + messageId`.
