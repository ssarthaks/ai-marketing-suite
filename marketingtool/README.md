# Marketing OS

An AI-first Marketing Operating System — campaigns, AI content, brand assets,
landing pages, lead magnets, leads, search, and analytics in one premium
workspace. Built as a production SaaS, not a demo.

## Features

- **Campaign Manager** — plan campaigns with audience, product, objective,
  budget, and timeline; every resource in the workspace can link back to one.
- **AI Studio** — DeepSeek-powered generation for 11 content types (blog,
  Instagram, Facebook, LinkedIn, email, Google/Meta ads, landing page copy,
  CTAs, SEO meta, keywords), grounded in your brand profile and campaign
  context. Every generation is saved automatically.
- **Content Library** — full-text search, filters by type/campaign/collection,
  favorites, edit, duplicate.
- **Asset Manager** — signed direct-to-Cloudinary uploads with progress, grid
  and list views, folders, search, preview, copy URL.
- **Landing Page Builder** — seven section types edited through typed forms
  with a live preview, published at `/p/[slug]` with SEO metadata and view
  counting.
- **Lead Magnets** — gated checklists/guides/PDF downloads at `/m/[slug]`;
  content unlocks only after a verified email capture.
- **Leads** — every capture stored with its source, searchable and filterable.
- **Dashboard & Analytics** — stat tiles, 30-day trend charts, activity feed,
  AI token usage, content by type, leads by source, landing page conversion.
- **Global search** — ⌘K command palette searching campaigns, content, assets,
  pages, and magnets, plus navigation and quick actions.
- Dark/light mode, loading skeletons, empty states, error boundaries, toasts,
  onboarding flow.

## Stack

| Layer     | Choice                                                 |
| --------- | ------------------------------------------------------ |
| Framework | Next.js 15 (App Router), React 19, TypeScript strict   |
| UI        | TailwindCSS v4, shadcn/ui, Framer Motion, lucide-react |
| Forms     | React Hook Form + Zod (v4)                             |
| Data      | Prisma + Neon PostgreSQL                               |
| Auth      | Auth.js v5 (credentials, JWT sessions, bcrypt)         |
| Storage   | Cloudinary (signed direct uploads)                     |
| AI        | DeepSeek chat completions                              |
| Charts    | Recharts via shadcn chart primitives                   |
| Deploy    | Vercel                                                 |

Everything runs inside Next.js — no external backend, queues, or Docker.

## Architecture

Feature-first: each feature owns its components, server actions, schemas, and
server-only query services.

```
src/
  app/                  # routes only — thin, compose features
    (auth)/             # login, signup
    (app)/              # authenticated shell: dashboard, campaigns, ai-studio,
                        # library, assets, landing-pages, lead-magnets, leads,
                        # analytics, settings
    p/[slug]/           # public landing pages
    m/[slug]/           # public lead magnet pages
    api/                # auth handler, global search
  features/
    <feature>/
      components/       # feature UI (client where needed)
      actions/          # "use server" mutations (validate → authorize → write)
      schemas/          # zod schemas shared by client + server
      server/           # server-only query services
  components/           # shared UI (shadcn/ui + app shell + primitives)
  server/               # infrastructure: db, auth, cloudinary, ai, activity
    ai/                 # client → prompts → service (nothing above the
                        # service knows DeepSeek exists)
  lib/                  # env validation, formatting, slugs, constants, nav
  hooks/                # shared client hooks
prisma/                 # schema + committed initial migration
```

Key decisions:

- **Multi-tenant by design** — every resource belongs to a `Workspace`;
  membership goes through `WorkspaceMember` with a role enum, so teams/roles/
  permissions are an additive change later.
- **JWT sessions carry `userId` + `workspaceId`** — every server action calls
  `requireWorkspace()` and scopes queries by `workspaceId`. No cross-tenant
  reads are possible by construction.
- **Cross-app AI usage uses the shared AI Agent user UUID** — every successful
  provider response atomically increments the AI Agent `users` ledger
  (`total_input_tokens`, `total_output_tokens`, and `total_cost`). Local Prisma
  user IDs remain workspace-only, and externally synced generations are not
  counted twice.
- **Uniform `ActionResult<T>`** from every server action; forms handle
  success/field errors/toasts the same way everywhere.
- **Deleting a campaign unlinks (SetNull) its content/assets/pages** instead
  of destroying them; deleting a workspace cascades everything.
- **Section content is typed JSON** validated by per-type Zod schemas; one
  pure `SectionRenderer` serves both the editor preview and the public page.
- **Activity log** (`Activity`) records every meaningful mutation and powers
  the dashboard and campaign feeds.

## Getting started

1. **Install**

   ```bash
   npm install
   ```

2. **Environment** — copy the template and fill it in:

   ```bash
   cp .env.example .env
   ```

   - `DATABASE_URL` / `DIRECT_URL`: from a [Neon](https://neon.tech) project
     (pooled + direct connection strings).
   - `AUTH_SECRET`: `openssl rand -base64 32`
   - `DEEPSEEK_API_KEY`: from [platform.deepseek.com](https://platform.deepseek.com)
   - Cloudinary credentials from your Cloudinary dashboard.

3. **Database**

   ```bash
   npm run db:migrate   # applies the committed migration to Neon
   ```

4. **Run**

   ```bash
   npm run dev
   ```

   Sign up at `http://localhost:3000/signup` — the first signup creates your
   workspace.

## Deployment (Vercel)

1. Push the repo to GitHub and import it in Vercel.
2. Add all variables from `.env.example` in the Vercel project settings
   (set `NEXT_PUBLIC_APP_URL` to your production URL).
3. Run `npm run db:migrate` against Neon once (locally or via a CI step).
4. Deploy. `postinstall` runs `prisma generate` automatically.

## Scripts

| Script                          | Purpose                                                    |
| ------------------------------- | ---------------------------------------------------------- |
| `npm run dev`                   | Dev server (Turbopack)                                     |
| `npm run build`                 | Production build                                           |
| `npm run test:usage-accounting` | Verify shared-user attribution and token-cost calculations |
| `npm run db:migrate`            | Apply migrations (`prisma migrate deploy`)                 |
| `npm run db:push`               | Push schema without migrations (prototyping)               |
| `npm run db:studio`             | Prisma Studio                                              |

## Roadmap-ready

The schema and layering leave room for: teams & roles (membership table
already exists), integrations (Google/Meta/Mailchimp/Brevo as new `server/`
adapters), CRM & automation (leads already normalized), A/B testing (sections
are ordered JSON), and billing (workspace-scoped `Settings` extends cleanly).
