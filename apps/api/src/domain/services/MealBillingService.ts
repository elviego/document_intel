import type { MealRecord, MealPricing } from '../entities/MealRecord.js'
import type { ChildMonthlyBilling } from '../repositories/IMealRepository.js'

/**
 * Pure domain service — no I/O, no framework dependencies.
 * Calculates per-child monthly billing from meal records and pricing config.
 */
export class MealBillingService {
  calculate(
    records: MealRecord[],
    pricing: MealPricing[],
    children: { id: string; fullName: string }[],
    month: number,
    year: number,
  ): ChildMonthlyBilling[] {
    const pricingMap = Object.fromEntries(pricing.map(p => [p.mealType, p]))

    const grouped = new Map<string, { withSoup: number; withoutSoup: number }>()

    for (const r of records) {
      const d = new Date(r.date)
      if (d.getMonth() + 1 !== month || d.getFullYear() !== year) continue
      const entry = grouped.get(r.childId) ?? { withSoup: 0, withoutSoup: 0 }
      if (r.mealType === 'com_sopa') entry.withSoup++
      else entry.withoutSoup++
      grouped.set(r.childId, entry)
    }

    return children
      .filter(c => grouped.has(c.id))
      .map(c => {
        const counts = grouped.get(c.id)!
        const withSoupP  = pricingMap['com_sopa']
        const withoutP   = pricingMap['sem_sopa']
        const schoolCost =
          counts.withSoup * (withSoupP?.schoolCost ?? 0) +
          counts.withoutSoup * (withoutP?.schoolCost ?? 0)
        const parentCharge =
          counts.withSoup * (withSoupP?.parentPrice ?? 0) +
          counts.withoutSoup * (withoutP?.parentPrice ?? 0)

        return {
          childId: c.id,
          childName: c.fullName,
          month,
          year,
          withSoupCount: counts.withSoup,
          withoutSoupCount: counts.withoutSoup,
          schoolCost,
          parentCharge,
        }
      })
  }
}
