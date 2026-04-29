import type { Category, CategoryId, CreateCategoryInput } from '../entities/Category'

export interface ICategoryRepository {
  findAll(includeInactive?: boolean): Promise<Category[]>
  findById(id: CategoryId): Promise<Category | null>
  findByNamePt(name: string): Promise<Category | null>
  create(input: CreateCategoryInput): Promise<Category>
  update(id: CategoryId, input: Partial<CreateCategoryInput & { isActive: boolean }>): Promise<Category>
  bulkUpsert(inputs: CreateCategoryInput[]): Promise<Category[]>
}
