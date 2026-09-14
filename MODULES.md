# iTAS BackOffice Modules

The root route (`/`) is the authenticated module launcher. Module metadata lives
in `src/config/modules.ts`; add or update launcher entries there instead of
duplicating cards in the page component.

## Current modules

| Module | Status | Entry route | Scope |
| --- | --- | --- | --- |
| Asset Management | Available | `/dashboard` | Assets, contracts, customers, licenses, renewals, import and reports |
| Ticket Management | Planned | Not assigned | Reserved for the service desk workflow |
| Module slots 03-06 | Reserved | Not assigned | Future business modules |

## Adding a module

1. Create a route group under `src/app/(modules)/<module-name>` when the module
   needs its own layout. Route groups do not add a URL segment.
2. Keep the module's pages, components and styles inside that boundary. Move
   shared primitives to `src/components`; move cross-module business logic to
   `src/lib` only after a second consumer exists.
3. Add permissions to `src/types/index.ts` and the role matrix in
   `src/lib/rbac.ts`. Enforce authorization again inside every Route Handler;
   hiding a navigation item is not an authorization control.
4. Register the module in `src/config/modules.ts`. Set `status: "available"`
   and provide `href` only after its entry route and permission checks work.
5. Add focused tests for business rules and API boundaries, then run
   `npm run validate` before release.

## Operational boundaries

- Asset Management remains in the existing routes to avoid a high-risk bulk
  move. New modules can adopt the module route group convention incrementally.
- Contract list filtering currently loads a minimal matching projection and
  calculates effective renewal status in application memory. Move counting,
  sorting and pagination into database queries before the dataset becomes large.
- Preview/Print uses the latest saved contract and item data. Creating or linking
  missing assets is a separate workflow decision and is not implied by printing.
