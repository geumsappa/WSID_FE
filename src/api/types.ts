// 서버와 주고받는 데이터 모양. 노션 API 명세(2026-11-16 내보내기)의 Request·Response 예시 그대로예요.
// 노션에 "설계 초안"으로 표시된 곳이 많아서, 백엔드가 바꾸면 여기만 고치고 타입 오류를 따라가면 돼요.
// 노션 예시가 빈 배열([])이라 안쪽 모양을 알 수 없는 필드는 unknown[]으로 두고 "형식 미정"이라고 적었어요.

// ───────── 공통 ─────────
/** 모든 JSON 응답의 바깥 모양. client.ts가 data만 꺼내서 돌려줘요. */
export type ApiEnvelope<T> = { success: boolean; data: T; error?: { code?: string; message?: string } }
export type YesNoUnknown = "YES" | "NO" | "UNKNOWN"
export type Sender = "AI" | "USER"
export type InputKind = "TEXT" | "CHOICE"
/** 훈련·상담에서 상태가 바뀌는 요청에 공통으로 붙는 값 */
export type Versioned = { stateVersion: number }

// ───────── 회원 (AUTH-01~07) ─────────
/** 노션: MALE·FEMALE, 필수 여부 미확정 */
export type Gender = "MALE" | "FEMALE"
export type UserStatus = "PENDING" | "ACTIVE"
export type SessionUser = { id: number; email: string; gender: Gender | null }

export type SignupRequest = { email: string; password: string; gender: Gender | null }
export type SignupResponse = { userId: number; email: string; status: UserStatus; verificationRequired: boolean }
export type ResendEmailResponse = { message: string }
export type VerifyEmailRequest = { email: string; code: string }
export type VerifyEmailResponse = { verified: boolean; status: UserStatus }
export type LoginRequest = { email: string; password: string }
/** 세션 ID는 응답 JSON에 없고 Set-Cookie로만 와요 */
export type LoginResponse = { user: SessionUser }
export type SessionResponse = { authenticated: boolean; user: SessionUser | null }
export type MeResponse = { id: number; email: string; gender: Gender | null; status: UserStatus; createdAt: string }

// ───────── 가이드 (GUIDE-01~04) ─────────
export type FraudTypeSummary = { code: string; name: string; description: string }
export type FraudTypeDetail = FraudTypeSummary & {
  examples: unknown[] // 형식 미정
  warningSignals: unknown[] // 형식 미정
  preventionTips: unknown[] // 형식 미정
  references: unknown[] // 형식 미정
}
export type CardPriority = "URGENT" | (string & {})
export type ResponseCard = {
  code: string
  title: string
  priority: CardPriority
  actions: unknown[] // 형식 미정
  requiredMaterials: unknown[] // 형식 미정
  institutionCodes: string[]
  sourceReferences: unknown[] // 형식 미정
  reviewedAt: string | null
}
export type Institution = { code: string; name: string; role: string; phone: string | null; officialUrl: string | null; reviewedAt: string | null }

// ───────── 훈련 (TRN-01~11) ─────────
export type TrainingPhase = "DISCOVERY" | "SCENARIO_READY" | "SIMULATION" | "RESULT"
export type TrainingStatus = "ACTIVE" | "COMPLETED"
/** 선택지. 노션 예시가 빈 배열이라 형식 미정 — 가안: { code, label } */
export type MockAttachment = { type: "ID_CARD" | "BANKBOOK" | "PHOTO"; title: string }
export type ChoiceOption = { code: string; label: string; mockAttachment?: MockAttachment | null }
export type ChatMessage = {
  id?: number
  sender: Sender
  inputKind?: InputKind
  content: string
  options?: ChoiceOption[]
  mockAttachment?: MockAttachment | null
  /** 가안(노션에 없음): 이 메시지가 상황 대화인지 가상 훈련인지. 있으면 복원 때 정확히 나눠요 */
  phase?: TrainingPhase
}

export type CreateTrainingResponse = { trainingId: number; phase: TrainingPhase; status: TrainingStatus; stateVersion: number; firstMessage: ChatMessage }
/** 진행 중 훈련이 없으면 null */
export type ActiveTrainingResponse = { trainingId: number; phase: TrainingPhase; status: TrainingStatus; lastActivityAt: string } | null
export type TrainingScenarioSummary = { title: string; description: string; senderName?: string | null; organizationName?: string | null }
export type TrainingDetail = {
  trainingId: number
  phase: TrainingPhase
  status: TrainingStatus
  stateVersion: number
  turnCount: number
  messages: ChatMessage[]
  availableOptions: ChoiceOption[]
  mockPageSubmitted?: boolean
  mockPage: MockPage | null
  /** 가안(노션에 없음): 복원 때 시나리오 제목·설명을 다시 보여 주려면 필요해요 */
  scenario?: TrainingScenarioSummary | null
}

export type DiscoveryMessageRequest = Versioned & { content: string }
export type DiscoveryMessageResponse = { reply: ChatMessage; discoveryTurnCount: number; canGenerateScenario: boolean; stateVersion: number }
/** multipart/form-data: images(File[]), requestId */
export type DiscoveryImagesResponse = { recognizedText: string; usable: boolean }

export type ScenarioResponse = {
  trainingId: number
  phase: TrainingPhase
  fraudTypeCode: string
  scenario: TrainingScenarioSummary
  mockPageTemplateCode: string | null
  stateVersion: number
}
export type StartTrainingResponse = { phase: TrainingPhase; firstMessage: ChatMessage; stateVersion: number; availableOptions?: ChoiceOption[]; mockPage?: MockPage | null }

/** TEXT면 content, CHOICE면 selectedCode */
export type TrainingMessageRequest = Versioned & ({ inputKind: "TEXT"; content: string } | { inputKind: "CHOICE"; selectedCode: string })
export type TrainingMessageResponse = {
  reply: ChatMessage
  recognizedActions: string[]
  turnCount: number
  shouldFinish: boolean
  mockPage: MockPage | null
  stateVersion: number
  /** 이름·주소처럼 규칙으로 못 가리는 개인정보를 AI가 가린 내 메시지 (예: "[이름, 주소 입력함]"). 가릴 게 없으면 null/없음 */
  maskedInput?: string | null
}

export type MockPage = { templateCode: string; title: string; institutionName: string; screenCode: string; isSimulation: boolean }
/** 노션: "MOCK_PAGE_OPEN,CLOSE,MOCK_LOGIN_ATTEMPT,OFFICIAL_CHANNEL_CHECK". CLOSE의 정확한 코드는 확인 필요 */
export type MockActionCode = "MOCK_PAGE_OPEN" | "MOCK_PAGE_CLOSE" | "MOCK_LOGIN_ATTEMPT" | "OFFICIAL_CHANNEL_CHECK"
export type MockActionRequest = Versioned & { actionCode: MockActionCode; actionMeta?: { templateCode: string; screenCode: string } }
export type MockActionResponse = { recorded: boolean; stateVersion: number }

export type FinishReason = "USER_FINISH" | (string & {})
export type FinishTrainingRequest = Versioned & { reason: FinishReason }
export type FinishTrainingResponse = { trainingId: number; status: TrainingStatus; phase: TrainingPhase; reportId: number }

// ───────── 리포트 (RPT-01~05) ─────────
export type MockPageEvaluation = { openedPage: boolean; attemptedMockLogin: boolean; checkedOfficialChannel: boolean }
export type Evaluation = {
  overallFeedback: string
  strengths?: string[] // RPT-01에만 있음
  improvements?: string[] // RPT-01에만 있음
  turnFeedback: unknown[] // 형식 미정
  mockPageEvaluation: MockPageEvaluation
  recommendations: string[]
  /** 가안(노션에 없음): 11/16 팀 결정 — 요구받은 개인정보 종류와 실제로 넘긴 종류. 값은 없음 */
  infoDisclosure?: InfoDisclosure
}
export type InfoDisclosure = { requested: string[]; provided: string[] }
/** RPT-01 훈련 직후 결과 */
export type TrainingReport = { reportId: number; trainingId: number; title: string; fraudTypeCode: string; saved: boolean; evaluation: Evaluation }
export type SaveReportResponse = { reportId: number; saved: boolean; savedAt: string }
export type ReportListItem = { reportId: number; title: string; fraudTypeCode: string; completedAt: string }
export type ReportListResponse = { items: ReportListItem[]; nextCursor: string | null; hasNext: boolean }
/** RPT-04 저장된 리포트 상세 */
export type ReportDetail = { reportId: number; title: string; saved: boolean; evaluation: Evaluation }

// ───────── 피해 대응 (SOL-01~05) ─────────
export type SolutionStatus = "ACTIVE" | "COMPLETED"
export type SolutionFacts = { transferredMoney: YesNoUnknown; sharedInformation: YesNoUnknown; installedApp: YesNoUnknown; contactContinues: YesNoUnknown }
export type FactKey = keyof SolutionFacts
/** SOL 응답 안의 카드는 GUIDE-03 카드의 일부 필드만 와요 (SOL-04 예시는 code·priority만) */
export type SolutionCard = { code: string; priority: CardPriority; title?: string; institutionCodes?: string[] }
/**
 * 다음 질문 하나. 사실 확인 질문이면 factKey·options(예/아니오/모름)가 있고,
 * AI 추가 질문(assistant.status = NEED_USER_INPUT)이면 factKey·options가 없을 수 있어요(자유 입력으로 답함)
 */
export type NextQuestion = { factKey?: FactKey | null; content: string; options?: YesNoUnknown[] }

export type StartSolutionRequest = { description: string }
export type StartSolutionResponse = {
  solutionId: number
  status: SolutionStatus
  stateVersion: number
  facts: SolutionFacts
  responseCards: SolutionCard[]
  nextQuestion: NextQuestion | null
}
// ── AI 질문·답변 (백엔드 최종 초안 11/17, Python 계약 확정 시 조금 바뀔 수 있음) ──
/**
 * 글(TEXT) 입력이 무엇인지 구분해요.
 * - FACT_UPDATE: 상황 설명 (지금 방식. 안 보내면 서버가 이걸로 처리)
 * - QUESTION: 새 질문 → AI가 답하거나 추가 질문을 해요
 * - CLARIFICATION_ANSWER: AI 추가 질문에 대한 답 (응답으로 받은 questionId 필수)
 */
export type MessagePurpose = "FACT_UPDATE" | "QUESTION" | "CLARIFICATION_ANSWER"
/**
 * - NEED_USER_INPUT: AI 추가 질문을 띄워요. 질문 문장은 nextQuestion.content에 와요(질문은 항상 하나)
 * - ANSWERED: answer(AI 답변)를 보여 줘요
 * - UNABLE_TO_ANSWER: "답변하기 어려워요" 안내
 */
export type AssistantStatus = "NEED_USER_INPUT" | "ANSWERED" | "UNABLE_TO_ANSWER"
/** AI 처리 결과. referenceCodes: 답변 근거가 된 대응 카드 코드(GUIDE-03로 제목을 불러 표시) */
export type AssistantReply = { status: AssistantStatus; questionId: string | null; answer: string | null; referenceCodes: string[] }

/** SOL-02. assistant: 마지막 AI 처리 결과. NEED_USER_INPUT이면 새로고침 후에도 nextQuestion을 AI 질문으로 다시 띄워요 */
export type SolutionDetail = StartSolutionResponse & { messages: ChatMessage[]; assistant?: AssistantReply | null }
/** TEXT면 content(+purpose), CHOICE면 selectedCode + factKey */
export type SolutionMessageRequest = Versioned & (
  | { inputKind: "TEXT"; content: string; purpose?: "FACT_UPDATE" | "QUESTION" }
  | { inputKind: "TEXT"; content: string; purpose: "CLARIFICATION_ANSWER"; questionId: string }
  | { inputKind: "CHOICE"; selectedCode: YesNoUnknown; factKey: FactKey }
)
/**
 * assistant: AI 질문·답변 결과. 상황 설명(FACT_UPDATE)·선택지 답변이면 null, 아직 구현 안 된 서버면 아예 없을 수 있어요
 * explanation: 가안(백엔드에 필드명 문의 중). AI-07 근거 설명이 SOL-03/04 응답에 실려 오면 화면이 도우미 말 끝에 붙여 보여 줘요.
 *   지금 서버·mock은 안 보내서 없어도 돼요(없으면 화면이 규칙 기반 답변만 보여 줌).
 */
export type SolutionMessageResponse = { facts: SolutionFacts; responseCards: SolutionCard[]; nextQuestion: NextQuestion | null; stateVersion: number; assistant?: AssistantReply | null; explanation?: string | null }
export type UpdateFactsRequest = Versioned & { changes: Partial<SolutionFacts> }
/**
 * SOL-04 응답. 백엔드 공유(11/17): SOL-03 응답과 같은 모양으로 바뀌어요.
 * - nextQuestion: 고친 사실에 맞춘 다음 질문. 더 물을 게 없으면 null
 * - responseCards: 고친 뒤 "전체 사실" 기준으로 다시 계산된 카드 전부
 * nextQuestion은 백엔드 구현 전까지 안 올 수 있어서 선택(?)으로 둬요. 안 오면 화면은 기존 질문을 유지해요.
 */
export type UpdateFactsResponse = { facts: SolutionFacts; responseCards: SolutionCard[]; nextQuestion?: NextQuestion | null; stateVersion: number; explanation?: string | null }
export type CompleteSolutionResponse = { solutionId: number; status: SolutionStatus }
/** SOL-06(가안, 노션에 아직 없음) 내 피해 대응 상담 목록 항목. title은 첫 상황 설명(가린 글) 앞부분 */
export type SolutionListItem = { solutionId: number; status: SolutionStatus; title: string; createdAt: string; completedAt: string | null }
export type SolutionListResponse = { items: SolutionListItem[]; nextCursor: string | null; hasNext: boolean }
