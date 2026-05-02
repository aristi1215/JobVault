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
   - Bedrock fallback for unrecognized formats.
5. Decision:
   - `parsed` if confidence >= 0.85.
   - `needs_confirmation` if confidence between 0.50 and 0.84.
   - `discarded_low_confidence` if confidence < 0.50.
6. Confirmation queue in UI lets candidate accept/reject ambiguous mappings.

## Failure handling

- SQS DLQ after five failed receives.
- Parser alarm threshold:
  - Any 15-minute window where `failed/total > 3%`.
- Manual replay command should consume DLQ messages after parser hotfix.
