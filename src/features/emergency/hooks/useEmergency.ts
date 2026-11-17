import { useEffect, useRef, useState } from "react"
import { errorMessage, guidesApi, isStateConflict, solutionApi } from "@/api"
import type { FactKey, Institution, NextQuestion, ResponseCard, SolutionCard, SolutionFacts, YesNoUnknown } from "@/api"
import type { Page, UploadedImage } from "@/types/common"
import { maskSensitive } from "@/lib/privacy"
import type { AssistantMessage, EmergencyKey } from "../types"
import { SITUATION_TEXT } from "../types"

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
  const fetchCards = async (list: SolutionCard[]) => {
    const missing = list.map((c) => c.code).filter((code) => !cardDetails[code])
    if (!missing.length) return
    try {
      const got = await guidesApi.responseCards(missing)
      setCardDetails((prev) => ({ ...prev, ...Object.fromEntries(got.map((c) => [c.code, c])) }))
    } catch { /* 본문을 못 받으면 제목만 보여 줌 */ }
  }
  const applyResult = (r: { facts: SolutionFacts; responseCards: SolutionCard[]; nextQuestion?: NextQuestion | null; stateVersion: number }) => {
    versionRef.current = r.stateVersion
    setFacts(r.facts)
    setCards(r.responseCards)
    setNextQuestion(r.nextQuestion ?? null)
    void fetchCards(r.responseCards)
  }
  const resetSession = () => {
    idRef.current = null
    versionRef.current = 0
    setSolutionId(null)
    setFacts(null)
    setCards([])
    setNextQuestion(null)
    setMessages([])
    setCompleted(false)
    setError("")
  }
  const recover = async (err: unknown) => {
    if (isStateConflict(err) && idRef.current !== null) {
      try {
        const d = await solutionApi.detail(idRef.current)
        applyResult(d)
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
      applyResult(r)
      setMessages([
        { key: key(), from: "user", text: masked, images: attachments.length ? attachments : undefined },
        { key: key(), from: "assistant", text: masked !== description.trim() ? "입력하신 내용 중 민감정보는 가려서 처리했어요. 지금 상황에 필요한 대응 방법을 정리했어요. 가장 급한 조치부터 순서대로 안내할게요." : "지금 상황에 필요한 대응 방법을 정리했어요. 가장 급한 조치부터 순서대로 안내할게요." },
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
  const answer = async (q: NextQuestion, value: YesNoUnknown) => {
    const id = idRef.current
    if (id === null || typing) return
    setMessages((m) => [...m, { key: key(), from: "user", text: `${FACT_LABEL[q.factKey]}: ${ANSWER_LABEL[value]}` }])
    setTyping(true)
    setError("")
    try {
      const r = await solutionApi.message(id, { stateVersion: versionRef.current, inputKind: "CHOICE", factKey: q.factKey, selectedCode: value })
      applyResult(r)
      setMessages((m) => [...m, { key: key(), from: "assistant", text: r.nextQuestion ? "확인했어요. 대응 카드를 갱신했어요." : "확인할 내용을 모두 파악했어요. 위 대응 카드의 순서대로 진행해 주세요." }])
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
    setMessages((m) => [...m, { key: key(), from: "user", text: masked, images: attachments.length ? attachments : undefined }])
    setTyping(true)
    setError("")
    try {
      const content = attachments.length ? `${masked}${masked ? " " : ""}(사진 ${attachments.length}장 첨부함)` : masked
      const r = await solutionApi.message(id, { stateVersion: versionRef.current, inputKind: "TEXT", content })
      const before = cards.map((c) => c.code).join(",")
      applyResult(r)
      const changed = r.responseCards.map((c) => c.code).join(",") !== before
      setMessages((m) => [...m, { key: key(), from: "assistant", text: changed ? "새로 확인된 상황을 반영해 대응 카드를 갱신했어요. 가장 위의 조치부터 진행해 주세요." : "현재 안내된 조치를 우선 진행해 주세요. 판단이 어렵다면 아래 공식 기관에 직접 상담하는 것이 가장 안전합니다." }])
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
    try {
      const r = await solutionApi.updateFacts(id, { stateVersion: versionRef.current, changes: { [factKey]: value } })
      // 백엔드 공유(11/17): 응답의 nextQuestion으로 질문을 바꿔요(null이면 질문 숨김).
      // 아직 nextQuestion을 안 주는 서버라면(필드 자체가 없으면) 지금 질문을 그대로 둬요.
      applyResult({ ...r, nextQuestion: r.nextQuestion !== undefined ? r.nextQuestion : nextQuestion })
    } catch (err) {
      await recover(err)
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
