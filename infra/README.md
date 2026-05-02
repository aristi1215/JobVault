# Infrastructure baseline

This directory contains the three foundational stacks from the plan:

- `AuthStack`: Cognito user pool and app client.
- `CoreStack`: DynamoDB single-table + GSIs, S3 raw ingestion store with 30-day TTL, SQS parse queue and DLQ.
- `MailStack`: SES/Lambda principals for inbound alias ingestion path.

## Manual week-1 checks

1. Verify `mail.<domain>` in SES for transactional candidate digests.
2. Configure SES receiving for `inbox.<domain>` and route to ingestion bucket.
3. Submit Google OAuth verification for `gmail.readonly` and optional `gmail.send`.
4. Create Microsoft Graph app permissions (`Mail.Read`, optional `Mail.Send`).

## Useful commands

```bash
npm install
npm run synth -w infra
```
