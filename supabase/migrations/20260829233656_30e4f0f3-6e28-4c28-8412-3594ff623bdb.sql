create table if not exists public.studio_texts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  brand_id uuid not null references public.studio_brands(id) on delete cascade,
  title text not null default '',
  body text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.studio_texts to authenticated;
grant all on public.studio_texts to service_role;

alter table public.studio_texts enable row level security;

drop policy if exists "own authorial texts" on public.studio_texts;
create policy "own authorial texts"
on public.studio_texts
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create index if not exists studio_texts_brand_idx on public.studio_texts (brand_id, sort_order);