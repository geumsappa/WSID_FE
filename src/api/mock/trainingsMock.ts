// 서버 없이 훈련 API를 흉내 냅니다. 기존 규칙 기반 데모 함수를 재사용하고, 응답은 노션 형식으로 맞춰요.
// stateVersion 검사도 서버처럼 해서, 버전 처리를 mock에서도 확인할 수 있어요.
import { scrubPersonalInfo } from "@/lib/privacy"
import { analyzeConversation } from "@/features/report/lib/analyzeConversation"
import { createDemoReply, hasSafeEnding } from "@/features/simulation/lib/demoReply"
import { createInterviewOptions, interviewQuestion } from "@/features/simulation/lib/scenarioFactory"
import type { InterviewAnswer, Scenario, SimulationMessage, SituationKey } from "@/features/simulation/types"
import { errorFromCode } from "../client"
import type {
  ActiveTrainingResponse, ChatMessage, ChoiceOption, CreateTrainingResponse, DiscoveryImagesResponse, DiscoveryMessageRequest,
  DiscoveryMessageResponse, FinishTrainingRequest, FinishTrainingResponse, MockActionCode, MockActionRequest,
  MockActionResponse, MockPage, ScenarioResponse, StartTrainingResponse, TrainingDetail, TrainingMessageRequest,
  TrainingMessageResponse, TrainingPhase, TrainingReport, TrainingStatus, Versioned,
} from "../types"
import { requireMockUser } from "./authMock"
import { checkVersion, delay, nextId, persistedMap, withSave } from "./delay"

type MockTraining = {
  id: number
  owner: string
  phase: TrainingPhase
  status: TrainingStatus
  stateVersion: number
  answers: InterviewAnswer[]
  log: ChatMessage[]
  imageCount: number
  scenario?: Scenario
  messages: SimulationMessage[]
  requested: string[]
  actions: MockActionCode[]
  report?: TrainingReport
  updatedAt: number
}
const store = persistedMap<MockTraining>("wsid-mock-trainings")
const trainings = store.map
const MAX_DISCOVERY_TURNS = 3
const MAX_TRAINING_TURNS = 5
const MAX_IMAGES = 3
const FRAUD_TYPE: Record<SituationKey, string> = { trade: "SECONDHAND_TRADE", delivery: "SMISHING", loan: "LOAN_FRAUD", job: "JOB_SCAM", institution: "INSTITUTION_IMPERSONATION" }
/** 시나리오별 모의 페이지 (실제 서버도 사기 유형마다 다른 templateCode를 보내야 화면이 바뀌어요) */
const MOCK_PAGES: Record<SituationKey, MockPage> = {
  trade: { templateCode: "SECONDHAND_SAFE_PAY", title: "안전결제 안내", institutionName: "가상마켓 안전결제", screenCode: "PAY_CHECK", isSimulation: true },
  delivery: { templateCode: "DELIVERY_ADDRESS", title: "배송지 재확인", institutionName: "가상택배", screenCode: "ADDRESS_CHECK", isSimulation: true },
  loan: { templateCode: "LOAN_APPLY", title: "대출 한도 조회", institutionName: "가상캐피탈", screenCode: "LIMIT_CHECK", isSimulation: true },
  job: { templateCode: "RECRUIT_APPLICANT", title: "지원자 확인", institutionName: "가상채용센터", screenCode: "APPLICANT_CHECK", isSimulation: true },
  institution: { templateCode: "CASE_LOOKUP", title: "사건 조회", institutionName: "가상수사센터", screenCode: "CASE_CHECK", isSimulation: true },
}
const ASKS = /인증|비밀번호|코드|본인 확인|번호|계좌/

function get(id: number) {
  const user = requireMockUser()
  const t = trainings.get(id)
  if (!t || t.owner !== user.email) throw errorFromCode(404, "TRAINING_NOT_FOUND") // 남의 훈련도 404
  t.updatedAt = Date.now()
  return t
}
function bump(t: MockTraining) {
  t.stateVersion += 1
  return t.stateVersion
}
function requirePhase(t: MockTraining, phase: TrainingPhase) {
  if (t.phase !== phase) throw errorFromCode(409, "INVALID_TRAINING_PHASE")
}
const toOptions = (choices: string[]): ChoiceOption[] => choices.map((c) => ({ code: c, label: c }))
const ai = (content: string, phase: TrainingPhase, options: ChoiceOption[] = []): ChatMessage => ({ sender: "AI", inputKind: "TEXT", content, options, phase })

export const trainingsMock = withSave({
  async create(): Promise<CreateTrainingResponse> {
    await delay(150)
    const user = requireMockUser()
    const q = interviewQuestion([])
    const first = ai(q.text, "DISCOVERY", toOptions(q.choices))
    const t: MockTraining = { id: nextId(), owner: user.email, phase: "DISCOVERY", status: "ACTIVE", stateVersion: 0, answers: [], log: [first], imageCount: 0, messages: [], requested: [], actions: [], updatedAt: Date.now() }
    trainings.set(t.id, t)
    return { trainingId: t.id, phase: t.phase, status: t.status, stateVersion: 0, firstMessage: first }
  },
  async active(): Promise<ActiveTrainingResponse> {
    await delay(100)
    const user = requireMockUser()
    const t = [...trainings.values()].filter((x) => x.owner === user.email && x.status === "ACTIVE").sort((a, b) => b.updatedAt - a.updatedAt)[0]
    return t ? { trainingId: t.id, phase: t.phase, status: t.status, lastActivityAt: new Date(t.updatedAt).toISOString() } : null
  },
  async detail(id: number): Promise<TrainingDetail> {
    await delay(150)
    const t = get(id)
    return {
      trainingId: t.id, phase: t.phase, status: t.status, stateVersion: t.stateVersion,
      turnCount: t.messages.filter((m) => m.from === "user").length,
      messages: t.log, availableOptions: [], mockPage: null,
      scenario: t.scenario ? { title: t.scenario.title, description: t.scenario.description } : null,
    }
  },
  async discoveryMessage(id: number, body: DiscoveryMessageRequest & { requestId: string }): Promise<DiscoveryMessageResponse> {
    await delay(400)
    const t = get(id)
    requirePhase(t, "DISCOVERY")
    checkVersion(t.stateVersion, body.stateVersion)
    const { text } = scrubPersonalInfo(body.content.trim()) // 실제 값은 바로 가림
    t.answers.push({ question: interviewQuestion(t.answers).text, answer: text })
    t.log.push({ sender: "USER", inputKind: "TEXT", content: text, phase: "DISCOVERY" })
    const canGenerateScenario = t.answers.length >= MAX_DISCOVERY_TURNS || (body.quickStart === true && t.answers.length === 1)
    const next = interviewQuestion(t.answers)
    const reply = canGenerateScenario
      ? ai("충분히 알려 주셨어요. 이 상황에 맞는 훈련을 준비할 수 있어요.", "DISCOVERY")
      : ai(next.text, "DISCOVERY", toOptions(next.choices))
    t.log.push(reply)
    return { reply, discoveryTurnCount: t.answers.length, canGenerateScenario, stateVersion: bump(t) }
  },
  async discoveryImages(id: number, files: File[]): Promise<DiscoveryImagesResponse> {
    await delay(600)
    const t = get(id)
    requirePhase(t, "DISCOVERY")
    if (t.imageCount + files.length > MAX_IMAGES) throw errorFromCode(400, "FILE_TOO_LARGE")
    t.imageCount += files.length
    return { recognizedText: "", usable: false } // mock은 OCR을 하지 않아요 → 직접 입력 안내
  },
  async scenario(id: number, body: Versioned): Promise<ScenarioResponse> {
    await delay(900)
    const t = get(id)
    requirePhase(t, "DISCOVERY")
    checkVersion(t.stateVersion, body.stateVersion)
    const context = t.answers.map((a) => `${a.question} ${a.answer}`).join(" / ")
    t.scenario = createInterviewOptions(context)[0]
    t.phase = "SCENARIO_READY"
    return {
      trainingId: t.id,
      phase: t.phase,
      fraudTypeCode: FRAUD_TYPE[t.scenario.key],
      scenario: { title: t.scenario.title, description: t.scenario.description,
        channel: t.scenario.key === "delivery" ? "SMS" : t.scenario.key === "trade" ? "MARKET" : "MESSENGER" },
      mockPageTemplateCode: MOCK_PAGES[t.scenario.key].templateCode,
      stateVersion: bump(t),
    }
  },
  async start(id: number, body: Versioned): Promise<StartTrainingResponse> {
    await delay(300)
    const t = get(id)
    requirePhase(t, "SCENARIO_READY")
    checkVersion(t.stateVersion, body.stateVersion)
    t.phase = "SIMULATION"
    const first = ai(t.scenario!.opening, "SIMULATION")
    t.messages = [{ from: "contact", text: first.content }]
    t.log.push(first)
    return { phase: t.phase, firstMessage: first, stateVersion: bump(t) }
  },
  async message(id: number, body: TrainingMessageRequest): Promise<TrainingMessageResponse> {
    await delay(700)
    const t = get(id)
    requirePhase(t, "SIMULATION")
    checkVersion(t.stateVersion, body.stateVersion)
    const raw = body.inputKind === "TEXT" ? body.content : body.selectedCode
    const lastContact = [...t.messages].reverse().find((m) => m.from === "contact")?.text ?? ""
    const asked = ASKS.test(lastContact)
    if (asked && !t.requested.includes("개인정보")) t.requested.push("개인정보")
    const { text, types } = scrubPersonalInfo(raw.trim().slice(0, 500), asked) // 값은 가리고 종류만 남김
    const turn = t.messages.filter((m) => m.from === "user").length
    t.messages.push({ from: "user", text, leaked: types.length ? types : undefined })
    t.log.push({ sender: "USER", inputKind: body.inputKind, content: text, phase: "SIMULATION" })
    const content = types.length
      ? `${types.join(", ")} 확인 감사하다며, 처리를 마치려면 추가 확인이 필요하다고 다른 정보도 요구합니다.`
      : turn === 3 // 네 번째 답장에는 담당자가 바뀌며 가상 앱 설치 링크를 보내는 흉내
        ? "[화자: 박서연/보안관리팀] 방금 연결받은 보안관리팀입니다. 확인용 앱을 설치하셔야 다음 처리가 돼요. [모의앱]"
        : createDemoReply(text, turn, t.scenario!)
    t.messages.push({ from: "contact", text: content })
    const reply = ai(content, "SIMULATION")
    t.log.push(reply)
    const recognizedActions = [
      ...(/공식|고객센터|대표번호/.test(text) ? ["OFFICIAL_CHANNEL_CHECK"] : []), // 노션 예시 코드
      ...(types.length ? ["SENSITIVE_INFO_SHARED"] : []), // mock용 코드
      ...(hasSafeEnding(text) ? ["CONVERSATION_ENDED"] : []), // mock용 코드
    ]
    const turnCount = turn + 1
    return {
      reply,
      recognizedActions,
      turnCount,
      shouldFinish: hasSafeEnding(text) || turnCount >= MAX_TRAINING_TURNS,
      mockPage: turnCount === 2 && t.scenario ? MOCK_PAGES[t.scenario.key] : null, // 두 번째 턴에 모의 페이지 링크를 보내는 흉내
      stateVersion: bump(t),
    }
  },
  async mockPage(id: number): Promise<MockPage> {
    await delay(200)
    const t = get(id)
    if (!t.scenario) throw errorFromCode(404, "MOCK_PAGE_NOT_FOUND")
    return MOCK_PAGES[t.scenario.key]
  },
  async action(id: number, body: MockActionRequest): Promise<MockActionResponse> {
    await delay(100)
    const t = get(id)
    checkVersion(t.stateVersion, body.stateVersion)
    t.actions.push(body.actionCode)
    return { recorded: true, stateVersion: bump(t) }
  },
  async finish(id: number, body: FinishTrainingRequest): Promise<FinishTrainingResponse> {
    await delay(600)
    const t = get(id)
    requirePhase(t, "SIMULATION")
    checkVersion(t.stateVersion, body.stateVersion)
    const a = analyzeConversation(t.messages)
    t.report = {
      reportId: nextId(),
      trainingId: t.id,
      title: t.scenario!.title,
      fraudTypeCode: FRAUD_TYPE[t.scenario!.key],
      saved: false,
      evaluation: {
        overallFeedback: a.summary,
        strengths: a.safe,
        improvements: [...(a.risky[0]?.includes("발견되지 않았") ? [] : a.risky), ...a.missed],
        // mock 타임라인: 개인정보를 적은 답변은 위험, 공식 확인·거절은 잘 막음으로 표시해요
        turnFeedback: t.messages.filter((m) => m.from === "user").flatMap((m, i) => m.leaked?.length
          ? [{ turn: i + 1, outcome: "risky", userAction: `${m.leaked.join(", ")}을(를) 적음`, feedback: "요구받은 정보를 적기 전에 공식 앱이나 대표번호로 먼저 확인하세요." }]
          : /공식|고객센터|안 할게|싫어|차단/.test(m.text)
            ? [{ turn: i + 1, outcome: "safe", userAction: "요구를 거절하거나 공식 채널로 확인함", feedback: "상대가 준 경로 대신 스스로 확인하려 한 좋은 대응이에요." }]
            : []),
        mockPageEvaluation: {
          openedPage: t.actions.includes("MOCK_PAGE_OPEN"),
          attemptedMockLogin: t.actions.includes("MOCK_LOGIN_ATTEMPT"),
          checkedOfficialChannel: t.actions.includes("OFFICIAL_CHANNEL_CHECK") || /공식|고객센터/.test(t.messages.map((m) => m.text).join(" ")),
          clickedAppLink: t.actions.includes("MOCK_APP_CLICK"),
        },
        recommendations: ["메시지 속 연락처 대신 공식 앱·대표번호로 확인하기", "비밀번호·인증번호는 누구에게도 알려주지 않기", "금전 피해가 생기면 112와 금융회사에 바로 연락하기"],
        infoDisclosure: { requested: t.requested, provided: a.leaked ?? [] },
      },
    }
    t.phase = "RESULT"
    t.status = "COMPLETED"
    bump(t)
    return { trainingId: t.id, status: t.status, phase: t.phase, reportId: t.report.reportId }
  },
  async report(id: number): Promise<TrainingReport> {
    await delay(200)
    const t = get(id)
    if (!t.report) throw errorFromCode(404, "REPORT_NOT_FOUND")
    return t.report
  },
  /** 리포트 mock이 reportId로 훈련 결과를 찾을 때 사용 */
  _findReport(reportId: number, owner: string) {
    for (const t of trainings.values()) if (t.owner === owner && t.report?.reportId === reportId) return t
    return null
  },
  _save: store.save,
}, store.save)
