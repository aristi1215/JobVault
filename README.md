# JobVault

Privacy-first job application tracker focused on reducing uncertainty after applying.

GitHub: https://github.com/aristi1215/JobVault

## Monorepo layout

- `apps/web`: Next.js product UI.
- `apps/api`: Lambda-oriented API and ingestion handlers.
- `apps/extension`: Browser extension for phase-2 capture.
- `packages/shared`: Shared types and parsing templates.
- `infra`: AWS CDK stacks (auth, core, mail).
- `docs`: Milestone runbooks, risk controls, and launch checklist.

## Local development

```bash
npm install
npm run dev:web
npm run dev:api
```

## Deployments

```bash
npm run cdk:synth
npm run cdk:deploy:dev
```

## Product promises

- Unified observability of applications across channels.
- Honest silence tracking and bounded follow-up support.
- No guarantee of employer response.
- No unsolicited recruiter outreach from our domain.
