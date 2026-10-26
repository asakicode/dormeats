const PAGE_SIZE = 1000

type Page<T> = { data: T[] | null; error: { message: string } | null }

// supabase 기본 조회 한도(1000행)를 넘는 테이블을 나눠서 모두 가져온다
// fetchPage(from, to)는 .range(from, to)를 붙인 조회를 돌려준다
export async function fetchAllRows<T>(fetchPage: (from: number, to: number) => PromiseLike<Page<T>>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return rows
  }
}
