-- Migration: 0001_initial_schema
-- Creates all tables, enums, indexes and RLS policies

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Enums ───────────────────────────────────────────────────────────────────
create type role           as enum ('admin', 'staff', 'accountant');
create type classification as enum ('receita', 'despesa');
create type salary_type    as enum ('contrato', 'rec_verdes', 'horas', 'terceiros');
create type meal_type      as enum ('com_sopa', 'sem_sopa');

-- ─── Profiles ────────────────────────────────────────────────────────────────
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text not null,
  role        role not null default 'staff',
  created_at  timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::role, 'staff')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── School Years ────────────────────────────────────────────────────────────
create table school_years (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,    -- "2025-26"
  start_date  date not null,
  end_date    date not null,
  created_at  timestamptz not null default now()
);

-- ─── Bank Accounts ───────────────────────────────────────────────────────────
create table bank_accounts (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique,
  is_active  boolean not null default true
);

-- ─── Categories ──────────────────────────────────────────────────────────────
create table categories (
  id               uuid primary key default uuid_generate_v4(),
  name_pt          text not null unique,
  name_en          text not null,
  classification   classification not null,
  group_pt         text not null,
  group_en         text not null,
  description_pt   text,
  description_en   text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

-- ─── Transactions ────────────────────────────────────────────────────────────
create table transactions (
  id               uuid primary key default uuid_generate_v4(),
  school_year_id   uuid not null references school_years(id),
  category_id      uuid not null references categories(id),
  bank_account_id  uuid not null references bank_accounts(id),
  date             date not null,
  month_label      text not null,      -- "set.25"
  amount           numeric(12,2) not null,
  description      text not null default '',
  created_by       uuid not null references profiles(id),
  created_at       timestamptz not null default now()
);
create index idx_transactions_school_year on transactions(school_year_id);
create index idx_transactions_date        on transactions(date);
create index idx_transactions_category    on transactions(category_id);

-- ─── Budget Entries ──────────────────────────────────────────────────────────
create table budget_entries (
  id               uuid primary key default uuid_generate_v4(),
  school_year_id   uuid not null references school_years(id),
  category_id      uuid not null references categories(id),
  month            integer not null check (month between 1 and 12),
  planned_amount   numeric(12,2) not null default 0,
  unique (school_year_id, category_id, month)
);

-- ─── Children ────────────────────────────────────────────────────────────────
create table children (
  id              uuid primary key default uuid_generate_v4(),
  full_name       text not null,
  school_year_id  uuid not null references school_years(id),
  tuition_type    text not null,
  is_active       boolean not null default true
);

-- ─── Meal Pricing ────────────────────────────────────────────────────────────
create table meal_pricing (
  id              uuid primary key default uuid_generate_v4(),
  school_year_id  uuid not null references school_years(id),
  meal_type       meal_type not null,
  school_cost     numeric(10,2) not null,
  parent_price    numeric(10,2) not null,
  unique (school_year_id, meal_type)
);

-- ─── Meal Records ────────────────────────────────────────────────────────────
create table meal_records (
  id          uuid primary key default uuid_generate_v4(),
  child_id    uuid not null references children(id),
  date        date not null,
  meal_type   meal_type not null,
  billed      boolean not null default false,
  created_by  uuid not null references profiles(id),
  created_at  timestamptz not null default now()
);
create index idx_meal_records_child on meal_records(child_id);
create index idx_meal_records_date  on meal_records(date);

-- ─── Salary Entries ──────────────────────────────────────────────────────────
create table salary_entries (
  id                     uuid primary key default uuid_generate_v4(),
  school_year_id         uuid not null references school_years(id),
  person_name            text not null,
  salary_type            salary_type not null,
  service_name           text,
  base_amount            numeric(12,2) not null,
  month                  integer not null check (month between 1 and 12),
  actual_amount          numeric(12,2) not null,
  linked_transaction_id  uuid references transactions(id),
  created_at             timestamptz not null default now()
);

-- ─── Row Level Security ──────────────────────────────────────────────────────
alter table profiles        enable row level security;
alter table transactions     enable row level security;
alter table budget_entries   enable row level security;
alter table categories       enable row level security;
alter table children         enable row level security;
alter table meal_records     enable row level security;
alter table salary_entries   enable row level security;
alter table school_years     enable row level security;
alter table bank_accounts    enable row level security;
alter table meal_pricing     enable row level security;

-- Helper: get current user role
create or replace function current_user_role()
returns role language sql security definer stable as $$
  select role from profiles where id = auth.uid()
$$;

-- All authenticated users can read reference data
create policy "read_categories"    on categories    for select using (auth.uid() is not null);
create policy "read_school_years"  on school_years  for select using (auth.uid() is not null);
create policy "read_bank_accounts" on bank_accounts for select using (auth.uid() is not null);
create policy "read_profiles"      on profiles      for select using (auth.uid() is not null);

-- Transactions: all auth users read; admin+staff write
create policy "read_transactions"   on transactions for select using (auth.uid() is not null);
create policy "write_transactions"  on transactions for insert with check (current_user_role() in ('admin', 'staff'));
create policy "delete_transactions" on transactions for delete using (current_user_role() = 'admin');

-- Budget: all read; admin write
create policy "read_budget"  on budget_entries for select using (auth.uid() is not null);
create policy "write_budget" on budget_entries for all    using (current_user_role() = 'admin');

-- Categories: all read; admin write
create policy "write_categories" on categories for all using (current_user_role() = 'admin');

-- Children: all auth read; admin+staff write
create policy "read_children"  on children for select using (auth.uid() is not null);
create policy "write_children" on children for all    using (current_user_role() in ('admin', 'staff'));

-- Meals: all auth read; admin+staff write
create policy "read_meals"  on meal_records for select using (auth.uid() is not null);
create policy "write_meals" on meal_records for all    using (current_user_role() in ('admin', 'staff'));
create policy "read_pricing"  on meal_pricing for select using (auth.uid() is not null);
create policy "write_pricing" on meal_pricing for all    using (current_user_role() = 'admin');

-- Salaries: all auth read; admin write
create policy "read_salaries"  on salary_entries for select using (auth.uid() is not null);
create policy "write_salaries" on salary_entries for all    using (current_user_role() = 'admin');
