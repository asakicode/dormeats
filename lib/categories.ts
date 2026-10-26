export type Category = 'restaurant' | 'life' | 'delivery' | 'question'

export const CATEGORY_LABEL: Record<Category, string> = {
  restaurant: '식당',
  life: '생활',
  delivery: '택배',
  question: '질문',
}

export function getCategoryLabel(category: string | null): string {
  if (category && category in CATEGORY_LABEL) {
    return CATEGORY_LABEL[category as Category]
  }
  return '기타'
}
