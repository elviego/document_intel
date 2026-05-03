-- employees table
CREATE TABLE employees (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT NOT NULL,
  position      TEXT NOT NULL DEFAULT '',
  contract_type TEXT NOT NULL DEFAULT 'contrato',
  email         TEXT,
  phone         TEXT,
  nif           TEXT,
  iban          TEXT,
  base_salary   NUMERIC(12,2) NOT NULL DEFAULT 0,
  start_date    DATE,
  end_date      DATE,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  notes         TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- activities table
CREATE TABLE activities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_year_id UUID NOT NULL REFERENCES school_years(id),
  name          TEXT NOT NULL,
  description   TEXT,
  schedule      TEXT,
  capacity      INTEGER,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- student_activities junction table
CREATE TABLE student_activities (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  activity_id  UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  enrolled_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, activity_id)
);
