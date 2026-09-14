# Production Deployment

Production is deployed by Vercel from the `main` branch. Use a feature branch for
all changes and keep database migrations separate from UI-only releases.

## Release checklist

1. Run `npm ci` in a clean checkout.
2. Run `npm run validate`.
3. Confirm that required production environment variables are present in Vercel.
4. Fast-forward the tested feature branch into `main` and push it.
5. Wait for the Vercel Production deployment for the exact commit SHA to succeed.
6. Check `https://itas-backoffice.vercel.app/api/health` and smoke-test the changed flow.

For a local unauthenticated API smoke test, start the production server and run
`npm run test:security` from another terminal.

Do not run `prisma migrate reset` against production. Apply committed migrations
with `npm run db:migrate:prod` only when the release contains a reviewed migration.

## Rollback

For a code-only release, revert the release commit on a new feature branch, run
`npm run validate`, then fast-forward and push the revert to `main`. For a database
release, follow the rollback notes committed with that migration before reverting
application code.

Record the released commit, deployment result and any manual verification in the
release handoff.
