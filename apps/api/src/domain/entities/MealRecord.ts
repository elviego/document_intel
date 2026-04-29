export type MealType = 'com_sopa' | 'sem_sopa'

export interface MealRecord {
  id: string
  childId: string
  date: Date
  mealType: MealType
  billed: boolean
  createdBy: string
  createdAt: Date
}

export interface MealPricing {
  id: string
  schoolYearId: string
  mealType: MealType
  schoolCost: number  // cost to the school
  parentPrice: number // charged to parents (school_cost × markup)
}

export interface Child {
  id: string
  fullName: string
  schoolYearId: string
  tuitionType: string
  isActive: boolean
}
