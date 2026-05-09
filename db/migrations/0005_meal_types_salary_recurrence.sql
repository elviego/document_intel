-- ── Meal types (replaces the fixed enum) ─────────────────────────────────────────────────────────────────────────────────
CREATE TABLE meal_types (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text          NOT NULL,
  description    text,
  meals_per_week integer       NOT NULL DEFAULT 5 CHECK (meals_per_week >= 1 AND meals_per_week <= 5),
  parent_price   numeric(10,2) NOT NULL DEFAULT 0,
  school_cost    numeric(10,2) NOT NULL DEFAULT 0,
  is_active      boolean       NOT NULL DEFAULT true,
  created_at     timestamp     NOT NULL DEFAULT now()
);

INSERT INTO meal_types (name, description, meals_per_week) VALUES
  ('Almoço com Sopa',  'Refeição completa com sopa', 5),
  ('Almoço sem Sopa',  'Refeição sem sopa', 5);

-- ── Child meal plan history ─────────────────────────────────────────────────────────────────────────────────
CREATE TABLE child_meal_plans (
  id            uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id      uuid  NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  meal_type_id  uuid  NOT NULL REFERENCES meal_types(id),
  start_date    date  NOT NULL,
  end_date      date,
  created_at    timestamp NOT NULL DEFAULT now()
);

ALTER TABLE meal_records ADD COLUMN meal_type_id uuid REFERENCES meal_types(id);

ALTER TABLE salary_entries
  ADD COLUMN recurrence text NOT NULL DEFAULT 'monthly';

ALTER TABLE salary_entries
  ALTER COLUMN month DROP NOT NULL,
  ALTER COLUMN month SET DEFAULT NULL;
