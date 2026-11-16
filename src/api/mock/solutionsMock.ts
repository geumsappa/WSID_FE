// 서버 없이 피해 대응 상담(SOL-01~05)을 흉내 냅니다. 로그인 없이 쓰는 API라 소유자 확인은 생략했어요.
import { maskSensitive } from "@/lib/privacy"
import { detectEmergencyKeys } from "@/features/emergency/lib/detectEmergency"
import type { EmergencyKey } from "@/features/emergency/types"
import { errorFromCode } from "../client"
import type {
  ChatMessage, CompleteSolutionResponse, FactKey, NextQuestion, SolutionCard, SolutionDetail, SolutionFacts,
  SolutionMessageRequest, SolutionMessageResponse, StartSolutionRequest, StartSolutionResponse,
  UpdateFactsRequest, UpdateFactsResponse, YesNoUnknown,
} from "../types"
import { checkVersion, delay, nextId } from "./delay"
import { toCard } from "./guidesMock"

type MockSolution = { id: number; status: "ACTIVE" | "COMPLETED"; stateVersion: number; facts: SolutionFacts; extra: EmergencyKey[]; messages: ChatMessage[] }
const sessions = new Map<number, MockSolution>()
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
function nextQuestion(s: MockSolution): NextQuestion | null {
  const key = (Object.keys(s.facts) as FactKey[]).find((k) => s.facts[k] === "UNKNOWN")
  return key ? { factKey: key, content: QUESTIONS[key], options: OPTIONS } : null
}

export const solutionsMock = {
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
    return { solutionId: s.id, status: s.status, stateVersion: s.stateVersion, facts: { ...s.facts }, responseCards: cards(s), nextQuestion: nextQuestion(s), messages: s.messages }
  },
  async message(id: number, body: SolutionMessageRequest): Promise<SolutionMessageResponse> {
    await delay(600)
    const s = get(id)
    checkVersion(s.stateVersion, body.stateVersion)
    if (body.inputKind === "CHOICE") {
      s.facts[body.factKey] = body.selectedCode
      s.messages.push({ sender: "USER", inputKind: "CHOICE", content: `${QUESTIONS[body.factKey]} → ${body.selectedCode}` })
    } else {
      const masked = maskSensitive(body.content.trim())
      applyText(s, masked)
      s.messages.push({ sender: "USER", inputKind: "TEXT", content: masked })
    }
    s.stateVersion += 1
    return { facts: { ...s.facts }, responseCards: cards(s), nextQuestion: nextQuestion(s), stateVersion: s.stateVersion }
  },
  async updateFacts(id: number, body: UpdateFactsRequest): Promise<UpdateFactsResponse> {
    await delay(200)
    const s = get(id)
    checkVersion(s.stateVersion, body.stateVersion)
    for (const [k, v] of Object.entries(body.changes) as [FactKey, YesNoUnknown][]) if (k in s.facts && v) s.facts[k] = v
    s.stateVersion += 1
    return { facts: { ...s.facts }, responseCards: cards(s), stateVersion: s.stateVersion }
  },
  async complete(id: number): Promise<CompleteSolutionResponse> {
    await delay(150)
    const s = get(id)
    s.status = "COMPLETED"
    return { solutionId: s.id, status: s.status }
  },
}
