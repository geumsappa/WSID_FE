// 서버 없이 피해 대응 상담(SOL-01~05)을 흉내 냅니다. 로그인 없이 쓰는 API라 소유자 확인은 생략했어요.
import { maskSensitive } from "@/lib/privacy"
import { detectEmergencyKeys } from "@/features/emergency/lib/detectEmergency"
import type { EmergencyKey } from "@/features/emergency/types"
import { errorFromCode } from "../client"
import { AI_DEV_URL, TIMEOUT } from "../config"
import type {
  AssistantReply, ChatMessage, CompleteSolutionResponse, FactKey, NextQuestion, SolutionCard, SolutionDetail, SolutionFacts,
  SolutionListResponse, SolutionMessageRequest, SolutionMessageResponse, StartSolutionRequest, StartSolutionResponse,
  UpdateFactsRequest, UpdateFactsResponse, YesNoUnknown,
} from "../types"
import { mockCurrentUser, requireMockUser } from "./authMock"
import { checkVersion, delay, nextId, persistedMap, withSave } from "./delay"
import { CARD_CODE, institutionList, toCard } from "./guidesMock"
import { answerQuestion } from "@/features/emergency/lib/composeReply"

type MockSolution = {
  id: number; status: "ACTIVE" | "COMPLETED"; stateVersion: number; facts: SolutionFacts; extra: EmergencyKey[]; messages: ChatMessage[]
  /** 사용자가 직접 답하거나 고친 항목. "모름"으로 답한 항목도 여기 들어가서 다시 묻지 않아요 (백엔드 공유 11/17) */
  settled?: FactKey[]
  /** 답을 기다리는 AI 추가 질문 */
  pending?: { questionId: string; content: string; factKey: FactKey; question: string } | null
  qSeq?: number
  /** 마지막 AI 처리 결과 (SOL-02 복원용) */
  lastAssistant?: AssistantReply | null
  /** 회원으로 시작한 상담이면 회원 ID (비회원은 null → 마이페이지에 안 남아요) */
  ownerId?: number | null
  createdAt?: string
  completedAt?: string | null
}
const store = persistedMap<MockSolution>("wsid-mock-solutions")
const sessions = store.map
const QUESTIONS: Record<FactKey, string> = {
  transferredMoney: "혹시 상대에게 돈을 보내셨나요?",
  sharedInformation: "비밀번호·인증번호·신분증 사진 같은 정보를 알려 주셨나요?",
  installedApp: "상대가 알려 준 앱을 설치하셨나요?",
  contactContinues: "지금도 상대와 연락하고 계신가요?",
}
const FACT_KEY: Partial<Record<EmergencyKey, FactKey>> = { transfer: "transferredMoney", privacy: "sharedInformation", app: "installedApp" }
const OPTIONS: YesNoUnknown[] = ["YES", "NO", "UNKNOWN"]

function get(id: number) {
  const s = sessions.get(id)
  if (!s) throw errorFromCode(404, "SOLUTION_NOT_FOUND")
  return s
}
function applyText(s: MockSolution, raw: string) {
  // "경찰에 신고했어요", "112에 연락했어요"는 사칭 전화를 받은 게 아니라 신고했다는 뜻이라 상황 판단에서 빼요
  const text = raw.replace(/(경찰서?|112|사이버수사대|수사기관)(에|에서|으로|로|서)? ?(신고|접수|조사|상담|연락|문의|가|갔|다녀)[가-힣]*/g, " ")
  for (const k of detectEmergencyKeys(text)) {
    const f = FACT_KEY[k]
    if (f) s.facts[f] = "YES"
    else if (k !== "custom" && !s.extra.includes(k)) s.extra.push(k)
  }
  // "안 보냈어요"처럼 부정하면 NO로 (화면 키 검출은 부정을 '해당 없음'으로만 처리해서 여기서 따로 봐요)
  const NEGATED: [FactKey, RegExp][] = [
    ["transferredMoney", /(송금|이체|입금|돈).{0,8}(안 ?했|안 ?보냈|않았|안 ?줬|안 ?보냄)/],
    ["sharedInformation", /(개인정보|신분증|비밀번호|인증번호|정보).{0,8}(안 ?알려|안 ?줬|안 ?보냈|않았)/],
    ["installedApp", /(앱|설치).{0,8}(안 ?깔|안 ?했|않았|안 ?함)/],
  ]
  for (const [f, re] of NEGATED) if (re.test(text)) s.facts[f] = "NO"
  if (/연락이? ?(끊|두절)|연락.{0,4}안 ?(돼|됨|되|받)|차단했|잠수|답이 없/.test(text)) s.facts.contactContinues = "NO"
  else if (/(아직|계속|지금도|여전히).{0,6}(연락|문자|전화|카톡)/.test(text)) s.facts.contactContinues = "YES"
}
/** 사실 조합으로 카드 계산 (긴급 카드가 먼저) */
function cards(s: MockSolution): SolutionCard[] {
  // 중고거래(재화·용역 사기)는 통신사기피해환급법의 지급정지·환급 대상이 아니라서 '돈을 송금했어요'(지급정지 안내) 카드를 빼고,
  // 송금했다면 중고거래 카드를 긴급으로 올려요. (실제 서비스에서는 Spring 대응 규칙에서 같은 처리가 필요해요)
  const secondhand = s.extra.includes("trade")
  const keys: EmergencyKey[] = [
    ...(secondhand ? ["trade" as const] : []),
    ...(s.facts.transferredMoney === "YES" && !secondhand ? ["transfer" as const] : []),
    ...(s.facts.sharedInformation === "YES" ? ["privacy" as const] : []),
    ...(s.facts.installedApp === "YES" ? ["app" as const] : []),
    ...s.extra.filter((k) => k !== "trade"),
  ]
  return (keys.length ? keys : ["custom" as const]).map((k) => {
    const c = toCard(k)
    const priority = k === "trade" && s.facts.transferredMoney === "YES" ? "URGENT" : c.priority
    return { code: c.code, priority, title: c.title, institutionCodes: c.institutionCodes }
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
/** 질문이 어떤 사실과 관련 있는지 대충 고르는 규칙 (mock 전용) */
const TOPIC: [FactKey, RegExp][] = [
  ["transferredMoney", /돈|송금|이체|입금|계좌/],
  ["sharedInformation", /개인정보|비밀번호|인증번호|신분증|OTP|카드번호/i],
  ["installedApp", /앱|어플|apk|설치|링크/i],
  ["contactContinues", /연락|전화|문자|차단/],
]

const CARD_OF: Record<FactKey, EmergencyKey> = { transferredMoney: "transfer", sharedInformation: "privacy", installedApp: "app", contactContinues: "call" }
const reply = (status: AssistantReply["status"], answer: string | null = null, refs: FactKey[] = [], questionId: string | null = null): AssistantReply =>
  ({ status, questionId, answer, referenceCodes: refs.map((f) => toCard(CARD_OF[f]).code) })

/**
 * 지금 상황(사실·카드)에 맞춰 질문에 답해요. 화면 규칙 답변(composeReply)과 같은 의도별 답을 써서
 * "뭘 해야 돼요?", "신고했어요", "돌려받을 수 있어요?", "증거는?" 등 어떤 질문에도 상황에 맞는 답이 나와요.
 * 실제로는 Python AI(RAG)가 공식 자료로 답을 만들고 Spring이 검증해요.
 */
function situationAnswer(s: MockSolution, text: string): AssistantReply {
  const list = cards(s)
  const keyOf = Object.fromEntries(Object.entries(CARD_CODE).map(([k, code]) => [code, k as EmergencyKey]))
  const details = Object.fromEntries(list.map((c) => [c.code, toCard(keyOf[c.code])]))
  const answer = answerQuestion(text, { facts: { ...s.facts }, cards: list, nextQuestion: null }, details, institutionList())
  return { status: "ANSWERED", questionId: null, answer, referenceCodes: list.slice(0, 2).map((c) => c.code) }
}
/** 질문(QUESTION) 처리: 답에 꼭 필요한 사실을 아직 모르면 되묻고, 알면 상황에 맞게 답해요 */
function assistQuestion(s: MockSolution, text: string): AssistantReply {
  if (/주식|코인|투자|대출.{0,4}추천/.test(text)) return reply("UNABLE_TO_ANSWER")
  const topics = TOPIC.filter(([, re]) => re.test(text)).map(([f]) => f)
  const unknown = topics.find((f) => s.facts[f] === "UNKNOWN" && !(s.settled ?? []).includes(f))
  if (unknown) {
    s.qSeq = (s.qSeq ?? 0) + 1
    s.pending = { questionId: `q-${s.id}-${s.qSeq}`, content: CLARIFY[unknown], factKey: unknown, question: text }
    return reply("NEED_USER_INPUT", null, [], s.pending.questionId)
  }
  return situationAnswer(s, text)
}
/** 추가 질문에 대한 답(CLARIFICATION_ANSWER) 처리: 답으로 사실을 채운 뒤, 원래 질문에 상황에 맞게 답해요 */
function assistAnswer(s: MockSolution, questionId: string, text: string): AssistantReply {
  const p = s.pending
  if (!p || p.questionId !== questionId) throw errorFromCode(409, "QUESTION_NOT_FOUND")
  s.pending = null
  const no = /아니|안 ?했|않았|없어|안 ?보냈|안 ?깔/.test(text)
  const yes = !no && /네|예|응|맞|했|보냈|깔았|설치/.test(text)
  if (yes || no) {
    s.facts[p.factKey] = yes ? "YES" : "NO"
    settle(s, p.factKey)
  }
  const ans = situationAnswer(s, p.question)
  return !yes && !no ? { ...ans, answer: `정확히 기억나지 않아도 괜찮아요. ${ans.answer}` } : ans
}
/** 화면에 보이는 대응 카드로 사기 유형을 짐작해 AI 서버에 넘겨요 (중고거래면 환급 안내를 막으려고) */
function fraudTypeOf(s: MockSolution): string | null {
  // 유형 카드의 시작 문장이나 사용자가 쓴 말에서 사기 유형을 먼저 찾아요 (첫 설명이 가장 확실해서 앞에서부터)
  const RULES: [RegExp, string][] = [
    [/중고\s?거래|당근|번개장터|중고나라|직거래/, "SECONDHAND_TRADE"],
    [/리딩방|투자|코인|주식|가상자산/, "INVESTMENT_FRAUD"],
    [/대출|대환|저금리/, "LOAN_FRAUD"],
    [/가족|지인|엄마|아빠|딸|아들|메신저|카톡/, "MESSENGER_PHISHING"],
    [/검찰|경찰|금감원|금융감독원|수사관|기관.{0,4}사칭|카드\s?배송/, "INSTITUTION_IMPERSONATION"],
    [/문자|링크|택배|청첩장|부고/, "SMISHING"],
  ]
  for (const m of s.messages.filter((m) => m.sender === "USER")) {
    const hit = RULES.find(([re]) => re.test(m.content))
    if (hit) return hit[1]
  }
  if (s.extra.includes("trade")) return "SECONDHAND_TRADE"
  if (s.extra.includes("call")) return "INSTITUTION_IMPERSONATION"
  if (s.extra.includes("link")) return "SMISHING"
  return null
}
/**
 * (개발용) VITE_AI_DEV_URL 이 있으면 질문을 로컬 AI 쪽(/internal/ai/solutions/answer)으로 보내 AI 답을 받아요.
 * AI 레포의 `python scripts/try_assist.py --serve`(Spring 대역, 기본 http://127.0.0.1:8001)를 가리키면
 * 실제 서비스와 같은 /assist 흐름(근거 승인 → 답변)으로 답해요.
 * 실패하거나 설정이 없으면 null → 프론트 규칙 답변으로 대신해요.
 */
async function devAiAnswer(s: MockSolution, question: string): Promise<AssistantReply | null> {
  if (!AI_DEV_URL) return null
  try {
    const res = await fetch(`${AI_DEV_URL}/internal/ai/solutions/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // 최근 대화 6개를 같이 보내서 "둘 다 알려줘" 같은 질문도 앞 대화를 보고 이해하게 해요
      body: JSON.stringify({
        facts: { ...s.facts }, question, fraudType: fraudTypeOf(s),
        history: s.messages.slice(-6).map((m) => ({ role: m.sender === "USER" ? "USER" : "AI", content: m.content })).filter((m) => m.content),
      }),
      // 개발 대역(try_assist --serve)은 Spring처럼 PLAN·ANSWER 두 번을 불러서, 실제 서비스보다 오래 기다려요
      signal: AbortSignal.timeout(Math.max(TIMEOUT.aiTurn, 45_000)),
    })
    if (!res.ok) {
      console.warn(`[AI 서버] ${res.status} → 프론트 규칙 답변으로 대신해요`)
      return null
    }
    const r = (await res.json()) as { status: AssistantReply["status"]; answer: string | null; clarifyFactKey: FactKey | null; clarifyQuestion: string | null }
    console.info("[AI 서버] AI 답변", r)
    if (r.status === "NEED_USER_INPUT" && r.clarifyFactKey && r.clarifyQuestion) {
      s.qSeq = (s.qSeq ?? 0) + 1
      s.pending = { questionId: `q-${s.id}-${s.qSeq}`, content: r.clarifyQuestion, factKey: r.clarifyFactKey, question }
      return reply("NEED_USER_INPUT", null, [], s.pending.questionId)
    }
    if (r.status === "UNABLE_TO_ANSWER") return reply("UNABLE_TO_ANSWER")
    if (r.status === "ANSWERED" && r.answer) {
      // AI 근거 코드(REF_...)는 화면 카드 코드가 아니라서, 지금 보이는 대응 카드를 근거로 표시해요
      return { status: "ANSWERED", questionId: null, answer: r.answer, referenceCodes: cards(s).slice(0, 2).map((c) => c.code) }
    }
    return null
  } catch (e) {
    console.warn("[AI 서버] 연결 실패 → 프론트 규칙 답변으로 대신해요", e)
    return null
  }
}
/** AI 추가 질문이 있으면 그게 nextQuestion이에요(질문은 항상 하나). 없으면 사실 확인 질문 */
const questionOf = (s: MockSolution): NextQuestion | null => s.pending ? { factKey: null, content: s.pending.content, options: [] } : nextQuestion(s)

export const solutionsMock = withSave({
  async start(body: StartSolutionRequest): Promise<StartSolutionResponse> {
    await delay(750)
    const s: MockSolution = { id: nextId(), status: "ACTIVE", stateVersion: 0, facts: { transferredMoney: "UNKNOWN", sharedInformation: "UNKNOWN", installedApp: "UNKNOWN", contactContinues: "UNKNOWN" }, extra: [], messages: [],
      ownerId: mockCurrentUser()?.id ?? null, createdAt: new Date().toISOString(), completedAt: null }
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
    return { solutionId: s.id, status: s.status, stateVersion: s.stateVersion, facts: { ...s.facts }, responseCards: cards(s), nextQuestion: questionOf(s), messages: s.messages, assistant: s.lastAssistant ?? null }
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
      s.lastAssistant = null
      return { facts: { ...s.facts }, responseCards: cards(s), nextQuestion: questionOf(s), stateVersion: s.stateVersion, assistant: null }
    }
    const masked = maskSensitive(body.content.trim())
    if (/실패 ?테스트/.test(masked)) throw errorFromCode(503, "AI_SERVICE_UNAVAILABLE") // 재시도 흐름 확인용
    let assistant: AssistantReply | null = null
    if (body.purpose === "CLARIFICATION_ANSWER") {
      const original = s.pending?.question
      const local = assistAnswer(s, body.questionId, masked) // 답으로 사실을 채우고 규칙 답변도 만들어 둠
      assistant = (original ? await devAiAnswer(s, original) : null) ?? local
    } else if (body.purpose === "QUESTION") {
      // 투자 종목·대출 상품 추천처럼 대응 범위 밖인 질문만 바로 '답변 불가' (투자 사기 상담 질문은 AI로 보내요)
      const unableLocally = /(주식|코인|종목|투자|대출).{0,6}(추천|사도 ?돼|살까|오를까)/.test(masked)
      assistant = (unableLocally ? null : await devAiAnswer(s, masked)) ?? assistQuestion(s, masked)
    }
    else applyText(s, masked) // FACT_UPDATE(또는 purpose 없음): 지금 방식
    s.messages.push({ sender: "USER", inputKind: "TEXT", content: masked })
    const aiText = assistant?.status === "NEED_USER_INPUT" ? s.pending?.content : assistant?.answer
    if (aiText) s.messages.push({ sender: "AI", inputKind: "TEXT", content: aiText })
    s.lastAssistant = assistant
    s.stateVersion += 1
    return { facts: { ...s.facts }, responseCards: cards(s), nextQuestion: questionOf(s), stateVersion: s.stateVersion, assistant }
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
    return { facts: { ...s.facts }, responseCards: cards(s), nextQuestion: questionOf(s), stateVersion: s.stateVersion }
  },
  async complete(id: number): Promise<CompleteSolutionResponse> {
    await delay(150)
    const s = get(id)
    s.status = "COMPLETED"
    s.completedAt = new Date().toISOString()
    return { solutionId: s.id, status: s.status }
  },
  /** SOL-06(가안) 내가 마친 상담 목록 */
  async list(params: { size?: number; cursor?: string | null } = {}): Promise<SolutionListResponse> {
    await delay(200)
    const user = requireMockUser()
    const size = params.size ?? 10
    const mine = [...sessions.values()]
      .filter((s) => s.ownerId === user.id && s.status === "COMPLETED")
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
    const start = params.cursor ? Number(params.cursor) : 0
    const page = mine.slice(start, start + size)
    const first = (s: MockSolution) => s.messages.find((m) => m.sender === "USER")?.content ?? "피해 대응 상담"
    return {
      items: page.map((s) => ({ solutionId: s.id, status: s.status, title: first(s).slice(0, 40), createdAt: s.createdAt ?? "", completedAt: s.completedAt ?? null })),
      hasNext: start + size < mine.length,
      nextCursor: start + size < mine.length ? String(start + size) : null,
    }
  },
}, store.save)
