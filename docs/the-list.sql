-- The List: the table behind https://evidencehedge.org/list
--
-- Run once in a Supabase project's SQL editor. The site reads and writes it
-- over the REST API with the project's anon key (src/list/store.js), so
-- row-level security is the whole gate: anyone may read entries and add one;
-- no one may change or delete one except from the dashboard (service role).
--
-- The checks repeat the add form's own (src/list/entry.js validateEntry) and
-- vocabularies (src/list/fields.js), so a request made outside the site meets
-- the same rules. If those lists change, change these to match.

create table if not exists public.list_entries (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  company       text not null check (char_length(company) between 1 and 120),
  industry      text not null check (industry in (
                  'Communication services', 'Consumer goods and retail', 'Education and research',
                  'Energy', 'Financial services', 'Government and public sector',
                  'Health care and life sciences', 'Industrials', 'Information technology',
                  'Materials', 'Media and publishing', 'Nonprofit and advocacy',
                  'Professional services and consulting', 'Real estate', 'Utilities', 'Other')),
  report_type   text not null check (report_type in (
                  'Research report', 'Survey report', 'White paper', 'Industry or market report',
                  'Annual or impact report', 'Policy brief', 'Academic paper', 'Press release',
                  'News article', 'Opinion or commentary', 'Blog post', 'Marketing material',
                  'Sponsored content', 'Other')),
  report_name   text not null check (char_length(report_name) between 1 and 300),
  published_on  date not null check (published_on between date '1900-01-01' and current_date + 1),
  score         numeric(3, 1) not null check (score between 1 and 10),
  engine        text not null check (char_length(engine) between 1 and 40),
  -- SHA-256 of the document text, hex. One report, one entry.
  doc_hash      text not null unique check (doc_hash ~ '^[0-9a-f]{64}$')
);

alter table public.list_entries enable row level security;

drop policy if exists "Anyone can read The List" on public.list_entries;
create policy "Anyone can read The List"
  on public.list_entries for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can add to The List" on public.list_entries;
create policy "Anyone can add to The List"
  on public.list_entries for insert
  to anon, authenticated
  with check (true);

-- Only reading and adding are granted; no update or delete for the public key.
revoke all on public.list_entries from anon, authenticated;
grant select, insert on public.list_entries to anon, authenticated;

-- ── Version 2 (Nov. 2026): entries from the corpus audit ─────────────────────
-- Safe to run again. Adds a link to each report, whether a reader or the
-- corpus audit added it, how much of its publication date is known (most
-- firm reports print a month or a year), and its claim counts. The public key
-- may add only readers' entries; the audit's are loaded from the dashboard.

alter table public.list_entries add column if not exists source_url text
  check (source_url is null or (source_url ~ '^https?://' and char_length(source_url) <= 2000));
alter table public.list_entries add column if not exists origin text not null default 'reader'
  check (origin in ('reader', 'audit'));
alter table public.list_entries add column if not exists published_precision text not null default 'day'
  check (published_precision in ('day', 'month', 'year', 'unknown'));
alter table public.list_entries add column if not exists claims integer check (claims is null or claims >= 0);
alter table public.list_entries add column if not exists flagged integer check (flagged is null or flagged >= 0);

alter table public.list_entries alter column published_on drop not null;
alter table public.list_entries drop constraint if exists list_entries_published_known;
alter table public.list_entries add constraint list_entries_published_known
  check (published_precision = 'unknown' or published_on is not null);

drop policy if exists "Anyone can add to The List" on public.list_entries;
create policy "Anyone can add to The List"
  on public.list_entries for insert
  to anon, authenticated
  with check (origin = 'reader' and published_precision = 'day' and published_on is not null);

create index if not exists list_entries_origin on public.list_entries (origin);
create index if not exists list_entries_score on public.list_entries (score);

