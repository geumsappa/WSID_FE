// 저장 리포트 API (RPT-02~05). 로그인 필요. 여기서 id는 전부 reportId예요 (훈련 ID 아님).
import { request } from "./client"
import { USE_MOCK } from "./config"
import { ENDPOINTS } from "./endpoints"
import { recordsMock } from "./mock/recordsMock"
import type { ReportDetail, ReportListResponse, SaveReportResponse } from "./types"

const E = ENDPOINTS.reports

export const reportsApi = {
  /** RPT-02 내 리포트에 저장. 저장하면 서버가 훈련 대화 원문을 지워요 */
  save: (reportId: number): Promise<SaveReportResponse> =>
    USE_MOCK ? recordsMock.save(reportId) : request(E.save(reportId), { method: "POST", csrf: true }),

  /** RPT-03 저장된 리포트 목록 (최신순). 다음 쪽은 응답의 nextCursor를 넘기세요 */
  list: (params: { size?: number; cursor?: string | null } = {}): Promise<ReportListResponse> =>
    USE_MOCK ? recordsMock.list(params)
      : request(E.list, { query: { size: params.size ?? 10, cursor: params.cursor } }),

  /** RPT-04 저장된 리포트 상세 */
  get: (reportId: number): Promise<ReportDetail> => (USE_MOCK ? recordsMock.get(reportId) : request(E.detail(reportId))),

  /** RPT-05 PDF 다운로드: 파일을 받아 브라우저 다운로드까지 실행 */
  downloadPdf: async (reportId: number, fileName = "training-report.pdf"): Promise<void> => {
    const blob = USE_MOCK ? await recordsMock.pdf(reportId) : await request<Blob>(E.pdf(reportId), { responseType: "blob" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  },
}
