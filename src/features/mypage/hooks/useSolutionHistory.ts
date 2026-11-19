import { useEffect, useState } from "react"
import { errorMessage, guidesApi, solutionApi } from "@/api"
import type { ResponseCard, SolutionDetail, SolutionListItem } from "@/api"
import type { Page } from "@/types/common"
import type { Account } from "@/features/auth/types"
import type { SituationKey } from "@/features/emergency/types"
import { dedupeMessages, situationOfText } from "@/features/emergency/lib/historyView"

/** 기록 보기 화면용 상담: 대화 + 그때 안내받은 대응 방법(유형 고정 안내 또는 서버 대응 카드) */
export type SolutionRecord = SolutionDetail & { title: string; situation: SituationKey | null; cardDetails: ResponseCard[] }

// 마이페이지 '긴급 대응 기록': 회원으로 마친 피해 대응 상담 목록(SOL-06 가안)과 대화 다시 보기(SOL-02).
export function useSolutionHistory(account: Account | null, page: Page, onUnauthorized: (err: unknown, destination: Page) => boolean) {
  const [items, setItems] = useState<SolutionListItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [detail, setDetail] = useState<SolutionRecord | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = async (cursor: string | null = null) => {
    setLoading(true)
    setError("")
    try {
      const res = await solutionApi.list({ size: 10, cursor })
      setItems((prev) => (cursor ? [...prev, ...res.items] : res.items))
      setNextCursor(res.hasNext ? res.nextCursor : null)
    } catch (err) {
      if (!onUnauthorized(err, "mypage")) setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    if (!account) { setItems([]); setDetail(null); return }
    if (page !== "mypage") return
    setDetail(null)
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, page])

  const open = async (item: SolutionListItem) => {
    setDetailLoading(true)
    setError("")
    try {
      const d = await solutionApi.detail(item.solutionId)
      const messages = dedupeMessages(d.messages)
      const situation = situationOfText(messages.find((m) => m.sender === "USER")?.content)
      // 유형 카드 상담이 아니면, 그때 받은 대응 카드 본문(GUIDE-03)을 불러와 함께 보여 줘요
      let cardDetails: ResponseCard[] = []
      if (!situation && d.responseCards.length) {
        try { cardDetails = await guidesApi.responseCards(d.responseCards.map((c) => c.code)) } catch { /* 제목만 보여 줌 */ }
      }
      setDetail({ ...d, messages, title: item.title, situation, cardDetails })
    } catch (err) {
      if (!onUnauthorized(err, "mypage")) setError(errorMessage(err))
    } finally {
      setDetailLoading(false)
    }
  }
  return { items, nextCursor, loading, error, detail, detailLoading, loadMore: () => load(nextCursor), open, close: () => setDetail(null) }
}
export type SolutionHistory = ReturnType<typeof useSolutionHistory>
