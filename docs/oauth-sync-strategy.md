# OAuth sync strategy

## Gmail

- Primary: Gmail `watch` notifications bridged to API webhook.
- Fallback: EventBridge scheduled poll every 10 minutes with jitter.
- Safety: store `watchExpiry`; auto-renew 24h before expiration.

## Microsoft Graph

- Poll mail folder for allowlisted senders every 10 minutes.
- Track `deltaLink` for incremental sync when enabled.

## Shared controls

- Skip messages that do not match allowlist.
- Record every decision in `EmailIngestion` audit rows.
- Use idempotency key = `provider + messageId` to avoid duplicates.
