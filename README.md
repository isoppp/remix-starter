# Remix Starter

## Features

- [x] Remix
- [x] Biome for basic lint and format
- [x] ESLint for only tailwindcss
- [x] Lefthook ( consider to change to another hook libs )
- [x] TailwindCSS and shadcn-ui
- [x] Postgres through docker compose
- [x] Prisma
- [x] Valibot for schema validation
- [x] tRPC
- [x] React Query
- [x] vitest ( .n. prefix runs on node env, .b. prefix runs on browser env)
- [x] Storybook
- [x] Scaffdog for component template
- [x] Renovate for package updates
- [x] Github Actions for basic linting and testing

TODO: put links to each feature

---

- [ ] tRPC example test ( or any test which uses DB )
- [ ] Docker for deployment
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
