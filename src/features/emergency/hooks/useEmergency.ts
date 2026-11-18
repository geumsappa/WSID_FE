import { useEffect, useRef, useState } from "react"
import { errorMessage, guidesApi, isStateConflict, newRequestId, solutionApi } from "@/api"
import type { AssistantReply, FactKey, Institution, NextQuestion, ResponseCard, SolutionCard, SolutionDetail, SolutionFacts, SolutionMessageRequest, YesNoUnknown } from "@/api"
import type { Page, UploadedImage } from "@/types/common"
import { maskSensitive } from "@/lib/privacy"
import type { AssistantMessage, EmergencyKey } from "../types"
import { SITUATION_TEXT } from "../types"
import { composeReply, parseShortAnswer } from "../lib/composeReply"
import type { SolutionView } from "../lib/composeReply"

let seq = 0
const key = () => `em-${++seq}`
const FACT_LABEL: Record<FactKey, string> = { transferredMoney: "송금", sharedInformation: "정보 제공", installedApp: "앱 설치", contactContinues: "연락 지속" }
const ANSWER_LABEL: Record<YesNoUnknown, string> = { YES: "예", NO: "아니오", UNKNOWN: "모르겠어요" }
const SESSION_KEY = "wsid-solution-id" // 새로고침 후 상담을 이어 가려고 상담 번호만 보관(탭을 닫으면 사라짐)
const UNABLE_TEXT = "이 질문에는 정확히 답변드리기 어려워요. 위 대응 카드를 먼저 진행하시고, 아래 공식 기관에 직접 상담하시는 것이 가장 안전해요."

/** 입력창 모드. question: 새 질문 / fact: 상황 추가 설명 / answer: AI 추가 질문에 답하기 */
export type InputMode = "question" | "fact" | "answer"
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
const saveSessionId = (id: number | null) => {
  try { id === null ? sessionStorage.removeItem(SESSION_KEY) : sessionStorage.setItem(SESSION_KEY, String(id)) } catch { /* 무시 */ }
}

/**
 * 긴급(피해) 대응. 상담은 SOL-01~05, 카드 내용과 기관 정보는 GUIDE-03·04로 받아요. 로그인 없이 쓸 수 있어요.
 * 흐름: 상황 카드 선택 또는 직접 설명 → 서버가 피해 사실 추출 → 비어 있는 항목을 질문 → 대응 카드·기관 표시
 */
export function useEmergency(go: (next: Page) => void) {
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
    return composeReply({ kind, prev, next, details, institutions, userText, explanation: r.explanation, answered })
  }
  /** SOL-02 응답 반영. assistant가 NEED_USER_INPUT이면 기다리던 AI 질문도 되살려요 */
  const applyDetail = (d: SolutionDetail) => {
    if (d.assistant !== undefined) setClarification(aiQuestionOf(d))
    return applyResult(d)
  }
  /** 서버 대화 내역(ChatMessage)을 화면용 메시지로 바꿔요. 첫 설명 뒤에 안내 한 줄을 넣어 화면 배치를 맞춰요 */
  const restoreMessages = (d: SolutionDetail): AssistantMessage[] => {
    const list: AssistantMessage[] = d.messages.map((m) => ({ key: key(), from: m.sender === "USER" ? "user" : "assistant", text: m.content }))
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

  /** SOL-01 상담 시작. description은 상황 카드 문장 또는 직접 쓴 설명 */
  const start = async (description: string, attachments: UploadedImage[] = []) => {
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
      const reply = await reflect("start", { facts: null, cards: [], nextQuestion: null }, r)
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
  const selectSituation = (k: Exclude<EmergencyKey, "custom">) => void start(SITUATION_TEXT[k])
  const analyze = () => void start(text, images)

  /** SOL-03 추가 질문에 답하기(선택지) */
  const answer = async (q: NextQuestion, value: YesNoUnknown, typed?: string) => {
    const id = idRef.current
    const factKey = q.factKey // AI 추가 질문에는 factKey가 없어서, 사실 확인 질문일 때만 처리해요
    if (id === null || typing || !factKey) return
    setMessages((m) => [...m, { key: key(), from: "user", text: typed ?? `${FACT_LABEL[factKey]}: ${ANSWER_LABEL[value]}` }])
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
  const postText = async (body: TextBody, requestId: RequestId) => {
    const id = idRef.current
    if (id === null) return
    setTyping(true)
    setError("")
    setFailed(null)
    try {
      const prev = view()
      const r = await solutionApi.message(id, { ...body, stateVersion: versionRef.current }, requestId)
      if (r.assistant) {
        // AI 질문·답변(main): 서버 AI가 답하거나 되물어요
        await applyResult(r)
        showAssistant(r)
      } else {
        // 상황 설명이거나 assistant를 아직 안 보내는 서버(feature/emergency-reply): 규칙 기반 도우미 말
        setClarification(null)
        const reply = await reflect("text", prev, r, body.content)
        setMessages((m) => [...m, { key: key(), from: "assistant", text: reply }])
      }
    } catch (err) {
      // 409(상태 충돌)는 자동 재전송하지 않고 최신 상태만 불러와요. 그 밖의 실패는 같은 요청을 다시 보낼 수 있어요.
      if (!isStateConflict(err)) setFailed({ body, requestId })
      await recover(err)
    } finally {
      setTyping(false)
    }
  }
  /**
   * SOL-03 글로 질문·설명·답변하기.
   * mode: question → purpose QUESTION / fact → FACT_UPDATE / answer → CLARIFICATION_ANSWER(+questionId)
   */
  const send = async (raw: string, attachments: UploadedImage[] = [], mode: InputMode = "question") => {
    const masked = maskSensitive(raw.trim())
    if (idRef.current === null || typing || (!masked && !attachments.length)) return
    // 사실 확인 질문에 "아뇨", "네" 처럼 짧게 글로 답하면 선택지를 누른 것과 똑같이 처리해요 (AI 질문에 답하는 중이면 제외)
    const factQ = !clarification && nextQuestion?.factKey ? nextQuestion : null
    const short = factQ && mode !== "answer" && !attachments.length ? parseShortAnswer(masked) : null
    if (factQ && short && (factQ.options ?? ["YES", "NO", "UNKNOWN"]).includes(short)) {
      return answer(factQ, short, masked)
    }
    setMessages((m) => [...m, { key: key(), from: "user", text: masked, images: attachments.length ? attachments : undefined }])
    const content = attachments.length ? `${masked}${masked ? " " : ""}(사진 ${attachments.length}장 첨부함)` : masked
    const body: TextBody = mode === "answer" && clarification
      ? { inputKind: "TEXT", content, purpose: "CLARIFICATION_ANSWER", questionId: clarification.questionId }
      : { inputKind: "TEXT", content, purpose: mode === "fact" ? "FACT_UPDATE" : "QUESTION" }
    await postText(body, newRequestId())
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
    solutionId, facts, cards, cardDetails, institutions, messages,
    /** 사실 확인 질문(예/아니오/모름 버튼). AI 추가 질문일 땐 null이고 clarification으로 보여 줘요 */
    nextQuestion: !clarification && nextQuestion?.factKey ? nextQuestion : null, typing, completed, clarification, failed: failed !== null,
    selectSituation, analyze, answer, send, retry, correctFact, complete, back,
  }
}
export type Emergency = ReturnType<typeof useEmergency>