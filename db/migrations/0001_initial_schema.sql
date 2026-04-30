-- Migration: 0001_initial_schema
-- Plain PostgreSQL — no Supabase-specific extensions required.

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── Enums ───────────────────────────────────────────────────────────────────
create type role           as enum ('admin', 'staff', 'accountant');
create type classification as enum ('receita', 'despesa');
create type salary_type    as enum ('contrato', 'rec_verdes', 'horas', 'terceiros');
create type meal_type      as enum ('com_sopa', 'sem_sopa');

-- ─── Users (replaces Supabase auth.users) ────────────────────────────────────
create table users (
  id                uuid primary key default uuid_generate_v4(),
  email             text not null unique,
  password_hash     text,                    -- null until invite is accepted
  full_name         text not null default '',
  role              role not null default 'staff',
  invite_token      text unique,
  invite_expires_at timestamptz,
  is_active         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_users_email        on users(email);
create index idx_users_invite_token on users(invite_token);

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
  id        uuid primary key default uuid_generate_v4(),
  name      text not null unique,
  is_active boolean not null default true
);

-- ─── Categories ──────────────────────────────────────────────────────────────
create table categories (
  id             uuid primary key default uuid_generate_v4(),
  name_pt        text not null unique,
  name_en        text not null,
  classification classification not null,
  group_pt       text not null,
  group_en       text not null,
  description_pt text,
  description_en text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ─── Transactions ────────────────────────────────────────────────────────────
create table transactions (
  id              uuid primary key default uuid_generate_v4(),
  school_year_id  uuid not null references school_years(id),
  category_id     uuid not null references categories(id),
  bank_account_id uuid not null references bank_accounts(id),
  date            date not null,
  month_label     text not null,       -- "set.25"
  amount          numeric(12,2) not null,
  description     text not null default '',
  created_by      uuid not null references users(id),
  created_at      timestamptz not null default now()
);
create index idx_transactions_school_year on transactions(school_year_id);
create index idx_transactions_date        on transactions(date);
create index idx_transactions_category    on transactions(category_id);

-- ─── Budget Entries ──────────────────────────────────────────────────────────
create table budget_entries (
  id             uuid primary key default uuid_generate_v4(),
  school_year_id uuid not null references school_years(id),
  category_id    uuid not null references categories(id),
  month          integer not null check (month between 1 and 12),
  planned_amount numeric(12,2) not null default 0,
  unique (school_year_id, category_id, month)
);

-- ─── Children ────────────────────────────────────────────────────────────────
create table children (
  id             uuid primary key default uuid_generate_v4(),
  full_name      text not null,
  school_year_id uuid not null references school_years(id),
  tuition_type   text not null,
  is_active      boolean not null default true
);

-- ─── Meal Pricing ────────────────────────────────────────────────────────────
create table meal_pricing (
  id             uuid primary key default uuid_generate_v4(),
  school_year_id uuid not null references school_years(id),
  meal_type      meal_type not null,
  school_cost    numeric(10,2) not null,
  parent_price   numeric(10,2) not null,
  unique (school_year_id, meal_type)
);

-- ─── Meal Records ────────────────────────────────────────────────────────────
create table meal_records (
  id         uuid primary key default uuid_generate_v4(),
  child_id   uuid not null references children(id),
  date       date not null,
  meal_type  meal_type not null,
  billed     boolean not null default false,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);
create index idx_meal_records_child on meal_records(child_id);
create index idx_meal_records_date  on meal_records(date);

-- ─── Salary Entries ──────────────────────────────────────────────────────────
create table salary_entries (
  id                    uuid primary key default uuid_generate_v4(),
  school_year_id        uuid not null references school_years(id),
  person_name           text not null,
  salary_type           salary_type not null,
  service_name          text,
  base_amount           numeric(12,2) not null,
  month                 integer not null check (month between 1 and 12),
  actual_amount         numeric(12,2) not null,
  linked_transaction_id uuid references transactions(id),
  created_at            timestamptz not null default now()
);

-- ─── updated_at trigger for users ────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at
  before update on users
  for each row execute function set_updated_at();
