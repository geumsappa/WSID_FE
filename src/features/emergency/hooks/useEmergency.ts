import { useEffect, useRef, useState } from "react"
import { errorMessage, guidesApi, isStateConflict, newRequestId, solutionApi } from "@/api"
import type { AssistantReply, FactKey, Institution, NextQuestion, ResponseCard, SolutionCard, SolutionDetail, SolutionFacts, SolutionMessageRequest, YesNoUnknown } from "@/api"
import type { Page, UploadedImage } from "@/types/common"
import { maskSensitive } from "@/lib/privacy"
import type { AssistantMessage, SituationKey } from "../types"
import { situationGuides } from "../data/situationGuides"
import { dedupeMessages, situationOfText } from "../lib/historyView"
import { composeReply, parseShortAnswer } from "../lib/composeReply"
import type { SolutionView } from "../lib/composeReply"

let seq = 0
const key = () => `em-${++seq}`
const FACT_LABEL: Record<FactKey, string> = { transferredMoney: "송금", sharedInformation: "정보 제공", installedApp: "앱 설치", contactContinues: "연락 지속" }
const ANSWER_LABEL: Record<YesNoUnknown, string> = { YES: "예", NO: "아니오", UNKNOWN: "모르겠어요" }
/** 확인 질문에 답했을 때 내 말풍선 (예: "송금: 예" 대신 "네, 보냈어요") */
const CHOICE_TEXT: Record<FactKey, Record<YesNoUnknown, string>> = {
  transferredMoney: { YES: "네, 보냈어요.", NO: "아니요, 안 보냈어요.", UNKNOWN: "잘 모르겠어요." },
  sharedInformation: { YES: "네, 알려 줬어요.", NO: "아니요, 안 알려 줬어요.", UNKNOWN: "잘 모르겠어요." },
  installedApp: { YES: "네, 설치했어요.", NO: "아니요, 설치 안 했어요.", UNKNOWN: "잘 모르겠어요." },
  contactContinues: { YES: "네, 아직 연락하고 있어요.", NO: "아니요, 연락이 끊겼어요.", UNKNOWN: "잘 모르겠어요." },
}
const SESSION_KEY = "wsid-solution-id" // 새로고침 후 상담을 이어 가려고 상담 번호만 보관(탭을 닫으면 사라짐)
const UNABLE_TEXT = "이 질문에는 정확히 답변드리기 어려워요. 위 대응 카드를 먼저 진행하시고, 아래 공식 기관에 직접 상담하시는 것이 가장 안전해요."

/** 입력창 모드. question: 새 질문 / fact: 상황 추가 설명 / answer: AI 추가 질문에 답하기 */
export type InputMode = "auto" | "question" | "fact" | "answer"

/** 질문처럼 보이는 말 (물음표, 어떻게·뭐·어디, ~나요, 알려줘 등) */
const QUESTION_LIKE = /\?|까\s*$|나요|어떻게|어떡|뭐|뭘|무엇|어디|언제|왜|되나|돼\s*$|돼요\s*$|알려\s?줘|알려\s?주세요|방법|할\s?수\s?있|가능/
/** 새로 생긴 상황을 말하는 것처럼 보이는 말 (송금·설치·정보 제공·연락 변화 등) */
const FACT_LIKE = /보냈|송금|이체|입금|깔았|설치했|알려\s?줬|넘겨\s?줬|개인정보|신분증|비밀번호|인증번호|링크.{0,4}눌|눌렀|연락이?\s?(끊|두절|안\s?돼|계속|또|다시)|차단|전화가?\s?(왔|또)|문자가?\s?(왔|또)/

/**
 * 입력 종류를 자동으로 정해요 (질문하기/상황 추가 설명 버튼 없이).
 * - 도우미가 되물은 질문이 있으면: 새 질문처럼 길게 묻지 않는 한 그 질문에 대한 답
 * - 상황 + 질문이 섞이면("앱도 깔았는데 어떻게 해요?"): 상황 반영 후 질문 (두 번 보냄)
 * - 상황만 말하면("앱도 깔았어") 상황 반영, 그 밖에는 질문으로 보내 도우미가 답해요
 */
function decideModes(text: string, awaitingAnswer: boolean, fixedGuide = false): ("question" | "fact" | "answer")[] {
  const isQuestion = QUESTION_LIKE.test(text)
  const hasFact = FACT_LIKE.test(text)
  // 유형 카드(고정 안내) 상담: 화면 카드는 바뀌지 않으니 상황은 조용히 저장만 하고, 답은 항상 AI가 해요
  // (상황 저장과 질문을 따로 보내면 서버 대화 기록에 같은 말이 두 번 남아서, 질문 한 번만 보내요)
  if (fixedGuide && !awaitingAnswer) return ["question"]
  if (awaitingAnswer) return isQuestion && text.length > 6 && !/^(네|예|응|아니|아뇨|모르)/.test(text) ? ["question"] : ["answer"]
  if (isQuestion && hasFact) return ["fact", "question"]
  // 상황만 말하면 상황 반영, 그 밖의 말("신고했어요", "또 돈 보내래")은 도우미가 답하도록 질문으로 보내요
  return hasFact && !isQuestion ? ["fact"] : ["question"]
}
type RequestId = ReturnType<typeof newRequestId>
type DistOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
/** stateVersion을 뺀 글 메시지 본문 (실패 시 같은 본문·requestId로 다시 보내려고 보관) */
/** 답을 기다리는 AI 추가 질문. 문장은 nextQuestion에서, id는 assistant.questionId에서 와요 */
export type PendingQuestion = { questionId: string; content: string; options: YesNoUnknown[] }
/** 응답의 assistant + nextQuestion에서 AI 추가 질문을 꺼내요. 아니면 null */
const aiQuestionOf = (r: { assistant?: AssistantReply | null; nextQuestion?: NextQuestion | null }): PendingQuestion | null =>
  r.assistant?.status === "NEED_USER_INPUT" && r.assistant.questionId && r.nextQuestion
    ? { questionId: r.assistant.questionId, content: r.nextQuestion.content, options: r.nextQuestion.options ?? [] }
    : null
type TextBody = DistOmit<Extract<SolutionMessageRequest, { inputKind: "TEXT" }>, "stateVersion">
const SITUATION_KEY = "wsid-solution-situation" // 유형 카드로 시작한 상담이면 그 유형 (새로고침 후에도 고정 안내를 보여 주려고)
const saveSessionId = (id: number | null) => {
  try { id === null ? sessionStorage.removeItem(SESSION_KEY) : sessionStorage.setItem(SESSION_KEY, String(id)) } catch { /* 무시 */ }
}
const saveSituation = (k: SituationKey | null) => {
  try { k === null ? sessionStorage.removeItem(SITUATION_KEY) : sessionStorage.setItem(SITUATION_KEY, k) } catch { /* 무시 */ }
}
const loadSituation = (): SituationKey | null => {
  try { const v = sessionStorage.getItem(SITUATION_KEY); return v && v in situationGuides ? v as SituationKey : null } catch { return null }
}

/**
 * 긴급(피해) 대응. 상담은 SOL-01~05, 카드 내용과 기관 정보는 GUIDE-03·04로 받아요. 로그인 없이 쓸 수 있어요.
 * 흐름: 상황 카드 선택 또는 직접 설명 → 서버가 피해 사실 추출 → 비어 있는 항목을 질문 → 대응 카드·기관 표시
 */
export function useEmergency(go: (next: Page) => void) {
  /** 사기 유형 카드로 시작했으면 그 유형. 채팅 화면이 서버 카드 대신 이 유형의 고정 안내를 보여 줘요 */
  const [situation, setSituation] = useState<SituationKey | null>(null)
  const situationRef = useRef<SituationKey | null>(null)
  const changeSituation = (k: SituationKey | null) => { situationRef.current = k; setSituation(k); saveSituation(k) }
  const [text, setText] = useState("")
  const [images, setImages] = useState<UploadedImage[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [solutionId, setSolutionId] = useState<number | null>(null)
  const [facts, setFacts] = useState<SolutionFacts | null>(null)
  const [cards, setCards] = useState<SolutionCard[]>([])
  const [cardDetails, setCardDetails] = useState<Record<string, ResponseCard>>({})
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [nextQuestion, setNextQuestion] = useState<NextQuestion | null>(null)
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [typing, setTyping] = useState(false)
  const [error, setError] = useState("")
  const [completed, setCompleted] = useState(false)
  /** 답을 기다리는 AI 추가 질문 (assistant.status = NEED_USER_INPUT일 때) */
  const [clarification, setClarification] = useState<PendingQuestion | null>(null)
  /** 실패한 글 메시지. "다시 보내기"로 같은 requestId를 써서 재전송해요 */
  const [failed, setFailed] = useState<{ body: TextBody; requestId: RequestId } | null>(null)
  const versionRef = useRef(0)
  const idRef = useRef<number | null>(null)
  const goRef = useRef(go)
  goRef.current = go

  // 기관 목록(GUIDE-04)은 한 번만 받아 둡니다.
  useEffect(() => {
    let alive = true
    guidesApi.institutions().then((list) => { if (alive) setInstitutions(list) }).catch(() => { /* 카드의 기관 코드만 보여 줌 */ })
    return () => { alive = false }
  }, [])
  // 새로고침으로 /emergency/chat에 다시 들어오면, 보관해 둔 상담 번호로 SOL-02를 불러 이어서 보여 줘요.
  useEffect(() => {
    let stored: number | null = null
    try { stored = Number(sessionStorage.getItem(SESSION_KEY)) || null } catch { /* 무시 */ }
    if (stored === null || window.location.pathname !== "/emergency/chat") return
    let alive = true
    solutionApi.detail(stored).then((d) => {
      if (!alive) return
      if (d.status !== "ACTIVE") { saveSessionId(null); return }
      idRef.current = d.solutionId
      setSolutionId(d.solutionId)
      // 유형 카드로 시작한 상담이면 고정 안내를 다시 보여 줘요 (탭 저장값이 없으면 첫 문장으로 알아내요)
      const k = loadSituation() ?? situationOfText(d.messages.find((m) => m.sender === "USER")?.content)
      situationRef.current = k
      setSituation(k)
      applyDetail(d)
      setMessages(restoreMessages(d))
      goRef.current("emergencyChat")
    }).catch(() => saveSessionId(null))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // 서버가 준 카드 코드로 카드 본문(GUIDE-03)을 받아 둡니다. 이미 받은 코드는 다시 요청하지 않아요.
  // 답변을 만들 때 카드 본문이 필요해서, 받은 본문 전체를 돌려줘요.
  // 응답 카드(SolutionCard[])도, AI 답변 근거 코드(string[])도 받을 수 있어요.
  const detailsRef = useRef<Record<string, ResponseCard>>({})
  const fetchCards = async (list: SolutionCard[] | string[]) => {
    const missing = list.map((c) => typeof c === "string" ? c : c.code).filter((code) => !detailsRef.current[code])
    if (missing.length) {
      try {
        const got = await guidesApi.responseCards(missing)
        detailsRef.current = { ...detailsRef.current, ...Object.fromEntries(got.map((c) => [c.code, c])) }
        setCardDetails(detailsRef.current)
      } catch { /* 본문을 못 받으면 제목만 보여 줌 */ }
    }
    return detailsRef.current
  }
  type Result = { facts: SolutionFacts; responseCards: SolutionCard[]; nextQuestion?: NextQuestion | null; stateVersion: number; explanation?: string | null }
  const applyResult = (r: Result) => {
    versionRef.current = r.stateVersion
    setFacts(r.facts)
    setCards(r.responseCards)
    setNextQuestion(r.nextQuestion ?? null)
    return fetchCards(r.responseCards)
  }
  /** 지금 화면 상태 (응답 전후 비교용) */
  const view = (): SolutionView => ({ facts, cards, nextQuestion })
  /** 응답을 화면에 반영하고, 무엇이 바뀌었는지·질문에 대한 답을 도우미 말로 만들어 돌려줘요 */
  const reflect = async (kind: "start" | "choice" | "text" | "correct", prev: SolutionView, r: Result, userText?: string, answered?: { factKey: FactKey; value: YesNoUnknown }) => {
    const details = await applyResult(r)
    const next: SolutionView = { facts: r.facts, cards: r.responseCards, nextQuestion: r.nextQuestion ?? null }
    return composeReply({ kind, prev, next, details, institutions, userText, explanation: r.explanation, answered, fixedGuide: situationRef.current !== null })
  }
  /** SOL-02 응답 반영. assistant가 NEED_USER_INPUT이면 기다리던 AI 질문도 되살려요 */
  const applyDetail = (d: SolutionDetail) => {
    if (d.assistant !== undefined) setClarification(aiQuestionOf(d))
    return applyResult(d)
  }
  /** 서버 대화 내역(ChatMessage)을 화면용 메시지로 바꿔요. 첫 설명 뒤에 안내 한 줄을 넣어 화면 배치를 맞춰요 */
  const restoreMessages = (d: SolutionDetail): AssistantMessage[] => {
    const list: AssistantMessage[] = dedupeMessages(d.messages).map((m) => ({ key: key(), from: m.sender === "USER" ? "user" : "assistant", text: m.content }))
    const intro: AssistantMessage = { key: key(), from: "assistant", text: "이전 상담을 이어서 보여 드려요. 아래 대응 카드부터 확인해 주세요." }
    if (list[0]?.from !== "user") return [{ key: key(), from: "user", text: "(이전 상담)" }, intro, ...list]
    return [list[0], intro, ...list.slice(1)]
  }
  const resetSession = () => {
    idRef.current = null
    versionRef.current = 0
    setSolutionId(null)
    setFacts(null)
    setCards([])
    detailsRef.current = {}
    setCardDetails({})
    setNextQuestion(null)
    setMessages([])
    setCompleted(false)
    setError("")
    setClarification(null)
    setFailed(null)
    saveSessionId(null)
    changeSituation(null)
  }
  const recover = async (err: unknown) => {
    if (isStateConflict(err) && idRef.current !== null) {
      try {
        const d = await solutionApi.detail(idRef.current)
        await applyDetail(d)
        setError("상태가 갱신됐어요. 다시 시도해 주세요.")
        return
      } catch { /* 아래로 */ }
    }
    setError(errorMessage(err))
  }

  /**
   * SOL-01 상담 시작. description은 상황 카드 문장 또는 직접 쓴 설명.
   * situation: 사기 유형 카드를 골라 시작했으면 그 유형 → 첫 안내는 정해진 문구(situationGuides.intro)를 보여 줘요 (AI 답 X).
   */
  const start = async (description: string, attachments: UploadedImage[] = [], situation?: SituationKey) => {
    const masked = maskSensitive(description.trim())
    if (!masked && !attachments.length) return
    resetSession()
    setAnalyzing(true)
    try {
      // 사진은 서버 API에 보낼 자리가 없어 장수만 설명에 덧붙여요(원본은 보내지 않음).
      const desc = attachments.length ? `${masked}${masked ? " " : ""}(사진 ${attachments.length}장 첨부함)` : masked
      const r = await solutionApi.start({ description: desc })
      idRef.current = r.solutionId
      setSolutionId(r.solutionId)
      saveSessionId(r.solutionId)
      if (situation) changeSituation(situation)
      const reply = situation
        ? (await applyResult(r), situationGuides[situation].intro) // 유형 카드 선택: 정해진 안내 문구
        : await reflect("start", { facts: null, cards: [], nextQuestion: null }, r) // 직접 입력: 파악한 내용에 맞춘 안내
      setMessages([
        { key: key(), from: "user", text: masked, images: attachments.length ? attachments : undefined },
        { key: key(), from: "assistant", text: masked !== description.trim() ? `입력하신 내용 중 민감정보는 가려서 처리했어요. ${reply}` : reply },
      ])
      setText("")
      setImages([])
      go("emergencyChat")
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setAnalyzing(false)
    }
  }
  const selectSituation = (k: SituationKey) => void start(situationGuides[k].startText, [], k)
  const analyze = () => void start(text, images)

  /** SOL-03 추가 질문에 답하기(선택지) */
  const answer = async (q: NextQuestion, value: YesNoUnknown, typed?: string) => {
    const id = idRef.current
    const factKey = q.factKey // AI 추가 질문에는 factKey가 없어서, 사실 확인 질문일 때만 처리해요
    if (id === null || typing || !factKey) return
    setMessages((m) => [...m, { key: key(), from: "user", text: typed ?? CHOICE_TEXT[factKey][value] }])
    setTyping(true)
    setError("")
    try {
      const prev = view()
      const r = await solutionApi.message(id, { stateVersion: versionRef.current, inputKind: "CHOICE", factKey, selectedCode: value })
      const reply = await reflect("choice", prev, r, undefined, { factKey, value })
      setMessages((m) => [...m, { key: key(), from: "assistant", text: reply }])
    } catch (err) {
      await recover(err)
    } finally {
      setTyping(false)
    }
  }
  /** 서버 응답의 assistant(AI 질문·답변)를 대화에 반영해요. assistant가 있을 때만 불러요 */
  const showAssistant = (r: { assistant?: AssistantReply | null; nextQuestion?: NextQuestion | null }) => {
    const say = (text: string, kind?: AssistantMessage["kind"], references?: string[]) =>
      setMessages((m) => [...m, { key: key(), from: "assistant", text, kind, references: references?.length ? references : undefined }])
    const a = r.assistant
    if (!a) return
    const q = aiQuestionOf(r)
    setClarification(q)
    if (q) { say(q.content, "clarification"); return }
    if (a.referenceCodes?.length) void fetchCards(a.referenceCodes) // 근거 카드 제목을 보여 주려고
    if (a.status === "ANSWERED" && a.answer) say(a.answer, "answer", a.referenceCodes)
    else say(UNABLE_TEXT, "unable")
  }
  /** SOL-03 글 메시지 전송(공통). 실패하면 본문·requestId를 보관해 "다시 보내기"를 띄워요 */
  const postText = async (body: TextBody, requestId: RequestId, silent = false): Promise<boolean> => {
    const id = idRef.current
    if (id === null) return false
    setTyping(true)
    setError("")
    setFailed(null)
    try {
      const prev = view()
      const r = await solutionApi.message(id, { ...body, stateVersion: versionRef.current }, requestId)
      if (silent) {
        await applyResult(r)
      } else if (r.assistant) {
        // AI 질문·답변(main): 서버 AI가 답하거나 되물어요
        await applyResult(r)
        showAssistant(r)
      } else {
        // 상황 설명이거나 assistant를 아직 안 보내는 서버(feature/emergency-reply): 규칙 기반 도우미 말
        setClarification(null)
        const reply = await reflect("text", prev, r, body.content)
        setMessages((m) => [...m, { key: key(), from: "assistant", text: reply }])
      }
      return true
    } catch (err) {
      // 409(상태 충돌)는 자동 재전송하지 않고 최신 상태만 불러와요. 그 밖의 실패는 같은 요청을 다시 보낼 수 있어요.
      if (!isStateConflict(err)) setFailed({ body, requestId })
      await recover(err)
      return false
    } finally {
      setTyping(false)
    }
  }
  /**
   * SOL-03 글로 질문·설명·답변하기.
   * mode: auto(기본, 자동 판단) / question → purpose QUESTION / fact → FACT_UPDATE / answer → CLARIFICATION_ANSWER(+questionId)
   */
  const send = async (raw: string, attachments: UploadedImage[] = [], requested: InputMode = "auto") => {
    const masked = maskSensitive(raw.trim())
    if (idRef.current === null || typing || (!masked && !attachments.length)) return
    // 사실 확인 질문에 "아뇨", "네" 처럼 짧게 글로 답하면 선택지를 누른 것과 똑같이 처리해요 (AI 질문에 답하는 중이면 제외)
    const fixed = situationRef.current !== null
    const factQ = !fixed && !clarification && nextQuestion?.factKey ? nextQuestion : null
    const modes = requested === "auto" ? decideModes(masked, !!clarification, fixed) : [requested]
    const short = factQ && !modes.includes("answer") && !attachments.length ? parseShortAnswer(masked) : null
    if (factQ && short && (factQ.options ?? ["YES", "NO", "UNKNOWN"]).includes(short)) {
      return answer(factQ, short, masked)
    }
    setMessages((m) => [...m, { key: key(), from: "user", text: masked, images: attachments.length ? attachments : undefined }])
    const content = attachments.length ? `${masked}${masked ? " " : ""}(사진 ${attachments.length}장 첨부함)` : masked
    for (const mode of modes) {
      const body: TextBody = mode === "answer" && clarification
        ? { inputKind: "TEXT", content, purpose: "CLARIFICATION_ANSWER", questionId: clarification.questionId }
        : { inputKind: "TEXT", content, purpose: mode === "fact" ? "FACT_UPDATE" : "QUESTION" }
      // 고정 안내 상담에서 상황 저장(fact) 뒤에 질문이 이어지면, 상황 저장에는 따로 답하지 않아요
      const ok = await postText(body, newRequestId(), fixed && mode === "fact" && modes.length > 1)
      if (!ok) break // 앞 요청이 실패하면 뒤 요청은 보내지 않아요 ("다시 보내기"로 이어서)
    }
  }
  /** 실패한 메시지를 같은 requestId로 다시 보내요 (말풍선은 다시 추가하지 않음) */
  const retry = () => {
    if (failed && !typing) void postText(failed.body, failed.requestId)
  }
  /** SOL-04 잘못 파악된 사실 정정 */
  const correctFact = async (factKey: FactKey, value: YesNoUnknown) => {
    const id = idRef.current
    if (id === null || typing) return
    setError("")
    setMessages((m) => [...m, { key: key(), from: "user", text: `${FACT_LABEL[factKey]} 항목을 '${ANSWER_LABEL[value]}'(으)로 고쳤어요` }])
    setTyping(true)
    try {
      const prev = view()
      const r = await solutionApi.updateFacts(id, { stateVersion: versionRef.current, changes: { [factKey]: value } })
      // 백엔드 공유(11/17): 응답의 nextQuestion으로 질문을 바꿔요(null이면 질문 숨김).
      // 아직 nextQuestion을 안 주는 서버라면(필드 자체가 없으면) 지금 질문을 그대로 둬요.
      const reply = await reflect("correct", prev, { ...r, nextQuestion: r.nextQuestion !== undefined ? r.nextQuestion : nextQuestion }, undefined, { factKey, value })
      setMessages((m) => [...m, { key: key(), from: "assistant", text: reply }])
    } catch (err) {
      await recover(err)
    } finally {
      setTyping(false)
    }
  }
  /** SOL-05 상담 종료 */
  const complete = async () => {
    const id = idRef.current
    if (id === null) return
    try { await solutionApi.complete(id); setCompleted(true); setClarification(null); saveSessionId(null) } catch (err) { setError(errorMessage(err)) }
  }
  const back = () => { resetSession(); go("emergency") }

  return {
    text, setText, images, setImages, analyzing, error,
    solutionId, facts, cards, cardDetails, institutions, messages, situation,
    /** 사실 확인 질문(예/아니오/모름 버튼). AI 추가 질문일 땐 null이고 clarification으로 보여 줘요 */
    // 유형 카드(고정 안내) 상담에서는 확인 질문을 묻지 않아요. 안내가 송금 여부와 상관없이 정해져 있고, 필요하면 AI가 되물어요
    nextQuestion: !situation && !clarification && nextQuestion?.factKey ? nextQuestion : null,
    /** 아직 확인 질문에 한 번도 답하지 않았으면 true (첫 질문 앞에 왜 묻는지 한 줄 덧붙이려고) */
    firstQuestion: !messages.some((m) => m.from === "user" && Object.values(CHOICE_TEXT).some((t) => Object.values(t).includes(m.text))), typing, completed, clarification, failed: failed !== null,
    selectSituation, analyze, answer, send, retry, correctFact, complete, back,
  }
}
export type Emergency = ReturnType<typeof useEmergency>