export type Category = 'restaurant' | 'life' | 'delivery' | 'question'

type CategoryStyleValue = {
  label: string
  bg: string
  text: string
  activeBg: string
}

export const CATEGORY_STYLE: Record<Category, CategoryStyleValue> = {
  restaurant: {
    label: '식당',
    bg: 'bg-[#FBE4E4]',
    text: 'text-[#B5473F]',
    activeBg: 'bg-[#B5473F]',
  },
  life: {
    label: '생활',
    bg: 'bg-[#FFF1DC]',
    text: 'text-[#B5751F]',
    activeBg: 'bg-[#B5751F]',
  },
  delivery: {
    label: '택배',
    bg: 'bg-[#E3EDF3]',
    text: 'text-[#3F6280]',
    activeBg: 'bg-[#3F6280]',
  },
  question: {
    label: '질문',
    bg: 'bg-[#EEF2E4]',
    text: 'text-[#5C6B3A]',
    activeBg: 'bg-[#5C6B3A]',
  },
}

export function getCategoryLabel(category: string | null): string {
  if (category && category in CATEGORY_STYLE) {
    return CATEGORY_STYLE[category as Category].label
  }
  return '기타'
}