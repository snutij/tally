import type { Category } from "../../domain/value-object/category.js";

export interface CategoryDto {
  readonly group: string;
  readonly id: string;
  readonly name: string;
}

export function toCategoryDto(category: Category): CategoryDto {
  return {
    group: category.group,
    id: category.id as string,
    name: category.name,
  };
}
