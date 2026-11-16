import { useEffect, useState } from "react"
import { errorMessage, reportsApi } from "@/api"
import type { ReportDetail, ReportListItem } from "@/api"
import type { Page } from "@/types/common"
import type { Account } from "@/features/auth/types"

// 마이페이지의 저장된 리포트 목록(RPT-03)·상세(RPT-04)·PDF(RPT-05).
export function useSavedReports(account: Account | null, page: Page, onUnauthorized: (err: unknown, destination: Page) => boolean) {
  const [items, setItems] = useState<ReportListItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [detail, setDetail] = useState<ReportDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = async (cursor: string | null = null) => {
    setLoading(true)
    setError("")
    try {
      const res = await reportsApi.list({ size: 10, cursor })
      setItems((prev) => (cursor ? [...prev, ...res.items] : res.items))
      setNextCursor(res.hasNext ? res.nextCursor : null)
    } catch (err) {
      if (!onUnauthorized(err, "mypage")) setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }
  // 마이페이지에 들어올 때마다 목록을 새로 불러옵니다.
  useEffect(() => {
    if (!account) { setItems([]); setDetail(null); return }
    if (page !== "mypage") return
    setDetail(null)
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, page])

  const open = async (reportId: number) => {
    setDetailLoading(true)
    setError("")
    try { setDetail(await reportsApi.get(reportId)) } catch (err) { if (!onUnauthorized(err, "mypage")) setError(errorMessage(err)) } finally { setDetailLoading(false) }
  }
  const close = () => setDetail(null)
  const downloadPdf = async (reportId: number) => {
    try { await reportsApi.downloadPdf(reportId) } catch (err) { if (!onUnauthorized(err, "mypage")) setError(errorMessage(err)) }
  }
  return { items, nextCursor, loading, error, detail, detailLoading, loadMore: () => load(nextCursor), open, close, downloadPdf }
}
export type SavedReports = ReturnType<typeof useSavedReports>
