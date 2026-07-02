# Known Problems & Solutions

---

## TypeORM "Entity metadata not found" in Production Build

### Symptom

After running `next build` and starting the app in production mode (`NODE_ENV=production`),
attempting to log in (or any request that touches the database) fails with:

```
TypeORMError: Entity metadata for g#task was not found.
Check if you specified a correct entity object and if it's connected in the connection options.
```

The error appears in the auth callback (`CallbackRouteError`) and in any route handler
that uses a TypeORM repository. The minified class name `g` (instead of `Task`) is the
key indicator.

### Root Cause

In production mode, webpack/Terser minifies the server bundle and **renames class names
to single letters** (`Task` → `g`, `User` → `h`, etc.).

TypeORM registers entity metadata at class-definition time via `reflect-metadata`
decorators (`@Entity`, `@Column`, etc.). At runtime, when TypeORM validates the entity
registry, it looks up metadata by `constructor.name`. After minification,
`Task.name === 'g'`, so the lookup fails — hence `Entity metadata for g#task was not found`.

> **Note on module duplication:** Next.js webpack also duplicates entity class code across
> per-route server chunks (you can verify: `grep -rl "class Task {" .next/server/` returns
> multiple files). This is a known general problem with TypeORM + webpack and could
> theoretically cause metadata identity mismatches. However, in this project it was **not
> confirmed as the actual cause** of the error — the name mangling was sufficient to
> explain it and fixing that alone resolved the issue.

### Solution

Disable minification on the server-side webpack bundle in `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  // ...
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('typeorm');

      // TypeORM resolves entities by their JavaScript class name at runtime
      // (via constructor.name). Production minification renames classes to
      // single letters (e.g. Task → g), breaking TypeORM's metadata lookup.
      // Disabling minimization on the server bundle preserves class names.
      config.optimization = {
        ...config.optimization,
        minimize: false,
      };
    }
    return config;
  },
};
```

**Why only `isServer`?**

The client bundle (browser JS) does not run TypeORM at all. Disabling minification
there would increase the JS payload sent to users with no benefit. Server bundles
are never sent to users, so their size does not matter.

**Why spread `...config.optimization`?**

To preserve any other optimization settings Next.js has configured (`splitChunks`,
`moduleIds`, etc.) and only override the `minimize` flag.

### After applying the fix

Rebuild the application for the changes to take effect:

```bash
docker compose -f docker-compose.prod.yml run --rm build
docker compose -f docker-compose.prod.yml restart app
```

### Verification

After restarting, login should succeed and the tasks API should return data:

```bash
CSRF=$(curl -s -c /tmp/c.txt http://localhost:3010/api/auth/csrf \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])")

curl -s -c /tmp/c.txt -b /tmp/c.txt -L \
  -X POST http://localhost:3010/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=123456&csrfToken=${CSRF}" \
  -o /dev/null -w "HTTP: %{http_code}\n"
# Expected: HTTP: 200

curl -s -b /tmp/c.txt http://localhost:3010/api/tasks
# Expected: JSON array of tasks
```

No `TypeORMError` lines should appear in `docker compose logs app`.

### Related files

- `next.config.ts` — webpack configuration with the fix
- `src/lib/db/dataSource.ts` — DataSource initialization
- `typeorm.config.ts` — entity registration
- `docker-compose.prod.yml` — production container setup
