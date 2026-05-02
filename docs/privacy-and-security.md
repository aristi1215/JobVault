# Privacy and security implementation

## Consent model

- Allowlist-first: ingestion only processes messages from approved sender addresses or domains.
- Two explicit permissions:
  - Inbox read (`gmail.readonly`, `Mail.Read`).
  - Optional send (`gmail.send`, `Mail.Send`) for user-approved follow-ups.
- Forwarding alias path exists for users who do not grant OAuth.

## Data minimization

- Structured records are stored in DynamoDB.
- Raw emails are written to S3 with 30-day lifecycle deletion.
- Ingestion log records whether an email was parsed, discarded, or needs confirmation.

## Stored entities

- `Application`, `Event`, `AllowlistRule`, `EmailIngestion`, `OAuthConnection`, `FollowupDraft`.

## Derived / ephemeral

- Silence-day counters are derived at read time or denormalized in app projections.
- LLM parse intermediate prompts and confidence reasoning are not permanently retained.

## Abuse prevention

- Follow-up helper enforces:
  - Maximum 1 follow-up every 7 days per application.
  - Maximum 5 follow-ups per application.
  - No bulk send from platform domain.
- Outbound recruiter communication is only user-initiated from their mailbox.

## Candidate rights endpoints (to wire)

- `GET /v1/privacy/export`: returns JSON + CSV bundle.
- `POST /v1/privacy/delete`: async account deletion cascade.
- `POST /v1/oauth/revoke`: disconnect inbox provider.
