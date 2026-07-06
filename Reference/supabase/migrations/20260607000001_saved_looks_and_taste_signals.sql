-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: saved_looks + saved_items + taste_signals
-- Additive only — does not modify or drop any existing tables.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. saved_looks ──────────────────────────────────────────────────────────
-- One row per saved inspiration photo/look.
-- descriptors: { vibeDescriptors, aestheticKeywords, colorPalette, ... }
-- source_brief_id: opaque key tying the look back to the style proxy response
--   that generated it (for future deduplication / re-fetching).

create table if not exists public.saved_looks (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users on delete cascade,
  created_at       timestamptz not null default now(),
  occasion         text,
  image_url        text,
  descriptors      jsonb,
  source_brief_id  text
);

alter table public.saved_looks enable row level security;

create policy "saved_looks: users see own rows"
  on public.saved_looks for select
  using (auth.uid() = user_id);

create policy "saved_looks: users insert own rows"
  on public.saved_looks for insert
  with check (auth.uid() = user_id);

create policy "saved_looks: users update own rows"
  on public.saved_looks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "saved_looks: users delete own rows"
  on public.saved_looks for delete
  using (auth.uid() = user_id);

create index if not exists saved_looks_user_id_idx
  on public.saved_looks (user_id);


-- ─── 2. saved_items ──────────────────────────────────────────────────────────
-- One row per saved shoppable product.
-- parent_look_id: nullable FK — links a product to the look it was saved from.

create table if not exists public.saved_items (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users on delete cascade,
  created_at       timestamptz not null default now(),
  product_name     text,
  product_url      text,
  retailer         text,
  image_url        text,
  descriptors      jsonb,
  parent_look_id   uuid        references public.saved_looks (id) on delete set null
);

alter table public.saved_items enable row level security;

create policy "saved_items: users see own rows"
  on public.saved_items for select
  using (auth.uid() = user_id);

create policy "saved_items: users insert own rows"
  on public.saved_items for insert
  with check (auth.uid() = user_id);

create policy "saved_items: users update own rows"
  on public.saved_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "saved_items: users delete own rows"
  on public.saved_items for delete
  using (auth.uid() = user_id);

create index if not exists saved_items_user_id_idx
  on public.saved_items (user_id);

create index if not exists saved_items_parent_look_id_idx
  on public.saved_items (parent_look_id);


-- ─── 3. taste_signals ────────────────────────────────────────────────────────
-- One row per user interaction that carries style-preference signal.
-- signal_type values:
--   heart       — user explicitly saved / hearted a look
--   tryon       — user marked "I'd wear this"
--   shop_click  — user clicked through to buy a product
--   skip        — user explicitly dismissed a look
-- weight: signed int — positive signals use positive weights (e.g. heart=3,
--   tryon=2, shop_click=1), skip uses a negative weight (-1).
-- descriptors: snapshot of vibeDescriptors/aestheticKeywords from the look at
--   interaction time, used to train taste models without a JOIN.

create table if not exists public.taste_signals (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users on delete cascade,
  created_at   timestamptz not null default now(),
  signal_type  text        not null check (
                             signal_type in ('heart', 'tryon', 'shop_click', 'skip')
                           ),
  weight       int         not null default 1,
  descriptors  jsonb
);

alter table public.taste_signals enable row level security;

create policy "taste_signals: users see own rows"
  on public.taste_signals for select
  using (auth.uid() = user_id);

create policy "taste_signals: users insert own rows"
  on public.taste_signals for insert
  with check (auth.uid() = user_id);

create policy "taste_signals: users update own rows"
  on public.taste_signals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "taste_signals: users delete own rows"
  on public.taste_signals for delete
  using (auth.uid() = user_id);

create index if not exists taste_signals_user_id_idx
  on public.taste_signals (user_id);

-- Composite index for time-windowed taste queries (e.g. "last 90 days of signals")
create index if not exists taste_signals_user_id_created_at_idx
  on public.taste_signals (user_id, created_at desc);
