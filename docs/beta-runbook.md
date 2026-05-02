# Closed beta runbook

## Target cohort

- 10 skilled immigrants.
- 10 students/new grads.
- 10 career changers.

## Pre-flight checks

- [ ] Ingestion parser pass rate >= 70% deterministic.
- [ ] Confirmation queue average under 5 pending items per user.
- [ ] Weekly digest sends successfully for test cohort.
- [ ] Export/delete/revoke actions validated end-to-end.

## Beta metrics to watch

- Median applications tracked per user/week.
- Percentage of users who configure allowlist within first session.
- Follow-up draft generation rate.
- Perceived control score (1-5 survey).
- Anxiety trend self-report (before vs week 2).

## Incident response

- Pager trigger: parser failures > 3% over 15 minutes.
- Pager trigger: API p95 > 900ms for 10 minutes.
- Data incident protocol:
  1. Freeze ingestion.
  2. Preserve audit logs.
  3. Notify affected users within 24h.

## Week 8 demo checklist

- Show manual capture from template in < 30 seconds.
- Show allowlist rule and blocked email example.
- Show ambiguous email moving into confirmation queue.
- Show bounded follow-up draft and legal guardrails.
- Show candidate-only notification digest preview.
