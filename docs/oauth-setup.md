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
