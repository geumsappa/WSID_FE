import { useEffect, useRef, useState } from "react"
import { errorMessage, guidesApi, isStateConflict, solutionApi } from "@/api"
import type { FactKey, Institution, NextQuestion, ResponseCard, SolutionCard, SolutionFacts, YesNoUnknown } from "@/api"
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
  const versionRef = useRef(0)
  const idRef = useRef<number | null>(null)

  // 기관 목록(GUIDE-04)은 한 번만 받아 둡니다.
  useEffect(() => {
    let alive = true
    guidesApi.institutions().then((list) => { if (alive) setInstitutions(list) }).catch(() => { /* 카드의 기관 코드만 보여 줌 */ })
    return () => { alive = false }
  }, [])
  // 서버가 준 카드 코드로 카드 본문(GUIDE-03)을 받아 둡니다. 이미 받은 코드는 다시 요청하지 않아요.
  // 답변을 만들 때 카드 본문이 필요해서, 받은 본문 전체를 돌려줘요.
  const detailsRef = useRef<Record<string, ResponseCard>>({})
  const fetchCards = async (list: SolutionCard[]) => {
    const missing = list.map((c) => c.code).filter((code) => !detailsRef.current[code])
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
  }
  const recover = async (err: unknown) => {
    if (isStateConflict(err) && idRef.current !== null) {
      try {
        const d = await solutionApi.detail(idRef.current)
        await applyResult(d)
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
    if (id === null || typing) return
    setMessages((m) => [...m, { key: key(), from: "user", text: typed ?? `${FACT_LABEL[q.factKey]}: ${ANSWER_LABEL[value]}` }])
    setTyping(true)
    setError("")
    try {
      const prev = view()
      const r = await solutionApi.message(id, { stateVersion: versionRef.current, inputKind: "CHOICE", factKey: q.factKey, selectedCode: value })
      const reply = await reflect("choice", prev, r, undefined, { factKey: q.factKey, value })
      setMessages((m) => [...m, { key: key(), from: "assistant", text: reply }])
    } catch (err) {
      await recover(err)
    } finally {
      setTyping(false)
    }
  }
  /** SOL-03 글로 추가 설명·질문하기 */
  const send = async (raw: string, attachments: UploadedImage[] = []) => {
    const id = idRef.current
    const masked = maskSensitive(raw.trim())
    if (id === null || typing || (!masked && !attachments.length)) return
    // 다음 질문에 "아뇨", "네" 처럼 짧게 글로 답하면 선택지를 누른 것과 똑같이 처리해요
    const short = nextQuestion && !attachments.length ? parseShortAnswer(masked) : null
    if (nextQuestion && short && nextQuestion.options.includes(short)) {
      return answer(nextQuestion, short, masked)
    }
    setMessages((m) => [...m, { key: key(), from: "user", text: masked, images: attachments.length ? attachments : undefined }])
    setTyping(true)
    setError("")
    try {
      const content = attachments.length ? `${masked}${masked ? " " : ""}(사진 ${attachments.length}장 첨부함)` : masked
      const prev = view()
      const r = await solutionApi.message(id, { stateVersion: versionRef.current, inputKind: "TEXT", content })
      const reply = await reflect("text", prev, r, masked)
      setMessages((m) => [...m, { key: key(), from: "assistant", text: reply }])
    } catch (err) {
      await recover(err)
    } finally {
      setTyping(false)
    }
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
    try { await solutionApi.complete(id); setCompleted(true) } catch (err) { setError(errorMessage(err)) }
  }
  const back = () => { resetSession(); go("emergency") }

  return {
    text, setText, images, setImages, analyzing, error,
    solutionId, facts, cards, cardDetails, institutions, nextQuestion, messages, typing, completed,
    selectSituation, analyze, answer, send, correctFact, complete, back,
  }
}
export type Emergency = ReturnType<typeof useEmergency>
