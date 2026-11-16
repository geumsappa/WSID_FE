// 피해 대응 상담 API (SOL-01~05). 로그인 없이도 사용 가능 (비회원은 서버가 익명 세션 쿠키로 소유자를 구분).
// 순서: start(피해 설명) → message 여러 번(nextQuestion에 답하거나 글로 설명) / updateFacts(잘못 파악된 사실 정정) → complete
// 카드 상세 내용(행동·필요 자료)은 응답의 responseCards[].code로 guidesApi.responseCards(codes)를 불러 채워요.
import { newRequestId, request } from "./client"
import { TIMEOUT, USE_MOCK } from "./config"
import { ENDPOINTS } from "./endpoints"
import { solutionsMock } from "./mock/solutionsMock"
import type {
  CompleteSolutionResponse, SolutionDetail, SolutionMessageRequest, SolutionMessageResponse,
  StartSolutionRequest, StartSolutionResponse, UpdateFactsRequest, UpdateFactsResponse,
} from "./types"

const E = ENDPOINTS.solutions

export const solutionApi = {
  /** SOL-01 상담 시작 (201). 피해 사실·대응 카드·다음 질문이 함께 와요 */
  start: (body: StartSolutionRequest): Promise<StartSolutionResponse> =>
    USE_MOCK ? solutionsMock.start(body) : request(E.start, { method: "POST", body, timeoutMs: TIMEOUT.aiTurn }),

  /** SOL-02 상담 복원 */
  detail: (solutionId: number): Promise<SolutionDetail> =>
    USE_MOCK ? solutionsMock.detail(solutionId) : request(E.detail(solutionId)),

  /** SOL-03 상담 메시지. 질문에 답할 땐 { inputKind: "CHOICE", factKey, selectedCode }, 글은 { inputKind: "TEXT", content } */
  message: (solutionId: number, body: SolutionMessageRequest, requestId = newRequestId()): Promise<SolutionMessageResponse> =>
    USE_MOCK ? solutionsMock.message(solutionId, body)
      : request(E.messages(solutionId), { method: "POST", body: { requestId, ...body }, timeoutMs: TIMEOUT.aiTurn }),

  /** SOL-04 피해 사실 정정. 바꿀 항목만 changes에 */
  updateFacts: (solutionId: number, body: UpdateFactsRequest): Promise<UpdateFactsResponse> =>
    USE_MOCK ? solutionsMock.updateFacts(solutionId, body) : request(E.facts(solutionId), { method: "PATCH", body }),

  /** SOL-05 상담 종료 */
  complete: (solutionId: number): Promise<CompleteSolutionResponse> =>
    USE_MOCK ? solutionsMock.complete(solutionId) : request(E.complete(solutionId), { method: "POST" }),
}
