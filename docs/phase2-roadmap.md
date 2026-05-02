# Phase 2 implementation notes

## Browser extension capture

- Manifest V3 extension in `apps/extension`.
- Captures `title`, `company`, `sourceUrl`, and `capturedAt`.
- Stores queued captures for candidate review before API submission.

## Likely ghosted soft classifier

- `apps/api/src/domain/ghosting-score.ts` computes low/moderate/high silence likelihood.
- Present as an informative signal, never as certainty or rejection.

## Mobile PWA polish

- Reuse `apps/web` with responsive-first card/table toggles.
- Add install prompt and offline queue for manual captures.
