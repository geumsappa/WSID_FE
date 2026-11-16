// 훈련(시뮬레이션) API (TRN-01~11, RPT-01). 전부 로그인 필요.
// 순서: create → discoveryMessage 여러 번(필요하면 discoveryImages) → scenario → start
//       → message 여러 번(필요하면 mockPage·action) → finish → report
//
// stateVersion: 서버가 응답마다 새 값을 줘요. 다음 요청에 그 값을 그대로 보내야 해요.
//   어긋나면 STATE_VERSION_CONFLICT 에러 → isStateConflict(e)로 확인하고 detail()로 다시 불러오세요.
// requestId: 같은 요청이 두 번 처리되지 않게 하는 값. 비워 두면 새로 만들고,
//   네트워크 오류로 "같은 요청을 다시" 보낼 때만 처음 값을 넘기세요.
import { newRequestId, request } from "./client"
import { TIMEOUT, USE_MOCK } from "./config"
import { ENDPOINTS } from "./endpoints"
import { trainingsMock } from "./mock/trainingsMock"
import type {
  ActiveTrainingResponse, CreateTrainingResponse, DiscoveryImagesResponse, DiscoveryMessageRequest,
  DiscoveryMessageResponse, FinishTrainingRequest, FinishTrainingResponse, MockActionRequest, MockActionResponse,
  MockPage, ScenarioResponse, StartTrainingResponse, TrainingDetail, TrainingMessageRequest,
  TrainingMessageResponse, TrainingReport, Versioned,
} from "./types"

const E = ENDPOINTS.trainings

export const trainingApi = {
  /** TRN-01 새 훈련 생성 (201). 첫 질문(firstMessage)과 stateVersion 0이 와요 */
  create: (): Promise<CreateTrainingResponse> =>
    USE_MOCK ? trainingsMock.create() : request(E.create, { method: "POST", body: {} }),

  /** TRN-02 진행 중 훈련 (홈의 "이어서 하기"). 없으면 null */
  active: (): Promise<ActiveTrainingResponse> => (USE_MOCK ? trainingsMock.active() : request(E.active)),

  /** TRN-03 훈련 상태·대화 복원 */
  detail: (trainingId: number): Promise<TrainingDetail> =>
    USE_MOCK ? trainingsMock.detail(trainingId) : request(E.detail(trainingId)),

  /** TRN-04 상황 파악 대화 한 턴 */
  discoveryMessage: (trainingId: number, body: DiscoveryMessageRequest, requestId = newRequestId()): Promise<DiscoveryMessageResponse> =>
    USE_MOCK ? trainingsMock.discoveryMessage(trainingId, { ...body, requestId })
      : request(E.discoveryMessages(trainingId), { method: "POST", body: { requestId, ...body }, timeoutMs: TIMEOUT.aiTurn }),

  /** TRN-05 이미지 첨부·OCR (multipart: images, requestId). PNG/JPEG 최대 3장, 장당 5MB */
  discoveryImages: (trainingId: number, files: File[], requestId = newRequestId()): Promise<DiscoveryImagesResponse> => {
    if (USE_MOCK) return trainingsMock.discoveryImages(trainingId, files)
    const form = new FormData()
    files.forEach((f) => form.append("images", f))
    form.append("requestId", requestId)
    return request(E.discoveryImages(trainingId), { method: "POST", body: form, timeoutMs: TIMEOUT.aiTurn })
  },

  /** TRN-06 개인화 시나리오 생성. 60초까지 걸릴 수 있어 로딩 화면 필요 */
  scenario: (trainingId: number, body: Versioned, requestId = newRequestId()): Promise<ScenarioResponse> =>
    USE_MOCK ? trainingsMock.scenario(trainingId, body)
      : request(E.scenario(trainingId), { method: "POST", body: { ...body, requestId }, timeoutMs: TIMEOUT.scenario }),

  /** TRN-07 가상 훈련 시작. SCENARIO_READY 단계에서만 가능 */
  start: (trainingId: number, body: Versioned, requestId = newRequestId()): Promise<StartTrainingResponse> =>
    USE_MOCK ? trainingsMock.start(trainingId, body)
      : request(E.start(trainingId), { method: "POST", body: { ...body, requestId }, timeoutMs: TIMEOUT.aiTurn }),

  /** TRN-08 훈련 대화 한 턴. 글은 { inputKind: "TEXT", content }, 선택지는 { inputKind: "CHOICE", selectedCode } */
  message: (trainingId: number, body: TrainingMessageRequest, requestId = newRequestId()): Promise<TrainingMessageResponse> =>
    USE_MOCK ? trainingsMock.message(trainingId, body)
      : request(E.messages(trainingId), { method: "POST", body: { requestId, ...body }, timeoutMs: TIMEOUT.aiTurn }),

  /** TRN-09 모의 페이지 조회 */
  mockPage: (trainingId: number): Promise<MockPage> =>
    USE_MOCK ? trainingsMock.mockPage(trainingId) : request(E.mockPage(trainingId)),

  /** TRN-10 모의 페이지 행동 기록 */
  action: (trainingId: number, body: MockActionRequest, requestId = newRequestId()): Promise<MockActionResponse> =>
    USE_MOCK ? trainingsMock.action(trainingId, body)
      : request(E.actions(trainingId), { method: "POST", body: { requestId, ...body } }),

  /** TRN-11 훈련 종료 + 리포트 생성. 받은 reportId로 리포트를 저장해요 */
  finish: (trainingId: number, body: FinishTrainingRequest, requestId = newRequestId()): Promise<FinishTrainingResponse> =>
    USE_MOCK ? trainingsMock.finish(trainingId, body)
      : request(E.finish(trainingId), { method: "POST", body: { requestId, ...body }, timeoutMs: TIMEOUT.scenario }),

  /** RPT-01 훈련 직후 결과 (저장 전에도 조회 가능) */
  report: (trainingId: number): Promise<TrainingReport> =>
    USE_MOCK ? trainingsMock.report(trainingId) : request(E.report(trainingId)),
}
