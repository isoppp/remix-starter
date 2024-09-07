# Remix Starter

## Features

- [x] Remix
- [x] Biome for basic lint and format
- [x] ESLint for only tailwindcss
- [x] Lefthook ( consider to change to another hook libs )
  - I think after commit --amend, the hook is sometimes not triggered 
- [x] TailwindCSS and shadcn-ui
- [x] Postgres through docker compose
- [x] Prisma
- [x] Valibot for schema validation
- [x] tRPC with test example which uses DB
- [x] React Query
- [x] vitest ( .n. prefix runs on node env, .b. prefix runs on browser env)
- [x] Storybook
- [x] Scaffdog for component template
- [x] Renovate for package updates
- [x] GitHub Actions for basic linting and testing
- [x] Dockerfile for deployment
- [x] Custom Express server with support for CSP headers, rate limiting, and more

TODO: put links to each feature

---

- [ ] Auth? (Firebase or self implementation)

## Development

Run docker compose for postgresql:

```bash
docker compose up -d
```

Run prisma migration:

```bash
pnpm migrate
```

Run the dev server:

```bash
pnpm dev
```

Other commands:

```bash
# Create a new component
pnpm gen-c

# storybook
pnpm storybook

# run test
pnpm test
```
