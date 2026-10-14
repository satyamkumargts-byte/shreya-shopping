create table if not exists public.encrypted_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  order_data jsonb,
  encrypted_data text,
  created_at timestamptz not null default now()
);

alter table public.encrypted_orders
  add column if not exists order_data jsonb;

alter table public.encrypted_orders
  alter column encrypted_data drop not null;

create index if not exists encrypted_orders_user_created_at_idx
  on public.encrypted_orders (user_id, created_at desc);

create unique index if not exists auth_users_contact_phone_unique_idx
  on auth.users (
    (
      nullif(
        regexp_replace(
          coalesce(raw_user_meta_data ->> 'contact_phone', ''),
          '[^0-9]',
          '',
          'g'
        ),
        ''
      )
    )
  )
  where nullif(
    regexp_replace(
      coalesce(raw_user_meta_data ->> 'contact_phone', ''),
      '[^0-9]',
      '',
      'g'
    ),
    ''
  ) is not null;

alter table public.encrypted_orders enable row level security;

drop policy if exists "Customers can view their own encrypted orders" on public.encrypted_orders;
drop policy if exists "Customers can view their own orders" on public.encrypted_orders;
create policy "Customers can view their own orders"
  on public.encrypted_orders
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Customers can create their own encrypted orders" on public.encrypted_orders;
drop policy if exists "Customers can create their own orders" on public.encrypted_orders;
create policy "Customers can create their own orders"
  on public.encrypted_orders
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and order_data is not null
    and encrypted_data is null
  );

grant select, insert on public.encrypted_orders to authenticated;
revoke all on public.encrypted_orders from anon;

do $$
begin
  if to_regclass('public.orders') is not null then
    execute 'revoke all on public.orders from anon, authenticated';
  end if;
end
$$;
