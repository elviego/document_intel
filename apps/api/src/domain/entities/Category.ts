export type CategoryId = string

export type Classification = 'receita' | 'despesa'

export interface Category {
  id: CategoryId
  namePt: string
  nameEn: string
  classification: Classification
  groupPt: string
  groupEn: string
  descriptionPt: string | null
  descriptionEn: string | null
  isActive: boolean
  createdAt: Date
}

export interface CreateCategoryInput {
  namePt: string
  nameEn: string
  classification: Classification
  groupPt: string
  groupEn: string
  descriptionPt?: string
  descriptionEn?: string
}
