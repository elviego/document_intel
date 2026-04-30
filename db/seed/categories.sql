-- Seed: all 39 categories extracted from the RD sheet
-- Run after migration 0001

insert into categories (name_pt, name_en, classification, group_pt, group_en, description_pt, description_en) values

-- ─── Despesas › Infraestrutura/Materiais ─────────────────────────────────────
('Aluguer',              'Rent',                   'despesa', 'Infraestrutura/Materiais', 'Infrastructure/Materials', 'Renda do espaço',                        'Space rental'),
('Estrutura Física',     'Physical Structure',     'despesa', 'Infraestrutura/Materiais', 'Infrastructure/Materials', 'Coisas grandes de compra, toldos, etc.', 'Large purchases, awnings, etc.'),
('Móveis / Organização', 'Furniture/Organisation', 'despesa', 'Infraestrutura/Materiais', 'Infrastructure/Materials', 'Móveis, mesas, bancos, caixas, loiças',  'Furniture, tables, benches, boxes'),
('Material Espaço',      'Space Materials',        'despesa', 'Infraestrutura/Materiais', 'Infrastructure/Materials', 'Manutenção, construção, madeiras',       'Maintenance, construction, wood'),
('Material Montessori/FS','Montessori/FS Materials','despesa','Infraestrutura/Materiais', 'Infrastructure/Materials', 'Material pedagógico',                    'Pedagogical materials'),

-- ─── Despesas › Ordenados e Impostos ─────────────────────────────────────────
('Impostos',             'Taxes',                  'despesa', 'Ordenados e Impostos', 'Salaries & Taxes', null, null),
('Ordenado - Contrato',  'Salary - Contract',      'despesa', 'Ordenados e Impostos', 'Salaries & Taxes', null, null),
('Ordenado - Rec. Verdes','Salary - Freelance',    'despesa', 'Ordenados e Impostos', 'Salaries & Taxes', null, null),
('Pagamento a Terceiros', 'Third-party Payment',   'despesa', 'Ordenados e Impostos', 'Salaries & Taxes', 'Yoga, Música, Artes',  'Yoga, Music, Arts'),
('Pagamento de Horas',   'Hourly Payment',         'despesa', 'Ordenados e Impostos', 'Salaries & Taxes', 'Aniversários, playgroups, eventos, faturação', 'Birthdays, playgroups, events'),

-- ─── Despesas › Outros ───────────────────────────────────────────────────────
('Consumíveis',          'Consumables',            'despesa', 'Outros', 'Others', 'Detergentes, material de papelaria', 'Detergents, stationery'),
('Contabilista',         'Accountant',             'despesa', 'Outros', 'Others', null, null),
('Seguro Crianças',      'Children Insurance',     'despesa', 'Outros', 'Others', 'Crianças', 'Children'),
('Licenciamento / Subscrições','Licensing/Subscriptions','despesa','Outros','Others','Educabizz, Instagram, Google, NOS','Educabizz, Instagram, Google, NOS'),
('Limpeza',              'Cleaning',               'despesa', 'Outros', 'Others', 'Limpeza TB 1 x semana', 'Cleaning 1x/week'),
('Gasóleo',              'Diesel',                 'despesa', 'Outros', 'Others', null, null),
('Outros',               'Others',                 'despesa', 'Outros', 'Others', 'Despesas várias', 'Miscellaneous expenses'),
('Animais',              'Animals',                'despesa', 'Outros', 'Others', 'Veterinário, ração, petsitting, limpeza', 'Vet, food, petsitting, cleaning'),
('Seguros',              'Insurance',              'despesa', 'Outros', 'Others', 'Espaço, colaboradores', 'Space, staff'),
('Catering',             'Catering',               'despesa', 'Outros', 'Others', 'Sem Espiga - pagamento de fatura', 'Sem Espiga - invoice payment'),
('Despesas Investimento','Investment Expenses',    'despesa', 'Outros', 'Others', null, null),
('Visitas de Estudo Despesa','Study Trip Expenses','despesa', 'Outros', 'Others', 'Transportes, bilhetes', 'Transport, tickets'),
('Segurança e medicina no trabalho','Occupational Health & Safety','despesa','Outros','Others', null, null),

-- ─── Receitas › Mensalidade ──────────────────────────────────────────────────
('Mensalidade (Full Time)',   'Tuition (Full Time)',    'receita', 'Mensalidade', 'Tuition', null, null),
('Mensalidade (Sexta-Feira)', 'Tuition (Friday)',       'receita', 'Mensalidade', 'Tuition', null, null),
('Mensalidade (3x Semana)',   'Tuition (3x/week)',      'receita', 'Mensalidade', 'Tuition', null, null),
('Mensalidade (1 Manhã)',     'Tuition (1 Morning)',    'receita', 'Mensalidade', 'Tuition', null, null),
('Programa Férias',           'Holiday Programme',      'receita', 'Mensalidade', 'Tuition', null, null),
('Serviços Terceiros',        'Third-party Services',   'receita', 'Mensalidade', 'Tuition', 'Pagamento yoga, música, etc - pais', 'Yoga, music, etc - parents'),

-- ─── Receitas › Outros ───────────────────────────────────────────────────────
('Inscrição Anual',      'Annual Enrolment',       'receita', 'Outros', 'Others', 'Pagamento anual', 'Annual payment'),
('Material Escolar Anual','Annual School Materials','receita', 'Outros', 'Others', 'Pagamento anual', 'Annual payment'),
('Alimentação',          'Meals',                  'receita', 'Outros', 'Others', 'Sem Espiga - pagamento dos pais', 'Sem Espiga - parent payment'),
('Outros Recebimentos',  'Other Receipts',         'receita', 'Outros', 'Others', 'Alugueres de espaço', 'Space rental income'),
('Atividades Extra',     'Extra Activities',       'receita', 'Outros', 'Others', 'Yoga, Música, Artes - pais', 'Yoga, Music, Arts - parents'),
('Aniversários',         'Birthdays',              'receita', 'Outros', 'Others', 'Festas no espaço', 'Parties at the space'),
('Visita de Estudo',     'Study Trip',             'receita', 'Outros', 'Others', 'Saídas TB - pais', 'TB outings - parents'),
('Workshops',            'Workshops',              'receita', 'Outros', 'Others', 'Workshops TB', 'TB workshops'),
('Playgroup',            'Playgroup',              'receita', 'Outros', 'Others', 'Playgroup TB', 'TB playgroup')

on conflict (name_pt) do update set
  name_en         = excluded.name_en,
  classification  = excluded.classification,
  group_pt        = excluded.group_pt,
  group_en        = excluded.group_en,
  description_pt  = excluded.description_pt,
  description_en  = excluded.description_en;

-- ─── Bank Accounts ───────────────────────────────────────────────────────────
insert into bank_accounts (name) values
  ('AB Vanda'),
  ('CGD')
on conflict (name) do nothing;

-- ─── School Year 2025-26 ─────────────────────────────────────────────────────
insert into school_years (name, start_date, end_date) values
  ('2025-26', '2025-09-01', '2026-08-31')
on conflict (name) do nothing;
