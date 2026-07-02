# AlgoRecall Frontend Architecture

AlgoRecall is now a Nuxt/Vue product app for LeetCode review scheduling. It is a public product with a lightweight landing page, account-based personal libraries, review queues, detail pages, and progress statistics.

## Stack

- Nuxt 4 with Vue, TypeScript, file-based pages, middleware, and Nitro server routes.
- Tailwind CSS v4 through `@tailwindcss/vite`.
- DaisyUI v5 for component classes and the custom `algorecall` light theme.
- `@lucide/vue` for icons.
- Better Auth for email/password authentication.
- Drizzle ORM with PostgreSQL for app data and auth tables.

## Structure

- `app/pages`: public landing/auth pages and protected product pages.
- `app/components`: reusable Vue UI components.
- `app/middleware/auth.ts`: protected-route session check.
- `server/api`: Nuxt server API routes.
- `server/db`: Drizzle schema and database connection.
- `server/utils`: auth/session helpers and LeetCode JSON index access.
- `shared`: framework-neutral types, scheduling, display helpers, search helpers, and analytics.

## Product UI Direction

The UI should feel bright, calm, study-oriented, and efficient. Use DaisyUI semantic components first: `navbar`, `menu`, `card`, `stats`, `table`, `badge`, `btn`, `input`, `select`, `alert`, `progress`, and `radial-progress`.

Keep product screens compact enough for repeated use. Cards are appropriate for major panels, repeated metrics, and side tools; avoid nested decorative cards. Use Chinese copy for product workflows.

## Data Boundary

`data/leetcode_details.json` is a protected local source file. It is read by the LeetCode search API and must not be reformatted, moved, overwritten, or regenerated during UI/backend work.

## Verification

For normal changes run:

```bash
npm run typecheck
npm run test
npm run build
```

For data-sensitive changes, compare:

```bash
shasum -a 256 data/leetcode_details.json
```
