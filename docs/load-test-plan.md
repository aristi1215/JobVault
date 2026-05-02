# Load test plan

## Goals

- Validate that MVP architecture handles peak ingestion and dashboard traffic for closed beta.

## Scenarios

1. **Dashboard reads**: 50 concurrent users polling list/kanban every 10 seconds.
2. **Ingestion burst**: 1,000 emails queued in 5 minutes.
3. **Follow-up draft burst**: 100 draft generations in 2 minutes.

## Success criteria

- API p95 < 900ms.
- Parse queue drains to baseline in < 10 minutes after burst.
- No data loss between ingestion and event creation.
- Confirmation queue remains available under load.

## Tooling

- k6 for HTTP API load.
- Synthetic SES/SQS event replay for parser throughput.
- CloudWatch dashboard and alarm validation during run.

## Reporting template

- Date/time window.
- Commit hash and stack version.
- Scenario results.
- Bottlenecks and mitigation actions.
