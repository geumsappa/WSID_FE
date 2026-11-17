// 서버 없이 피해 대응 상담(SOL-01~05)을 흉내 냅니다. 로그인 없이 쓰는 API라 소유자 확인은 생략했어요.
import { maskSensitive } from "@/lib/privacy"
import { detectEmergencyKeys } from "@/features/emergency/lib/detectEmergency"
import type { EmergencyKey } from "@/features/emergency/types"
import { errorFromCode } from "../client"
import type {
  Assist, ChatMessage, Clarification, CompleteSolutionResponse, FactKey, NextQuestion, SolutionCard, SolutionDetail, SolutionFacts,
  SolutionMessageRequest, SolutionMessageResponse, StartSolutionRequest, StartSolutionResponse,
  UpdateFactsRequest, UpdateFactsResponse, YesNoUnknown,
} from "../types"
import { checkVersion, delay, nextId, persistedMap, withSave } from "./delay"
import { toCard } from "./guidesMock"

type MockSolution = {
  id: number; status: "ACTIVE" | "COMPLETED"; stateVersion: number; facts: SolutionFacts; extra: EmergencyKey[]; messages: ChatMessage[]
  /** 사용자가 직접 답하거나 고친 항목. "모름"으로 답한 항목도 여기 들어가서 다시 묻지 않아요 (백엔드 공유 11/17) */
  settled?: FactKey[]
  /** 답을 기다리는 AI 추가 질문 */
  pending?: (Clarification & { factKey: FactKey }) | null
  clarSeq?: number
}
const store = persistedMap<MockSolution>("wsid-mock-solutions")
const sessions = store.map
const QUESTIONS: Record<FactKey, string> = {
  transferredMoney: "상대에게 돈을 보낸 적이 있나요?",
  sharedInformation: "개인정보를 전달한 적이 있나요?",
  installedApp: "상대 안내로 앱을 설치했나요?",
  contactContinues: "지금도 상대와 연락이 이어지고 있나요?",
}
const FACT_KEY: Partial<Record<EmergencyKey, FactKey>> = { transfer: "transferredMoney", privacy: "sharedInformation", app: "installedApp" }
const OPTIONS: YesNoUnknown[] = ["YES", "NO", "UNKNOWN"]

function get(id: number) {
  const s = sessions.get(id)
  if (!s) throw errorFromCode(404, "SOLUTION_NOT_FOUND")
  return s
}
function applyText(s: MockSolution, text: string) {
  for (const k of detectEmergencyKeys(text)) {
    const f = FACT_KEY[k]
    if (f) s.facts[f] = "YES"
    else if (k !== "custom" && !s.extra.includes(k)) s.extra.push(k)
  }
  if (/연락이 끊|연락 두절|차단했/.test(text)) s.facts.contactContinues = "NO"
}
/** 사실 조합으로 카드 계산 (긴급 카드가 먼저) */
function cards(s: MockSolution): SolutionCard[] {
  const keys: EmergencyKey[] = [
    ...(s.facts.transferredMoney === "YES" ? ["transfer" as const] : []),
    ...(s.facts.sharedInformation === "YES" ? ["privacy" as const] : []),
    ...(s.facts.installedApp === "YES" ? ["app" as const] : []),
    ...s.extra,
  ]
  return (keys.length ? keys : ["custom" as const]).map((k) => {
    const c = toCard(k)
    return { code: c.code, priority: c.priority, title: c.title, institutionCodes: c.institutionCodes }
  })
}
function settle(s: MockSolution, key: FactKey) {
  s.settled = Array.from(new Set([...(s.settled ?? []), key]))
}
function nextQuestion(s: MockSolution): NextQuestion | null {
  const key = (Object.keys(s.facts) as FactKey[]).find((k) => s.facts[k] === "UNKNOWN" && !(s.settled ?? []).includes(k))
  return key ? { factKey: key, content: QUESTIONS[key], options: OPTIONS } : null
}

// ── AI 질문·답변 흉내 (백엔드 초안 11/17) ──
// 실제로는 Python AI가 만들고 Spring이 검증한 답이 와요. mock은 정해 둔 문장으로 흐름만 확인해요.
// 확인용 입력: "실패 테스트"가 들어가면 오류, "주식/코인/투자/대출 추천"이면 답변 불가.
const CLARIFY: Record<FactKey, string> = {
  transferredMoney: "혹시 상대에게 이미 돈을 보내셨나요?",
  sharedInformation: "혹시 비밀번호나 인증번호 같은 정보를 알려 주셨나요?",
  installedApp: "혹시 상대가 알려 준 앱을 이미 설치하셨나요?",
  contactContinues: "지금도 상대에게서 연락이 오고 있나요?",
}
const ANSWER_YES: Record<FactKey, string> = {
  transferredMoney: "지금 바로 송금한 은행 고객센터(또는 112)에 전화해 지급정지를 요청하세요. 시간이 지날수록 돌려받기 어려워져요. 이체 내역 화면을 캡처해 두면 신고할 때 도움이 돼요.",
  sharedInformation: "알려 준 정보와 연결된 계정의 비밀번호를 먼저 바꾸고, 금융감독원 '개인정보 노출자 사고예방 시스템'에 등록하세요. 신분증 정보를 줬다면 명의도용 방지 서비스도 신청해 두세요.",
  installedApp: "휴대폰을 비행기 모드로 바꾸고, 설치한 앱을 삭제하세요. 원격 제어 앱일 수 있으니 그 휴대폰으로는 금융 앱을 쓰지 말고, 다른 기기로 은행에 연락해 계좌 거래를 확인하세요.",
  contactContinues: "더 이상 답하지 말고 번호를 차단하세요. 대화 내용은 지우지 말고 캡처해 두면 신고할 때 증거가 돼요.",
}
const ANSWER_NO: Record<FactKey, string> = {
  transferredMoney: "아직 돈을 보내지 않았다면 다행이에요. 어떤 이유로든 송금 요구에는 응하지 말고, 상대가 말한 기관에 공식 번호로 직접 확인하세요.",
  sharedInformation: "정보를 알려 주지 않았다면 큰 피해는 막았어요. 앞으로도 인증번호·비밀번호는 누구에게도 알려 주지 마세요.",
  installedApp: "앱을 설치하지 않았다면 그대로 두세요. 받은 링크나 파일은 열지 말고 삭제하는 게 안전해요.",
  contactContinues: "연락이 끊겼다면 다시 연락이 와도 응하지 마세요. 받은 문자·통화 기록은 신고에 쓸 수 있게 남겨 두세요.",
}
const GENERAL_ANSWER = "지금 상황에서는 위 대응 카드의 '긴급' 항목부터 진행하는 게 가장 안전해요. 판단이 어렵다면 112나 금융감독원(1332)에 전화해 상담받으세요."
/** 질문이 어떤 사실과 관련 있는지 대충 고르는 규칙 (mock 전용) */
const TOPIC: [FactKey, RegExp][] = [
  ["transferredMoney", /돈|송금|이체|입금|계좌/],
  ["sharedInformation", /개인정보|비밀번호|인증번호|신분증|OTP|카드번호/i],
  ["installedApp", /앱|어플|apk|설치|링크/i],
  ["contactContinues", /연락|전화|문자|차단/],
]

/** 질문(QUESTION) 처리: 관련 사실이 아직 모르면 되묻고, 알면 바로 답해요 */
function assistQuestion(s: MockSolution, text: string): Assist {
  if (/주식|코인|투자|대출.{0,4}추천/.test(text)) return { status: "UNABLE_TO_ANSWER", answer: null, clarification: null }
  const topics = TOPIC.filter(([, re]) => re.test(text)).map(([f]) => f)
  const unknown = topics.find((f) => s.facts[f] === "UNKNOWN")
  if (unknown) {
    s.clarSeq = (s.clarSeq ?? 0) + 1
    s.pending = { clarificationId: `c-${s.id}-${s.clarSeq}`, content: CLARIFY[unknown], factKey: unknown }
    return { status: "NEED_USER_INPUT", answer: null, clarification: { clarificationId: s.pending.clarificationId, content: s.pending.content } }
  }
  const known = topics.find((f) => s.facts[f] !== "UNKNOWN")
  const answer = known ? (s.facts[known] === "YES" ? ANSWER_YES : ANSWER_NO)[known] : GENERAL_ANSWER
  return { status: "ANSWERED", answer, clarification: null }
}
/** 추가 질문에 대한 답(CLARIFICATION_ANSWER) 처리: 답으로 사실을 채우고 그에 맞게 답해요 */
function assistClarification(s: MockSolution, clarificationId: string, text: string): Assist {
  const p = s.pending
  if (!p || p.clarificationId !== clarificationId) throw errorFromCode(409, "CLARIFICATION_NOT_FOUND")
  s.pending = null
  const no = /아니|안 ?했|않았|없어|안 ?보냈|안 ?깔/.test(text)
  const yes = !no && /네|예|응|맞|했|보냈|깔았|설치/.test(text)
  if (!yes && !no) return { status: "ANSWERED", answer: `정확히 기억나지 않아도 괜찮아요. ${GENERAL_ANSWER}`, clarification: null }
  s.facts[p.factKey] = yes ? "YES" : "NO"
  settle(s, p.factKey)
  return { status: "ANSWERED", answer: (yes ? ANSWER_YES : ANSWER_NO)[p.factKey], clarification: null }
}
const pendingOf = (s: MockSolution): Clarification | null => s.pending ? { clarificationId: s.pending.clarificationId, content: s.pending.content } : null

export const solutionsMock = withSave({
  async start(body: StartSolutionRequest): Promise<StartSolutionResponse> {
    await delay(750)
    const s: MockSolution = { id: nextId(), status: "ACTIVE", stateVersion: 0, facts: { transferredMoney: "UNKNOWN", sharedInformation: "UNKNOWN", installedApp: "UNKNOWN", contactContinues: "UNKNOWN" }, extra: [], messages: [] }
    const masked = maskSensitive(body.description.trim()) // 원문은 저장하지 않고 가린 글만
    if (masked) {
      applyText(s, masked)
      s.messages.push({ sender: "USER", inputKind: "TEXT", content: masked })
    }
    sessions.set(s.id, s)
    return { solutionId: s.id, status: s.status, stateVersion: s.stateVersion, facts: { ...s.facts }, responseCards: cards(s), nextQuestion: nextQuestion(s) }
  },
  async detail(id: number): Promise<SolutionDetail> {
    await delay(150)
    const s = get(id)
    return { solutionId: s.id, status: s.status, stateVersion: s.stateVersion, facts: { ...s.facts }, responseCards: cards(s), nextQuestion: nextQuestion(s), messages: s.messages, pendingClarification: pendingOf(s) }
  },
  async message(id: number, body: SolutionMessageRequest): Promise<SolutionMessageResponse> {
    await delay(600)
    const s = get(id)
    checkVersion(s.stateVersion, body.stateVersion)
    if (body.inputKind === "CHOICE") {
      s.facts[body.factKey] = body.selectedCode
      settle(s, body.factKey)
      s.messages.push({ sender: "USER", inputKind: "CHOICE", content: `${QUESTIONS[body.factKey]} → ${body.selectedCode}` })
      s.stateVersion += 1
      return { facts: { ...s.facts }, responseCards: cards(s), nextQuestion: nextQuestion(s), stateVersion: s.stateVersion, assist: null }
    }
    const masked = maskSensitive(body.content.trim())
    if (/실패 ?테스트/.test(masked)) throw errorFromCode(503, "AI_SERVICE_UNAVAILABLE") // 재시도 흐름 확인용
    let assist: Assist | null = null
    if (body.purpose === "CLARIFICATION_ANSWER") assist = assistClarification(s, body.clarificationId, masked)
    else if (body.purpose === "QUESTION") assist = assistQuestion(s, masked)
    else applyText(s, masked) // FACT_UPDATE(또는 purpose 없음): 지금 방식
    s.messages.push({ sender: "USER", inputKind: "TEXT", content: masked })
    const aiText = assist?.status === "NEED_USER_INPUT" ? assist.clarification?.content : assist?.answer
    if (aiText) s.messages.push({ sender: "AI", inputKind: "TEXT", content: aiText })
    s.stateVersion += 1
    return { facts: { ...s.facts }, responseCards: cards(s), nextQuestion: nextQuestion(s), stateVersion: s.stateVersion, assist }
  },
  async updateFacts(id: number, body: UpdateFactsRequest): Promise<UpdateFactsResponse> {
    await delay(200)
    const s = get(id)
    checkVersion(s.stateVersion, body.stateVersion)
    for (const [k, v] of Object.entries(body.changes) as [FactKey, YesNoUnknown][]) {
      if (k in s.facts && v) {
        s.facts[k] = v
        settle(s, k)
      }
    }
    s.stateVersion += 1
    // 백엔드 공유(11/17): SOL-03과 같은 모양 — 전체 사실 기준 카드 + 다음 질문
    return { facts: { ...s.facts }, responseCards: cards(s), nextQuestion: nextQuestion(s), stateVersion: s.stateVersion }
  },
  async complete(id: number): Promise<CompleteSolutionResponse> {
    await delay(150)
    const s = get(id)
    s.status = "COMPLETED"
    return { solutionId: s.id, status: s.status }
  },
}, store.save)
