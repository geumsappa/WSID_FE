// 피해 대응 상담 API (SOL-01~05). 로그인 없이도 사용 가능 (비회원은 서버가 익명 세션 쿠키로 소유자를 구분).
// 순서: start(피해 설명) → message 여러 번(nextQuestion에 답하거나 글로 설명) / updateFacts(잘못 파악된 사실 정정) → complete
// 카드 상세 내용(행동·필요 자료)은 응답의 responseCards[].code로 guidesApi.responseCards(codes)를 불러 채워요.
import { newRequestId, request } from "./client"
import { TIMEOUT, USE_MOCK } from "./config"
import { ENDPOINTS } from "./endpoints"
import { solutionsMock } from "./mock/solutionsMock"
import type {
  CompleteSolutionResponse, SolutionDetail, SolutionListResponse, SolutionMessageRequest, SolutionMessageResponse,
  StartSolutionRequest, StartSolutionResponse, UpdateFactsRequest, UpdateFactsResponse,
} from "./types"

const E = ENDPOINTS.solutions

export const solutionApi = {
  /** SOL-01 상담 시작 (201). 피해 사실·대응 카드·다음 질문이 함께 와요 */
  start: (body: StartSolutionRequest): Promise<StartSolutionResponse> =>
    USE_MOCK ? solutionsMock.start(body) : request(E.start, { method: "POST", body, timeoutMs: TIMEOUT.aiTurn, csrf: E.csrf }),

  /** SOL-02 상담 복원 */
  detail: (solutionId: number): Promise<SolutionDetail> =>
    USE_MOCK ? solutionsMock.detail(solutionId) : request(E.detail(solutionId)),

  /**
   * SOL-03 상담 메시지.
   * - 사실 확인 질문에 답할 땐 { inputKind: "CHOICE", factKey, selectedCode }
   * - 글은 { inputKind: "TEXT", content, purpose } — purpose: FACT_UPDATE(상황 설명) / QUESTION(새 질문)
   *   / CLARIFICATION_ANSWER(AI 추가 질문에 대한 답, 응답으로 받은 questionId 함께)
   * 응답의 assistant에 AI 처리 결과가 와요. 추가 질문 문장은 nextQuestion에 와요. 실패 후 다시 보낼 땐 같은 requestId를 넘겨 중복 처리를 막아요.
   */
  message: (solutionId: number, body: SolutionMessageRequest, requestId = newRequestId()): Promise<SolutionMessageResponse> =>
    USE_MOCK ? solutionsMock.message(solutionId, body)
      : request(E.messages(solutionId), { method: "POST", body: { requestId, ...body }, timeoutMs: TIMEOUT.aiTurn, csrf: E.csrf }),

  /** SOL-04 피해 사실 정정. 바꿀 항목만 changes에 */
  /** 응답에 다음 질문(nextQuestion)과 전체 사실 기준 카드가 함께 와요. 409면 자동 재전송하지 말고 detail로 다시 불러오세요 */
  updateFacts: (solutionId: number, body: UpdateFactsRequest): Promise<UpdateFactsResponse> =>
    USE_MOCK ? solutionsMock.updateFacts(solutionId, body) : request(E.facts(solutionId), { method: "PATCH", body, csrf: E.csrf }),

  /**
   * SOL-06(가안) 내가 마친 상담 목록 (최신순, 로그인 필요). 마이페이지 '긴급 대응 기록'에서 써요.
   * 회원으로 시작해 상담 마치기(SOL-05)까지 한 상담만 와요. 상세 대화는 detail(SOL-02)로 불러요.
   */
  list: (params: { size?: number; cursor?: string | null } = {}): Promise<SolutionListResponse> =>
    USE_MOCK ? solutionsMock.list(params) : request(E.list, { query: { size: params.size ?? 10, cursor: params.cursor } }),

  /** 상담 삭제: 대화와 기록을 모두 지워요 ('저장 없이 나가기', 마이페이지 기록 삭제) */
  remove: (solutionId: number): Promise<{ solutionId: number; deleted: true }> =>
    USE_MOCK ? solutionsMock.remove(solutionId) : request(E.detail(solutionId), { method: "DELETE", csrf: E.csrf }),

  /** SOL-05 상담 종료 */
  complete: (solutionId: number): Promise<CompleteSolutionResponse> =>
    USE_MOCK ? solutionsMock.complete(solutionId) : request(E.complete(solutionId), { method: "POST", csrf: E.csrf }),
}
