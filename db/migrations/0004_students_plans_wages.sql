-- ── Enrollment plans ──────────────────────────────────────────────────────────
CREATE TABLE enrollment_plans (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text        NOT NULL,
  description      text,
  -- 'full_time' | 'part_time_days' | 'part_time_mornings' | 'holiday' | 'custom'
  schedule_type    text        NOT NULL DEFAULT 'custom',
  days_per_week    integer,
  mornings_only    boolean     NOT NULL DEFAULT false,
  -- 'monthly' | 'trimestral' | 'annual'
  billing_cycle    text        NOT NULL DEFAULT 'monthly',
  base_amount      numeric(10,2) NOT NULL DEFAULT 0,
  discount_percent numeric(5,2),
  discount_fixed   numeric(10,2),
  is_preset        boolean     NOT NULL DEFAULT false,
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamp   NOT NULL DEFAULT now()
);

INSERT INTO enrollment_plans (name, description, schedule_type, days_per_week, mornings_only, billing_cycle, is_preset) VALUES
  ('Tempo Integral',       'Todos os dias úteis (5 dias/semana)',            'full_time',          5,    false, 'monthly', true),
  ('Part-time — 3 dias',  '3 dias por semana à escolha',                    'part_time_days',     3,    false, 'monthly', true),
  ('Só de Manhãs',         'Todos os dias úteis, apenas período da manhã',   'part_time_mornings', 5,    true,  'monthly', true),
  ('Plano Férias',         'Frequência em períodos de férias escolares',      'holiday',            null, false, 'monthly', true);

-- ── Extend children with full student profile ─────────────────────────────────
ALTER TABLE children
  ADD COLUMN first_name         text,
  ADD COLUMN last_name          text,
  ADD COLUMN birth_date         date,
  ADD COLUMN nationality        text DEFAULT 'Portuguesa',
  ADD COLUMN nif                text,
  ADD COLUMN address            text,
  ADD COLUMN blood_type         text,
  ADD COLUMN allergies          text,
  ADD COLUMN medical_notes      text,
  ADD COLUMN photo_consent      boolean NOT NULL DEFAULT false,
  ADD COLUMN enrollment_date    date,
  ADD COLUMN plan_id            uuid REFERENCES enrollment_plans(id),
  ADD COLUMN parent1_first_name text,
  ADD COLUMN parent1_last_name  text,
  ADD COLUMN parent1_phone      text,
  ADD COLUMN parent1_email      text,
  ADD COLUMN parent1_relation   text DEFAULT 'Mãe/Pai',
  ADD COLUMN parent2_first_name text,
  ADD COLUMN parent2_last_name  text,
  ADD COLUMN parent2_phone      text,
  ADD COLUMN parent2_email      text,
  ADD COLUMN parent2_relation   text,
  ADD COLUMN emergency_contact  text,
  ADD COLUMN emergency_phone    text,
  ADD COLUMN notes              text;

-- ── Wages ─────────────────────────────────────────────────────────────────────
CREATE TABLE wages (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         uuid          NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  effective_from      date          NOT NULL DEFAULT CURRENT_DATE,
  gross_amount        numeric(12,2) NOT NULL,
  -- 'sem_termo' | 'a_termo' | 'rec_verdes' | 'horas'
  contract_type       text          NOT NULL DEFAULT 'sem_termo',
  -- 'nao_casado' | 'casado_2_titulares' | 'casado_1_titular'
  marital_status      text          NOT NULL DEFAULT 'nao_casado',
  dependents          integer       NOT NULL DEFAULT 0,
  irs_rate            numeric(6,4)  NOT NULL DEFAULT 0,
  irs_amount          numeric(12,2) NOT NULL DEFAULT 0,
  ss_employee_rate    numeric(6,4)  NOT NULL DEFAULT 0,
  ss_employee_amount  numeric(12,2) NOT NULL DEFAULT 0,
  ss_employer_rate    numeric(6,4)  NOT NULL DEFAULT 0,
  ss_employer_amount  numeric(12,2) NOT NULL DEFAULT 0,
  net_amount          numeric(12,2) NOT NULL DEFAULT 0,
  total_employer_cost numeric(12,2) NOT NULL DEFAULT 0,
  notes               text,
  created_at          timestamp     NOT NULL DEFAULT now()
);
