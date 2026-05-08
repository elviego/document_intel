/**
 * Portuguese IRS (Income Tax) Withholding Calculator — Continente 2026
 *
 * Source: Despacho SEAF 2026 / Tabelas_RF_Continente_2026.xlsx
 * https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/tabela_ret_doclib/
 *
 * Formula: retenção = rendimento_bruto × taxa − parcela_abater − (dependents × deducao_dep)
 * Values below are based on Tabela I (não casado / casado 2 titulares) and
 * Tabela III (casado 1 titular) — verify annually against the official Excel.
 */

type Bracket = { upTo: number; rate: number; deduct: number }

// Tabela I — Não casado / Casado 2 titulares
const TABLE_STANDARD: Bracket[] = [
  { upTo: 820,       rate: 0,      deduct: 0       },
  { upTo: 937,       rate: 0.133,  deduct: 109.06  },
  { upTo: 1_019,     rate: 0.177,  deduct: 150.64  },
  { upTo: 1_123,     rate: 0.210,  deduct: 184.24  },
  { upTo: 1_765,     rate: 0.242,  deduct: 220.20  },
  { upTo: 2_057,     rate: 0.294,  deduct: 311.88  },
  { upTo: 2_664,     rate: 0.320,  deduct: 365.30  },
  { upTo: 3_193,     rate: 0.350,  deduct: 445.22  },
  { upTo: 4_051,     rate: 0.375,  deduct: 525.14  },
  { upTo: 12_000,    rate: 0.420,  deduct: 707.56  },
  { upTo: Infinity,  rate: 0.450,  deduct: 1_067.56 },
]

// Tabela III — Casado 1 titular (lower withholding due to family quotient)
const TABLE_MARRIED_SINGLE_HOLDER: Bracket[] = [
  { upTo: 820,       rate: 0,      deduct: 0       },
  { upTo: 937,       rate: 0.096,  deduct: 78.77   },
  { upTo: 1_019,     rate: 0.153,  deduct: 132.10  },
  { upTo: 1_123,     rate: 0.184,  deduct: 163.68  },
  { upTo: 1_765,     rate: 0.211,  deduct: 193.95  },
  { upTo: 2_057,     rate: 0.260,  deduct: 280.50  },
  { upTo: 2_664,     rate: 0.284,  deduct: 329.84  },
  { upTo: 3_193,     rate: 0.315,  deduct: 412.46  },
  { upTo: 4_051,     rate: 0.344,  deduct: 504.94  },
  { upTo: 12_000,    rate: 0.395,  deduct: 711.44  },
  { upTo: Infinity,  rate: 0.430,  deduct: 1_131.44 },
]

// Monthly withholding reduction per dependent (Art. 99-C CIRS, Tabela II/IV adjustments)
const MONTHLY_DEDUCTION_PER_DEPENDENT = 34.37

function lookupBracket(table: Bracket[], gross: number) {
  return table.find(b => gross <= b.upTo) ?? table[table.length - 1]
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export interface WageComponents {
  grossAmount: number
  irsRate: number
  irsAmount: number
  ssEmployeeRate: number
  ssEmployeeAmount: number
  ssEmployerRate: number
  ssEmployerAmount: number
  netAmount: number
  totalEmployerCost: number
}

/**
 * Calculate all wage components from gross salary.
 *
 * contractType:
 *   'sem_termo'  — Contrato sem termo (permanent)          Cat. A: SS 11% / 23.75%, IRS table
 *   'a_termo'    — Contrato a termo (fixed-term)           Cat. A: SS 11% / 23.75%, IRS table
 *   'rec_verdes' — Prestação de serviços (freelance)       Cat. B: IRS 25% flat, no employer SS
 *   'horas'      — Horas extra / serviços pontuais         Cat. A: SS 11% / 23.75%, IRS table
 */
export function calculateWage(
  grossAmount: number,
  contractType: string,
  maritalStatus: string,
  dependents: number,
): WageComponents {
  let irsRate        = 0
  let irsAmount      = 0
  let ssEmployeeRate = 0
  let ssEmployerRate = 0

  if (contractType === 'rec_verdes') {
    // Prestação de serviços: 25% IRS flat withholding (Art. 101 CIRS)
    // SS paid by the freelancer directly (21.4% on 70% of income = ~15% effective)
    // Employer does not pay employer SS contributions
    irsRate        = 0.25
    irsAmount      = round2(grossAmount * 0.25)
    ssEmployeeRate = 0.214   // indicative — self-employed pay this themselves
    ssEmployerRate = 0
  } else {
    // Category A (trabalho dependente): Código do Trabalho
    ssEmployeeRate = 0.11    // TSU trabalhador
    ssEmployerRate = 0.2375  // TSU entidade patronal

    const table   = maritalStatus === 'casado_1_titular' ? TABLE_MARRIED_SINGLE_HOLDER : TABLE_STANDARD
    const bracket = lookupBracket(table, grossAmount)
    const raw     = grossAmount * bracket.rate - bracket.deduct - dependents * MONTHLY_DEDUCTION_PER_DEPENDENT
    irsAmount     = Math.max(0, round2(raw))
    irsRate       = grossAmount > 0 ? round2(irsAmount / grossAmount) : 0
  }

  const ssEmployeeAmount  = round2(grossAmount * ssEmployeeRate)
  const ssEmployerAmount  = round2(grossAmount * ssEmployerRate)
  const netAmount         = round2(grossAmount - irsAmount - ssEmployeeAmount)
  const totalEmployerCost = round2(grossAmount + ssEmployerAmount)

  return {
    grossAmount,
    irsRate,
    irsAmount,
    ssEmployeeRate,
    ssEmployeeAmount,
    ssEmployerRate,
    ssEmployerAmount,
    netAmount,
    totalEmployerCost,
  }
}
