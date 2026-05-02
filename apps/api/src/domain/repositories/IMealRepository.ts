import type { MealRecord, MealPricing, MealType, Child } from '../entities/MealRecord.js'

export interface IMealRepository {
  findRecords(childId?: string, from?: Date, to?: Date): Promise<MealRecord[]>
  createRecord(input: Omit<MealRecord, 'id' | 'createdAt'>): Promise<MealRecord>
  deleteRecord(id: string): Promise<void>

  findPricing(schoolYearId: string): Promise<MealPricing[]>
  upsertPricing(input: Omit<MealPricing, 'id'>): Promise<MealPricing>

  findChildren(schoolYearId: string): Promise<Child[]>
  createChild(input: Omit<Child, 'id'>): Promise<Child>
  updateChild(id: string, input: Partial<Omit<Child, 'id'>>): Promise<Child>
}

export interface ChildMonthlyBilling {
  childId: string
  childName: string
  month: number
  year: number
  withSoupCount: number
  withoutSoupCount: number
  schoolCost: number
  parentCharge: number
}
