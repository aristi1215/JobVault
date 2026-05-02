# Observability and alarms

## Core metrics

- `ApiLatencyP95` (target < 500ms for read endpoints).
- `ApiErrorRate` (target < 1%).
- `ParseQueueDepth`.
- `ParserFailureRate`.
- `IngestionDiscardedNotAllowlistedCount`.
- `FollowupDraftGeneratedCount`.

## Alarms

- API p95 > 900ms for 10 minutes.
- API 5xx > 2% for 5 minutes.
- Parser failure > 3% over 15 minutes.
- SQS DLQ messages > 0 for 10 minutes.

## Tracing and logs

- Use structured logs with userId hash, ingestionId, appId.
- Keep PII out of logs (no raw email body).
- Enable X-Ray tracing for API and parser lambdas.

## Dashboards

- Product dashboard: applications tracked, silent count distribution, follow-up usage.
- Platform dashboard: queue depth, parse success confidence bands, OAuth sync freshness.
