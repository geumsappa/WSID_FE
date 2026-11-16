// 서버 없이 리포트 저장(RPT-02~05)을 흉내 냅니다. 저장한 리포트는 계정별로 localStorage에 남아요.
import { readStore } from "@/lib/storage"
import { errorFromCode } from "../client"
import type { ReportDetail, ReportListItem, ReportListResponse, SaveReportResponse, TrainingReport } from "../types"
import { requireMockUser } from "./authMock"
import { delay } from "./delay"
import { trainingsMock } from "./trainingsMock"

type Saved = TrainingReport & { savedAt: string }
const key = (email: string) => `wsid-mock-reports-v2-${email}`
const load = (email: string) => readStore<Saved[]>(key(email), [])

export const recordsMock = {
  async save(reportId: number): Promise<SaveReportResponse> {
    await delay(200)
    const user = requireMockUser()
    const already = load(user.email).find((r) => r.reportId === reportId)
    if (already) return { reportId, saved: true, savedAt: already.savedAt }
    const t = trainingsMock._findReport(reportId, user.email)
    if (!t?.report) throw errorFromCode(404, "REPORT_NOT_FOUND")
    const savedAt = new Date().toISOString()
    t.report.saved = true
    t.messages = [] // 노션: 저장하면 훈련 대화 원문 삭제
    localStorage.setItem(key(user.email), JSON.stringify([{ ...t.report, savedAt }, ...load(user.email)]))
    return { reportId, saved: true, savedAt }
  },
  async list(params: { size?: number; cursor?: string | null }): Promise<ReportListResponse> {
    await delay(200)
    const all = load(requireMockUser().email)
    const start = params.cursor ? Number(params.cursor) : 0
    const size = params.size ?? 10
    const items: ReportListItem[] = all.slice(start, start + size).map((r) => ({ reportId: r.reportId, title: r.title, fraudTypeCode: r.fraudTypeCode, completedAt: r.savedAt }))
    const hasNext = start + size < all.length
    return { items, nextCursor: hasNext ? String(start + size) : null, hasNext }
  },
  async get(reportId: number): Promise<ReportDetail> {
    await delay(150)
    const r = load(requireMockUser().email).find((x) => x.reportId === reportId)
    if (!r) throw errorFromCode(404, "REPORT_NOT_FOUND")
    const { strengths: _s, improvements: _i, ...evaluation } = r.evaluation
    return { reportId: r.reportId, title: r.title, saved: true, evaluation }
  },
  async pdf(reportId: number): Promise<Blob> {
    const r = await recordsMock.get(reportId)
    return new Blob([JSON.stringify(r, null, 2)], { type: "application/json" }) // mock은 PDF 대신 JSON 파일
  },
}
