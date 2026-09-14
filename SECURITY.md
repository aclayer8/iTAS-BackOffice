# Security and Dependency Maintenance

## Application controls

- Every business API must authenticate and authorize inside its Route Handler.
  Middleware protects browser pages but intentionally excludes `/api` so APIs
  return explicit `401` or `403` responses.
- Import endpoints accept authenticated staff requests only. Certification
  spreadsheets are restricted to `.xlsx`/`.xls` files up to 25 MB.
- Seed credentials come from environment variables and must never be committed.
- Run `npm run test:security` against a local production server after changing
  authentication, middleware, permissions or mutation routes.

## Known dependency follow-up

The non-breaking dependency cleanup completed on 2026-09-14. `npm audit
--omit=dev` still reports advisories in two dependency areas that cannot be
resolved safely with a patch-only update:

- `xlsx`: used for staff-controlled import/export and currently has no patched
  npm release. Treat uploaded workbooks as untrusted, retain file-size limits,
  and replace or upgrade the parser when a maintained compatible release is
  available.
- Next.js bundled PostCSS: npm currently proposes a Next.js 16 major upgrade.
  Perform that upgrade on a dedicated branch with authentication, middleware,
  build and browser regression testing.

Do not run `npm audit fix --force` directly against `main`. Review major-version
changes on a feature branch and record any temporary mitigations here.

## Reporting

Report suspected vulnerabilities privately to the repository owner. Do not put
credentials, customer data, production URLs containing tokens, or exploit data
in public issues or logs.
