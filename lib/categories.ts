export type Category = 'restaurant' | 'life' | 'delivery' | 'question'

type CategoryStyleValue = {
  label: string
  bg: string
  text: string
  border: string
  activeBg: string
}

export const CATEGORY_STYLE: Record<Category, CategoryStyleValue> = {
  restaurant: {
    label: '식당',
    bg: 'bg-[#FBE4E4] dark:bg-transparent',
    text: 'text-[#B5473F] dark:text-[#d7675f]',
    border: 'border-transparent dark:border-[#d7675f]/45',
    activeBg: 'bg-[#B5473F]',
  },
  life: {
    label: '생활',
    bg: 'bg-[#FFF1DC] dark:bg-transparent',
    text: 'text-[#B5751F] dark:text-[#eb992b]',
    border: 'border-transparent dark:border-[#eb992b]/45',
    activeBg: 'bg-[#B5751F]',
  },
  delivery: {
    label: '택배',
    bg: 'bg-[#E3EDF3] dark:bg-transparent',
    text: 'text-[#3F6280] dark:text-[#4685bb]',
    border: 'border-transparent dark:border-[#4685bb]/45',
    activeBg: 'bg-[#3F6280]',
  },
  question: {
    label: '질문',
    bg: 'bg-[#EEF2E4] dark:bg-transparent',
    text: 'text-[#5C6B3A] dark:text-[#86a443]',
    border: 'border-transparent dark:border-[#86a443]/45',
    activeBg: 'bg-[#5C6B3A]',
  },
}

export function getCategoryLabel(category: string | null): string {
  if (category && category in CATEGORY_STYLE) {
    return CATEGORY_STYLE[category as Category].label
  }
  return '기타'
}