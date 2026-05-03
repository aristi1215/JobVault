# Email ingestion pipeline

## Sources

1. OAuth poller (`gmail` / `outlook`) with allowlist filter before persistence.
2. Forwarding alias (`inbox+token@inbox.<domain>`) via SES inbound.

## Flow

1. Source adapter receives message headers + body.
2. Allowlist decision:
   - Not allowlisted -> `discarded_not_allowlisted`.
   - Allowlisted -> continue.
3. Message is enqueued to `ParseQueue`.
4. Parser execution:
   - Deterministic templates (Greenhouse, Lever, Workday, Ashby, SmartRecruiters, LinkedIn, Indeed).
   - LLM fallback for unrecognized formats via `OPENAI_API_KEY` or equivalent provider adapter.
   - Credential-free deterministic stub remains available for local tests and development.
5. Decision:
   - `parsed` if confidence >= 0.85.
   - `needs_confirmation` if confidence between 0.50 and 0.84.
   - `discarded_low_confidence` if confidence < 0.50.
6. Parsed messages automatically upsert an `Application`, attach the recruiter email, persist a related `StoredEmail`, and add timeline events.
7. Confirmation queue in UI lets candidate accept/reject ambiguous mappings.

## Browser extension flow

1. Extension sends `title`, `company`, `description`, `sourceUrl`, and `capturedAt` to `POST /extension/captures`.
2. API merges the capture into an existing application with the same company/role or creates a new `extension` channel application.
3. If user CV text is later supplied to `POST /match-score`, the job description is compared to the CV and saved on the application.

## Derived intelligence

- `GET /applications/:appId/timeline` returns automatically generated events.
- `GET /emails?appId=<id>` returns emails associated with a job.
- `GET /insights` computes response, interview, rejection, and ghosting rates from stored applications and events.

## Failure handling

- SQS DLQ after five failed receives.
- Parser alarm threshold:
  - Any 15-minute window where `failed/total > 3%`.
- Manual replay command should consume DLQ messages after parser hotfix.
