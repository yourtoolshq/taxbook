# Development and releases

## Local development

Tax Book uses pnpm and Node.js 22 or newer.

    cp .env.example .env
    mkdir -p .data
    pnpm install
    pnpm db:migrate
    pnpm dev

Open <http://localhost:3000>.

## Main is releasable

The **main** branch is always expected to build and run as the current
production version. Make changes on short-lived branches, open a pull request,
and squash-merge only after CI passes. Do not use main as an integration branch
for incomplete work.

Version tags and published container images are intentionally deferred.

## Database changes

Change the appropriate file under `src/server/db/schema`, then generate and
review a committed migration:

    pnpm db:generate
    pnpm db:migrate

Never use `db:push` against the production database. Production starts by
applying committed migrations and refuses to start if migration fails.

Tests, screenshots, documentation, and examples must use fictional data only.
