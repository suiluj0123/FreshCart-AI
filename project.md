# FreshCart AI — Local Grocery Store with AI Meal Planning

> This file is the persistent spec for this project. Keep it in the repo root.
> When prompting Antigravity agents, reference this file directly (e.g. "Follow
> PROJECT.md, implement Step 1 only") instead of re-explaining context each time.
> Update this file as decisions change — it is the source of truth, not the chat history.

---

## 1. Project Summary

A local grocery e-commerce platform where customers can:
- Browse and order groceries for delivery or pickup
- Describe what they want to eat, and get an AI-generated meal plan that
  auto-builds a cart from real, in-stock inventory (with smart substitutions)

Admins can:
- Manage inventory (including per-batch expiry tracking)
- Process orders through a status pipeline
- Use an AI "copilot" that flags near-expiry stock and drafts clearance
  bundles for human approval

**Differentiator to highlight in the portfolio:** the AI doesn't just chat —
it produces structured data (recipes → real SKUs, with substitution logic)
and operates in a human-in-the-loop workflow (AI drafts, admin approves).

---

## 2. Tech Stack (locked — do not change without updating this file)

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Database | Postgres (Supabase) |
| Client | Supabase Client (@supabase/supabase-js) |
| Auth | Supabase Auth (roles: `customer`, `admin`) |
| Payments | Stripe (test mode) |
| AI | Provider-agnostic layer — **Gemini API** (free tier) for development, **Claude API** as a drop-in swap for the production/demo build |
| Email | Resend |
| Hosting | Vercel (app) + Supabase (DB) |
| Testing | Vitest / Playwright (added in final phase) |

### 2.1 AI provider strategy

Cost and structured-output needs are handled with a **provider-agnostic AI
layer**, not a hard dependency on one vendor:

- All AI calls go through a single internal function, e.g.
  `lib/ai/generateMealPlan.ts` and `lib/ai/generateClearanceBundle.ts` —
  never call a provider's SDK directly from a route handler or component.
- Each of these functions takes a plain prompt/context object in and
  returns the same normalized JSON shape out, regardless of which provider
  is behind it.
- **Development:** use the Gemini API (free tier, no card required) for all
  day-to-day iteration and prompt testing — no cost pressure while building.
- **Production/demo:** swap the same function to call the Claude API
  instead. Because every call is routed through one internal function,
  this is a single-file change, not a rewrite.
- Select the active provider via an env var (e.g. `AI_PROVIDER=gemini` or
  `AI_PROVIDER=claude`) so switching doesn't require touching call sites.
- Note for the README: mention this abstraction explicitly — it's a
  deliberate design decision worth calling out in interviews, not just a
  cost workaround.

---

## 3. Data Model (reference — implement in Supabase in Step 1)

```
User            id, clerkId, email, name, role[customer|admin], zip, createdAt
Product         id, name, category, unit[kg|lb|each], imageUrl, basePrice, active
InventoryBatch  id, productId, quantity, expiryDate, costPrice, receivedAt
Order           id, userId, status[placed|packed|out_for_delivery|ready_pickup|completed],
                fulfillmentType[delivery|pickup], total, deliveryZip, createdAt
OrderItem       id, orderId, productId, quantity, priceAtOrder, wasSubstituted
MealPlan        id, userId, prompt, generatedRecipesJson, createdAt
ClearanceBundle id, productIds[], discountPct, aiBlurb, status[pending|approved|rejected], expiresAt
```

Design notes:
- `InventoryBatch` is separate from `Product` because groceries need
  per-batch expiry tracking — a product can have multiple batches with
  different expiry dates.
- `ClearanceBundle.status` starts at `pending` — AI never publishes directly
  to the storefront; an admin must approve it first.

---

## 4. Coding Conventions & File Structure (locked)

This section exists so every Antigravity agent session — regardless of
which step it's working on — produces code that looks like it came from
the same developer. Point agents at this section explicitly (e.g. "Follow
Section 4 of PROJECT.md for file structure and naming").

### 4.1 Folder structure

All code lives under this exact tree. Do not let an agent invent new
top-level folders or reorganize existing ones without updating this file.

```
src/
  app/                      # routes ONLY — no business logic here
    (storefront)/
      page.tsx
      products/
      cart/
      checkout/
      account/
    admin/
      page.tsx
      inventory/
      orders/
      clearance/
    api/
      checkout/route.ts
      meal-plan/route.ts
      webhooks/
        stripe/route.ts
        clerk/route.ts
      cron/
        expiry-scan/route.ts
  components/
    ui/                     # dumb, reusable primitives (Button, Card, Badge)
    storefront/             # feature-specific, customer-facing
    admin/                  # feature-specific, admin-facing
  lib/
    ai/                     # generateMealPlan.ts, generateClearanceBundle.ts,
                             # provider.ts (Gemini/Claude switch)
    db/                     # supabase.ts (singleton client), query helpers
    stripe/
    auth/                   # role-check helpers, middleware logic
    utils/                  # generic helpers (formatCurrency, etc.)
  types/                    # shared TypeScript types/interfaces
  hooks/                    # custom React hooks
supabase/
  migrations/
    schema.sql
  seed.ts
```

**Rule of thumb:** if a file does more than render UI or define a route, it
does not belong in `app/`. Route handlers in `app/api/*/route.ts` should
be thin — parse the request, call a function in `lib/`, return the
response. The actual logic (DB queries, AI calls, Stripe calls) lives in
`lib/`, not inline in the route.

### 4.2 Naming conventions

| What | Convention | Example |
|---|---|---|
| React components | PascalCase, one component per file | `ProductCard.tsx` |
| Non-component files (lib, hooks, utils) | camelCase | `generateMealPlan.ts` |
| Folders | kebab-case | `meal-plan/` |
| Prisma models | PascalCase singular | `InventoryBatch` |
| DB fields | camelCase | `expiryDate` |
| API routes | kebab-case, REST-ish nouns | `/api/meal-plan` |
| Env vars | SCREAMING_SNAKE_CASE | `GEMINI_API_KEY` |
| React hooks | prefixed `use` | `useCart.ts` |

### 4.3 Import & architecture rules

- Components in `app/` may import from `components/`, `lib/`, `types/`,
  and `hooks/` — never the reverse. `lib/` must never import from `app/`
  or `components/`.
- No direct provider SDK calls (Anthropic/Gemini SDKs, Stripe SDK, Supabase
  client) outside of `lib/`. If an agent writes `new Stripe(...)` inside a
  component or route handler directly, that's a structure violation —
  it belongs in `lib/stripe/`.
- One Supabase client instance for the whole app (`lib/db/supabase.ts`,
  singleton pattern) — never `new createClient(...)` scattered across files.
- Shared types go in `types/`, not redefined inline in multiple files.
  If the same shape (e.g. a `MealPlanResult`) is used in more than one
  file, it belongs in `types/`.

### 4.4 Enforcement (mechanical, not just prose)

Set these up in Step 0 so violations are caught automatically instead of
relying on manual review every time:

- **TypeScript** — `strict: true` in `tsconfig.json`
- **ESLint** — add `import/no-restricted-paths` (or similar) to block
  `lib/` from importing `app/` or `components/`
- **Prettier** — commit a `.prettierrc` so agents match existing
  formatting instead of guessing
- **Husky pre-commit hook** — run `lint` + `typecheck` before any commit
  can land, so structural drift can't be committed even accidentally

### 4.5 Working from examples

Once Step 2 (Authentication) is complete and reviewed, treat `lib/auth/`
and its related route/component files as the reference pattern for all
future features. When prompting an agent for a new feature, explicitly
say: "Follow the same file/folder pattern as `lib/auth/`." Agents match
real examples in the codebase far more reliably than prose rules alone —
use this file for the rules, and a clean early feature for the pattern.

### 4.6 Structure checklist for every review

When reviewing any agent-generated diff, check structure in addition to
functionality:
- [ ] Is this file in the right folder per Section 4.1?
- [ ] Does the naming match Section 4.2?
- [ ] Is business logic in `lib/`, not leaked into a route or component?
- [ ] Are shared types in `types/`, not duplicated inline?
- [ ] Does it follow the pattern of the reference feature (Section 4.5)?

---

## 5. Build Order — Step by Step

Work through these **in order**. Each step is meant to be handed to an
Antigravity agent as its own task, reviewed, tested with the browser
subagent, and committed before moving to the next. Do not let an agent
jump ahead to a later step.

---

###  Step 0 — Project Scaffold
**Goal:** empty but running app, deployed.

- Init Next.js + TypeScript + Tailwind
- Connect GitHub repo → Vercel auto-deploy
- Set up Supabase Postgres project, add connection string to `.env.local`
  (do this manually — do not let an agent generate or commit secrets)
- Init Supabase client, confirm connection to Supabase via API keys connects successfully
- Confirm a blank deployed page loads at the Vercel URL

**Definition of done:** empty Next.js app is live at a public URL.

---

###  Step 1 — Database Schema
**Goal:** all tables from Section 3 exist and are migrated.

- Write SQL schema exactly matching Section 3
- Run migration, verify tables in Supabase dashboard
- Seed script: create ~60-100 realistic grocery products across categories
  (produce, dairy, pantry, meat, frozen, bakery), with varied
  `InventoryBatch` quantities and expiry dates (some intentionally near-expiry
  for later testing of the copilot feature)

**Definition of done:** Supabase dashboard shows populated, correctly related tables.

---

###  Step 2 — Authentication (User & Admin Login)
**Goal:** working login/signup with two roles, gated routing.

This is the first user-facing feature — build it before anything else so
every later step can assume a logged-in user with a known role.

- Integrate Supabase Auth for sign up / sign in / sign out
- On user creation, sync to your `User` table via Supabase database trigger (store `clerkId` as the Supabase Auth user ID, `email`, default `role: customer`)
- Add a `role` field customers cannot self-edit — only settable directly in DB
  or via an admin action (never expose role selection on the public signup form)
- Middleware: routes under `/admin/*` require `role: admin`, redirect
  everyone else to `/`
- Routes under `/account/*` require any logged-in user
- Public routes (`/`, `/products`, `/products/[id]`) work without login
- Build a simple `/admin` landing page that only renders for admins, and a
  `/account` page that only renders for logged-in customers, just to prove
  the gating works

**Manual verification checklist (use the browser subagent for this):**
- [ ] Sign up as a new user → lands with `role: customer` → can reach `/account` → cannot reach `/admin` (redirected)
- [ ] Manually promote that user to `admin` in the DB → can now reach `/admin`
- [ ] Logged-out visitor can view `/products` but is redirected to sign-in from `/account` or `/admin`
- [ ] Sign out works and re-gates protected routes immediately

**Definition of done:** two distinct login experiences (customer, admin) with
enforced route protection, verified live, not just "should work."

---

###  Step 3 — Storefront Browsing
**Goal:** customers can browse and search real inventory.

- Product grid page with category filter + search
- Product detail page (image, price, unit, stock status pulled from
  aggregated `InventoryBatch` quantities)
- Out-of-stock products visibly marked, not just hidden

**Definition of done:** logged-out or logged-in user can browse all seeded products.

---

###  Step 4 — Cart & Checkout
**Goal:** full purchase flow, real payment in test mode.

- Client-side cart (Zustand or Context) — add/remove/update quantity
- Checkout page: delivery vs pickup selection, address/zip for delivery
- Stripe test-mode payment integration
- On successful payment, create `Order` + `OrderItem` records, decrement
  the appropriate `InventoryBatch` quantities
- Order confirmation page + `/account/orders` history page

**Definition of done:** a real end-to-end test purchase (with a Stripe test
card) creates a correct order in the DB and decrements stock.

---

###  Step 5 — AI Meal Planning (core differentiator)
**Goal:** natural language → recipes → real cart, with substitutions.

Build in this exact sub-order:

1. **Structured recipe generation** — call `lib/ai/generateMealPlan.ts`
   (see Section 2.1) with the user's request. System prompt must force
   strict JSON output only (no prose, no markdown fences): recipe name,
   servings, ingredients list (name, quantity, unit), dietary tags. Test
   this against the Gemini free tier during development.
2. **Ingredient → SKU matching** — for each generated ingredient, match
   against real `Product` names. Pass your actual product name list into
   the prompt as context so the model normalizes ingredient names against
   real inventory, rather than relying on pure fuzzy string matching alone.
3. **Substitution logic** — if the matched product has 0 available stock,
   query other products in the same category and select/flag a substitute.
   Mark `OrderItem.wasSubstituted = true` for anything swapped.
4. **Auto-cart building** — populate the cart from matched SKUs and
   quantities, and show the generated recipes alongside the cart so the
   user sees *why* each item is there.

**Definition of done:** typing something like "high protein, 3 dinners,
avoid dairy, budget $60" produces real recipes and a cart built from
actual in-stock products, with any swaps clearly labeled.

---

###  Step 6 — Admin: Inventory & Order Management
**Goal:** admin can run the store day-to-day.

- Inventory table: CRUD on `Product` and `InventoryBatch`
- Order queue: list orders, update `status` through the pipeline
  (placed → packed → out_for_delivery/ready_pickup → completed)
- Customer-facing order status updates live on `/account/orders`

**Definition of done:** admin can fully manage stock and move a real test
order through every status.

---

###  Step 7 — AI Inventory Copilot
**Goal:** AI drafts, admin approves — never auto-publishes.

- Scheduled job (Vercel Cron) runs daily: query `InventoryBatch` for items
  expiring within N days
- Call `lib/ai/generateClearanceBundle.ts` to propose a `ClearanceBundle`:
  2-4 near-expiry items that pair well, a suggested discount %, and a
  short promo blurb
- Bundle is created with `status: pending` — **never** `approved` — an
  admin must explicitly approve it in `/admin/clearance` before it appears
  on the storefront
- Approved bundles surface on the storefront with the discount applied

**Definition of done:** a manually-triggered run of the cron job produces a
pending bundle visible only in admin, and approving it makes it visible to
customers.

---

## 6. Working With Antigravity — Rules for This Project

- **One step at a time.** Prompt an agent with a single Step from Section 5,
  not the whole roadmap. Reference this file by name in the prompt.
- **Structure compliance.** Every prompt to an agent should implicitly or
  explicitly point at Section 4 — for anything non-trivial, say "Follow
  Section 4 of PROJECT.md for file structure and naming."
- **Use Manager View for independent work only** — e.g. Step 3 (storefront UI)
  and part of Step 2 (auth) can run in parallel since they don't depend on
  each other's output; Step 5 must wait until Step 4 is done and reviewed.
- **Always verify with the browser subagent** before marking a step done —
  don't accept "should work" from a diff alone, especially for auth gating
  and checkout.
- **Manual review required (do not let an agent self-approve) for:**
  - Stripe integration and webhook handling
  - Any DB migration that could drop or alter existing data
  - Auth/role logic — confirm admin routes are actually gated, live, not
    just from the agent's own report
- **Secrets** (`.env`, API keys, DB connection strings) are set by you
  directly, never generated or committed by an agent. This includes both
  `GEMINI_API_KEY` and `ANTHROPIC_API_KEY`, plus `AI_PROVIDER` to select
  which one is active.

---

## 7. Current Status

> Update this section as you complete steps — this is what tells the next
> agent session where to pick up.

- [x] Step 0 — Project Scaffold
- [x] Step 1 — Database Schema
- [x] Step 2 — Authentication (User & Admin Login)
- [ ] Step 3 — Storefront Browsing
- [ ] Step 4 — Cart & Checkout
- [ ] Step 5 — AI Meal Planning
- [ ] Step 6 — Admin: Inventory & Order Management
- [ ] Step 7 — AI Inventory Copilot
- [ ] Step 8 — Notifications & Polish
- [ ] Step 9 — Testing, Docs, Deployment
