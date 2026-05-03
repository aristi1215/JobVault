# Automated intelligence backend

This iteration keeps JobVault privacy-first while making the backend automation-first. Email ingestion, browser-extension captures, timeline generation, match scoring, and insights all converge on `Application` records so users do not need to manually maintain status.

## Backend services used

- Gmail API: OAuth 2.0 authorization, historical import, and future watch notifications.
- Microsoft Graph Mail API: OAuth 2.0 authorization, historical import, and delta polling.
- AI provider: OpenAI-compatible LLM for email classification and job/CV match analysis.
- Token vault: AWS Secrets Manager in production for refresh/access token storage.
- Database: existing production plan uses DynamoDB single-table storage; PostgreSQL can be introduced behind the store interface if relational querying becomes the priority.
- Queue: existing production plan uses SQS `ParseQueue` and DLQ for asynchronous parsing.
- Raw email storage: S3 with 30-day lifecycle expiration.
- Browser extension API: `/extension/captures` accepts LinkedIn/Indeed-style job captures.

## Required API keys and credentials

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`, for example `https://api.<domain>/oauth/google/callback`
- Gmail OAuth scope: `https://www.googleapis.com/auth/gmail.readonly`
- Optional Gmail send scope for user-approved follow-ups: `https://www.googleapis.com/auth/gmail.send`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_REDIRECT_URI`, for example `https://api.<domain>/oauth/microsoft/callback`
- Microsoft delegated scopes: `offline_access Mail.Read`
- Optional Microsoft send scope for user-approved follow-ups: `Mail.Send`
- `OPENAI_API_KEY` for LLM classification and match scoring
- AWS credentials for deployment with access to DynamoDB, S3, SQS, Lambda, and Secrets Manager

## Production setup

1. In Google Cloud, configure an OAuth consent screen, enable Gmail API, create a web OAuth client, and add the production redirect URI.
2. In Azure App registrations, create an application, add the production redirect URI, and grant delegated `Mail.Read` plus `offline_access`.
3. Set all OAuth and AI environment variables in the API runtime.
4. Provision the existing CDK stacks for auth, core data, raw ingestion storage, queues, and inbound mail.
5. Route `/oauth/connect` through the frontend to get provider authorization codes and save token secret references.
6. Run scheduled OAuth sync workers every 10 minutes with jitter; enable Gmail watch renewal when Google verification is complete.
7. Send fetched messages to the parser queue with idempotency key `provider + messageId`.
8. Run parser workers against the queue and monitor parse failure rate, queue depth, and DLQ alarms.
9. Point the browser extension at `/extension/captures` with authenticated requests.

## Fully implemented locally

- OAuth connection records for Gmail and Outlook with generated authorization URLs when credentials are missing.
- Secure-token storage boundary via `tokenSecretRef` references, ready to back with Secrets Manager.
- Email ingestion idempotency using provider message IDs.
- Job-related email classification into applied, interview, rejected, follow-up, or other.
- Structured extraction for company, role, recruiter email, and timestamp-ready ingestion records.
- Automatic application create/update from parsed emails.
- Recruiter email association on applications.
- Timeline generation from email and extension events.
- Browser-extension capture endpoint and merge-by-company-role behavior.
- Job/CV match scoring with score, missing skills, and strengths.
- Insight reporting for response, interview, rejection, and ghosting rates.

## Stubbed until credentials are supplied

- Gmail and Outlook token exchange and live message fetch are adapter stubs.
- Gmail watch notifications and Microsoft delta links are documented but not live locally.
- LLM email classification and match scoring return validated heuristic outputs when `OPENAI_API_KEY` is absent.
- Secrets Manager writes are represented by deterministic secret references in local memory.
- Persistent database and queue execution use the existing in-memory local store instead of DynamoDB/SQS.
