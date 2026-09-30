# Design QA: Overview Expiry Count Buttons

## Reference

- User-provided Overview screenshot at desktop width.
- Target area: the `2`, `5`, and `6` expiry counts in the Contracts Expiring Soon summary band.

## Implementation review

- The 30, 60, and 90-day counts are rendered as distinct, tone-matched link buttons.
- The existing layout, icons, labels, summary counts, and responsive grid are preserved.
- Each link has a descriptive accessible name and existing focus-visible treatment.
- Hover treatment adds elevation without changing the surrounding card layout.

## Verification

- TypeScript, ESLint, unit tests, and the production build pass.
- The local application redirects `/dashboard` to the protected login page as expected.
- A rendered post-login comparison could not be captured without an authenticated session.

final result: blocked

Blocker: visual comparison and interaction verification require an authorized authenticated browser session.
