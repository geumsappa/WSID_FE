import { useEffect, useRef, useState } from "react"
import { ApiError, errorMessage, isStateConflict, reportsApi, trainingApi } from "@/api"
import type { ActiveTrainingResponse, ChatMessage, ChoiceOption, MockPage, TrainingDetail, TrainingReport } from "@/api"
import type { Page } from "@/types/common"
import { SIM_IMAGE_LIMITS } from "@/lib/image"
import { scrubPersonalInfo } from "@/lib/privacy"
import type { Account } from "@/features/auth/types"
import { readLastFinished, readScenarioInfo, saveLastFinished, saveScenarioInfo } from "../lib/progressStorage"
import type { ChatLine, ScenarioInfo, SimStage } from "../types"
import { bubbleCount, containsMockLink, messageSegments, splitSpeaker } from "../components/TrainingMessageContent"
import { trainingChannel } from "../lib/mockPageSession"

let lineSeq = 0
const lineKey = () => `line-${++lineSeq}`
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
/** 말풍선 하나를 '입력 중…' 뒤에 보여 주기까지 기다리는 시간 (글이 길수록 조금 더) */
const typingDelay = (segment: string) => 650 + Math.min(segment.length * 30, 1500)
const toLine = (m: ChatMessage): ChatLine => ({
  key: lineKey(),
  from: m.sender === "AI" ? "ai" : "user",
  text: m.content,
  options: m.options?.length ? m.options : undefined,
  mockAttachment: m.mockAttachment ?? undefined,
})
const PHASE_LABEL: Record<string, string> = {
  DISCOVERY: "상황 대화 진행 중",
  SCENARIO_READY: "시나리오 준비 완료 · 훈련 시작 전",
  SIMULATION: "훈련 대화 진행 중",
}

/** 서버가 준 전체 메시지를 "상황 대화"와 "가상 훈련"으로 나눕니다. */
function splitMessages(d: TrainingDetail) {
  const all = d.messages ?? []
  if (all.some((m) => m.phase)) {
    return { discovery: all.filter((m) => m.phase === "DISCOVERY"), simulation: all.filter((m) => m.phase === "SIMULATION") }
  }
  // phase 표시가 없으면: 훈련 대화는 "첫 대사 1개 + 턴마다 2개"이므로 뒤에서부터 그만큼을 훈련 대화로 봅니다.
  if (d.phase === "SIMULATION" || d.phase === "RESULT") {
    const n = Math.min(all.length, d.turnCount * 2 + 1)
    return { discovery: all.slice(0, all.length - n), simulation: all.slice(all.length - n) }
  }
  return { discovery: all, simulation: [] }
}

/**
 * 금융사기 시뮬레이션의 상태와 동작. 전부 백엔드 훈련 API(TRN-01~11, RPT-01·02·05)로 움직입니다.
 * 흐름: 훈련 생성 → 상황 대화 → 시나리오 생성 → 가상 훈련 대화 → 종료 → 리포트
 * @param onUnauthorized 세션이 끝났을 때(401) 호출. 처리했으면 true
 */
export function useSimulation(
  account: Account | null,
  page: Page,
  go: (next: Page) => void,
  onUnauthorized: (err: unknown, destination: Page) => boolean,
) {
  const [stage, setStage] = useState<SimStage>("idle")
  const [trainingId, setTrainingId] = useState<number | null>(null)
  const [discoveryLines, setDiscoveryLines] = useState<ChatLine[]>([])
  const [canGenerate, setCanGenerate] = useState(false)
  const [scenario, setScenario] = useState<ScenarioInfo | null>(null)
  const [chatLines, setChatLines] = useState<ChatLine[]>([])
  const [turnCount, setTurnCount] = useState(0)
  const [shouldFinish, setShouldFinish] = useState(false)
  const [typing, setTyping] = useState(false)
  const [error, setError] = useState("")
  const [usedImages, setUsedImages] = useState(0)
  const [endConfirm, setEndConfirm] = useState(false)
  const [report, setReport] = useState<TrainingReport | null>(null)
  const [reportState, setReportState] = useState<"idle" | "loading" | "missing">("idle")
  const [saveNotice, setSaveNotice] = useState("")
  const [saving, setSaving] = useState(false)
  const [active, setActive] = useState<ActiveTrainingResponse>(null)
  const [bootTick, setBootTick] = useState(0)
  // 모의 페이지를 새 탭 대신 대화 화면 위 창으로 열어요 (모바일 팝업 차단·탭 혼동 방지)
  const [checkOpen, setCheckOpen] = useState(false)
  // 홈 유행 수법 카드에서 고른 상황 문장. 동의 후 상황 대화 첫 답변으로 보내고 비워요
  const [pendingPreset, setPendingPreset] = useState<string | null>(null)

  // 비동기 함수 안에서 "지금 값"이 필요한 것들은 ref에도 둡니다(state는 다음 렌더에야 바뀌기 때문).
  const idRef = useRef<number | null>(null)
  const versionRef = useRef(0)
  const freshRef = useRef(false) // true면 진행 중 훈련을 이어받지 않고 새로 만듭니다
  const bootingRef = useRef(false) // 개발 모드(StrictMode)에서 effect가 두 번 돌아도 한 번만 요청
  const queueRef = useRef<Promise<unknown>>(Promise.resolve()) // stateVersion이 꼬이지 않게 요청을 한 줄로 세웁니다

  /** 요청을 차례대로 실행합니다. 앞 요청이 끝나 stateVersion을 받은 뒤 다음 요청이 나가요. */
  const inOrder = <T,>(work: () => Promise<T>): Promise<T> => {
    const next = queueRef.current.then(work, work)
    queueRef.current = next.catch(() => undefined)
    return next
  }
  const fail = (err: unknown) => {
    if (onUnauthorized(err, "simulation")) return
    setError(errorMessage(err))
  }

  /**
   * 사기범 대사가 말풍선 여러 개면 실제 메신저처럼 '입력 중…'을 사이에 두고 하나씩 보여 줘요.
   * 이미 화면에 넣은 줄(key)의 reveal 값을 늘려 가요. 그동안은 typing 이 켜져 있어 입력이 막혀요.
   */
  const revealInTurn = async (key: string, raw: string) => {
    const segments = messageSegments(splitSpeaker(raw).body.replace(/\[퇴장\]/g, " "))
    for (let shown = 2; shown <= segments.length; shown++) {
      await sleep(typingDelay(segments[shown - 1]))
      setChatLines((lines) => lines.map((l) => l.key === key ? { ...l, reveal: shown } : l))
    }
    setChatLines((lines) => lines.map((l) => l.key === key ? { ...l, reveal: undefined } : l))
  }

  /** 답이 없을 때 상대가 재촉하는 말 (화면 연출만, 서버로 보내지 않아요). 대사마다 한 번, 대화 전체 2번까지 */
  const nudge = (text: string) => {
    setChatLines((lines) => {
      const last = lines[lines.length - 1]
      if (stage !== "chat" || !last || last.from !== "ai" || last.local || lines.filter((l) => l.local).length >= 2) return lines
      return [...lines, { key: lineKey(), from: "ai", text, local: true }]
    })
  }

  const resetLocal = () => {
    setCheckOpen(false)
    idRef.current = null
    versionRef.current = 0
    setTrainingId(null)
    setStage("idle")
    setDiscoveryLines([])
    setCanGenerate(false)
    setScenario(null)
    setChatLines([])
    setTurnCount(0)
    setShouldFinish(false)
    setTyping(false)
    setError("")
    setUsedImages(0)
    setEndConfirm(false)
  }

  /** 서버가 준 훈련 상태(TRN-03)를 화면 상태로 옮깁니다. */
  const applyDetail = (d: TrainingDetail) => {
    idRef.current = d.trainingId
    versionRef.current = d.stateVersion
    setTrainingId(d.trainingId)
    const parts = splitMessages(d)
    const disc = parts.discovery.map(toLine)
    const sim = parts.simulation.map(toLine)
    const target = d.phase === "DISCOVERY" ? disc : sim
    const last = target[target.length - 1]
    if (last && last.from === "ai" && !last.options && d.availableOptions?.length) last.options = d.availableOptions
    if (d.mockPage && sim.length) {
      const linked = sim.filter((line) => line.from === "ai" && containsMockLink(line.text))
      if (linked.length) linked.forEach((line) => { line.mockPage = d.mockPage! })
      else {
        const lastAi = [...sim].reverse().find((line) => line.from === "ai")
        if (lastAi) lastAi.mockPage = d.mockPage
      }
    }
    if (d.mockTransferDone) {
      sim.forEach((line) => {
        if (line.from === "ai" && /\[모의\s*계좌\]/.test(line.text)) line.transferDone = true
      })
    }
    if (d.mockAppClicked) {
      sim.forEach((line) => {
        if (line.from === "ai" && /\[모의\s*앱\]/.test(line.text)) line.appClicked = true
      })
    }
    setDiscoveryLines(disc)
    setChatLines(sim)
    setTurnCount(d.turnCount ?? 0)
    setShouldFinish(false)
    setScenario(d.scenario ?? readScenarioInfo(d.trainingId))
    // 서버가 '시나리오를 만들어도 된다'고 알려 주면 그 값을 따라요. 예전엔 답이 하나라도 있으면 버튼을 보여 줘서,
    // 정보가 부족한데 누르면 "현재 훈련 단계에서 사용할 수 없는 요청이에요" 오류가 났어요
    setCanGenerate(d.phase === "DISCOVERY" && (d.canGenerateScenario ?? disc.some((l) => l.from === "user")))
    setStage(d.phase === "DISCOVERY" ? "discovery" : d.phase === "SCENARIO_READY" ? "ready" : d.phase === "SIMULATION" ? "chat" : "done")
  }
  /** stateVersion이 어긋났을 때: 서버의 최신 상태를 다시 불러옵니다. */
  const reloadAfterConflict = async () => {
    const id = idRef.current
    if (id === null) return
    try {
      applyDetail(await trainingApi.detail(id))
      setError("다른 화면에서 진행된 내용이 있어 최신 상태를 불러왔어요. 다시 시도해 주세요.")
    } catch (err) {
      fail(err)
    }
  }
  const recover = async (err: unknown) => {
    if (isStateConflict(err)) await reloadAfterConflict()
    else fail(err)
  }

  // 시뮬레이션 화면에 들어오면: 진행 중인 훈련이 있으면 이어받고(TRN-02·03), 없으면 새로 만듭니다(TRN-01).
  useEffect(() => {
    if (!account || page !== "simulation") return
    if (idRef.current !== null || bootingRef.current) return
    bootingRef.current = true
    setStage("loading")
    setError("")
    void (async () => {
      try {
        const current = freshRef.current ? null : await trainingApi.active()
        freshRef.current = false
        if (current) {
          applyDetail(await trainingApi.detail(current.trainingId))
        } else {
          const created = await trainingApi.create()
          idRef.current = created.trainingId
          versionRef.current = created.stateVersion
          setTrainingId(created.trainingId)
          setDiscoveryLines([toLine(created.firstMessage)])
          setStage("discovery")
        }
        setActive(null)
      } catch (err) {
        setStage("failed")
        fail(err)
      } finally {
        bootingRef.current = false
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, page, bootTick])

  // 홈 화면: 진행 중인 훈련이 있는지 확인해 "이어서 하기"를 보여 줍니다(TRN-02).
  useEffect(() => {
    if (!account) { setActive(null); return }
    if (page !== "home") return
    let alive = true
    trainingApi.active().then((a) => { if (alive) setActive(a) }).catch(() => { if (alive) setActive(null) })
    return () => { alive = false }
  }, [account, page])

  // 결과 화면에서 새로고침했을 때: 방금 끝낸 훈련의 리포트를 다시 불러옵니다(RPT-01).
  useEffect(() => {
    if (!account || page !== "report" || report || reportState !== "idle") return
    const id = idRef.current ?? readLastFinished()
    if (id === null) { setReportState("missing"); return }
    setReportState("loading")
    trainingApi
      .report(id)
      .then((r) => { setReport(r); setReportState("idle") })
      .catch((err) => { setReportState("missing"); fail(err) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, page, report, reportState])

  /** 새 훈련 시작(홈의 시작 버튼, "다시 시뮬레이션 하기") */
  /** preset: 첫 답변으로 보낼 상황 문장 (버튼 onClick에 바로 연결되면 이벤트가 들어와서 글자일 때만 써요) */
  const startNew = (preset?: unknown) => {
    resetLocal()
    setPendingPreset(typeof preset === "string" && preset.trim() ? preset : null)
    setReport(null)
    setReportState("idle")
    setSaveNotice("")
    freshRef.current = true
    setBootTick((n) => n + 1)
    go("simulation")
  }
  /** 불러오기에 실패했을 때 다시 시도 */
  const retry = () => setBootTick((n) => n + 1)

  /** TRN-04 상황 대화 한 턴. 성공하면 true (실패하면 입력창에 글을 되돌려 놓기 위해) */
  const sendDiscovery = async (raw: string): Promise<boolean> => {
    const id = idRef.current
    if (id === null || typing || stage !== "discovery") return false
    // 상황 설명에는 실제 번호가 필요 없으므로, 값은 가리고 종류만 남긴 글을 보냅니다.
    const { text } = scrubPersonalInfo(raw.trim().slice(0, 500))
    if (!text) return false
    // 내 말풍선에는 쓴 그대로 보여 줘요 (이 화면 안에서만). 서버로는 가린 글(text)만 보내요
    const mine: ChatLine = { key: lineKey(), from: "user", text: raw.trim().slice(0, 500) }
    setError("")
    setDiscoveryLines((lines) => [...lines.map((l) => ({ ...l, options: undefined })), mine])
    setTyping(true)
    try {
      const res = await inOrder(() => trainingApi.discoveryMessage(id, { stateVersion: versionRef.current, content: text }))
      versionRef.current = res.stateVersion
      setDiscoveryLines((lines) => [...lines, toLine(res.reply)])
      setCanGenerate(res.canGenerateScenario)
      return true
    } catch (err) {
      setDiscoveryLines((lines) => lines.filter((l) => l.key !== mine.key))
      // Keep a valid session on transient AI/transport failure; the view restores its draft.
      // State-version conflicts still reconcile a request whose response was lost.
      if (err instanceof ApiError && (err.status === 503 || err.status === 0)) {
        setError("일시적으로 답변을 받지 못했어요. 대화와 입력은 유지했으니 잠시 후 다시 보내 주세요.")
        return false
      }
      await recover(err)
      return false
    } finally {
      setTyping(false)
    }
  }

  /** TRN-05 사진 첨부·문자 인식. 읽어낸 글을 돌려주고, 못 읽었으면 빈 문자열 */
  const uploadDiscoveryImages = async (files: File[]): Promise<{ text: string; usable: boolean } | null> => {
    const id = idRef.current
    if (id === null || stage !== "discovery" || !files.length) return null
    if (usedImages + files.length > SIM_IMAGE_LIMITS.max) {
      setError(`사진은 훈련 한 번에 최대 ${SIM_IMAGE_LIMITS.max}장까지 보낼 수 있어요.`)
      return null
    }
    for (const f of files) {
      if (!SIM_IMAGE_LIMITS.types.includes(f.type) && !SIM_IMAGE_LIMITS.ext.test(f.name)) { setError(`${f.name}: ${SIM_IMAGE_LIMITS.typeLabel} 파일만 첨부할 수 있어요.`); return null }
      if (f.size > SIM_IMAGE_LIMITS.maxBytes) { setError(`${f.name}: 사진 한 장은 ${SIM_IMAGE_LIMITS.sizeLabel} 이하여야 해요.`); return null }
    }
    setError("")
    setTyping(true)
    try {
      const res = await trainingApi.discoveryImages(id, files)
      setUsedImages((n) => n + files.length)
      return { text: res.usable ? res.recognizedText : "", usable: res.usable }
    } catch (err) {
      fail(err)
      return null
    } finally {
      setTyping(false)
    }
  }

  /** TRN-06 개인화 시나리오 생성 (최대 1분) */
  const generateScenario = async () => {
    const id = idRef.current
    if (id === null || stage !== "discovery") return
    setError("")
    setStage("generating")
    try {
      const res = await inOrder(() => trainingApi.scenario(id, { stateVersion: versionRef.current }))
      versionRef.current = res.stateVersion
      setScenario(res.scenario)
      saveScenarioInfo(id, res.scenario)
      setStage("ready")
    } catch (err) {
      setStage("discovery")
      // 서버가 아직 시나리오를 만들 만큼 정보가 없다고 하면: 버튼을 숨기고 대화를 더 이어 가게 안내해요
      if (err instanceof ApiError && err.code === "INVALID_TRAINING_PHASE") {
        setCanGenerate(false)
        setError("아직 시나리오를 만들 만큼 이야기가 모이지 않았어요. 질문에 조금 더 답해 주세요.")
        return
      }
      if (err instanceof ApiError && (err.status === 503 || err.status === 0)) {
        setError("시나리오를 받지 못했어요. 대화와 선택은 유지했으니 잠시 후 다시 만들어 주세요.")
        return
      }
      await recover(err)
    }
  }

  /** TRN-07 가상 훈련 시작 */
  const startTraining = async () => {
    const id = idRef.current
    if (id === null || stage !== "ready" || typing) return
    setError("")
    setTyping(true)
    try {
      const res = await inOrder(() => trainingApi.start(id, { stateVersion: versionRef.current }))
      versionRef.current = res.stateVersion
      const first = { ...toLine(res.firstMessage), options: res.availableOptions ?? res.firstMessage.options, mockPage: res.mockPage ?? undefined }
      const many = bubbleCount(first.text) > 1
      setChatLines([many ? { ...first, reveal: 1 } : first])
      setTurnCount(0)
      setShouldFinish(false)
      setStage("chat")
      if (many) await revealInTurn(first.key, first.text)
    } catch (err) {
      await recover(err)
    } finally {
      setTyping(false)
    }
  }

  /** TRN-08 훈련 대화 한 턴. 글을 직접 쓰거나(text) AI가 준 선택지(option)를 고릅니다. */
  const sendTraining = async (input: { text: string } | { option: ChoiceOption }): Promise<boolean> => {
    const id = idRef.current
    if (id === null || typing || stage !== "chat") return false
    let mine: ChatLine
    let body: { inputKind: "TEXT"; content: string } | { inputKind: "CHOICE"; selectedCode: string }
    if ("option" in input) {
      // 사진 보내기는 말풍선 글 없이 사진만 보여 줘요 (실제 메신저처럼)
      mine = { key: lineKey(), from: "user", text: input.option.mockAttachment ? "" : input.option.label,
        mockAttachment: input.option.mockAttachment ?? undefined,
        note: undefined }
      body = { inputKind: "CHOICE", selectedCode: input.option.code }
    } else {
      const content = input.text.trim().slice(0, 500)
      if (!content) return false
      // 1차 가림: 개인정보는 브라우저에서 [전화번호]·[이름] 같은 표시로 바꾼 뒤에 보내요 (원문은 이 기기를 떠나지 않아요).
      // 서버는 이 표시를 보고 "어떤 정보를 넘겼는지"를 판정하고, 한 번 더 가려요 (백엔드·AI 서버 2·3차 가림).
      const lastAi = [...chatLines].reverse().find((l) => l.from === "ai" && !l.local)?.text ?? ""
      const prevUser = [...chatLines].reverse().find((l) => l.from === "user")?.text ?? ""
      const shown = scrubPersonalInfo(content, /인증번호|OTP|보안카드|비밀번호/.test(lastAi), { lastAi, prevUser })
      // 내 말풍선에는 내가 쓴 그대로 보여 줘요 (이 화면 안에서만). 서버·AI로는 가린 글(shown.text)만 보내요
      mine = { key: lineKey(), from: "user", text: content }
      body = { inputKind: "TEXT", content: shown.text }
    }
    setError("")
    setChatLines((lines) => [...lines.map((l) => ({ ...l, options: undefined })), mine])
    setTyping(true)
    try {
      const res = await inOrder(() => trainingApi.message(id, { stateVersion: versionRef.current, ...body }))
      versionRef.current = res.stateVersion
      // 서버(AI)가 한 번 더 가린 문장(maskedInput)은 서버 저장용이에요. 내 말풍선은 쓴 그대로 둬요
      const reply = { ...toLine(res.reply), mockPage: res.mockPage ?? undefined }
      const many = bubbleCount(reply.text) > 1
      setChatLines((lines) => [...lines, many ? { ...reply, reveal: 1 } : reply])
      setTurnCount(res.turnCount)
      if (many) await revealInTurn(reply.key, reply.text)
      setShouldFinish(res.shouldFinish)
      return true
    } catch (err) {
      setChatLines((lines) => lines.filter((l) => l.key !== mine.key))
      await recover(err)
      return false
    } finally {
      setTyping(false)
    }
  }

  /**
   * 대화 속 가상 앱 설치 링크([모의앱])를 눌렀을 때. 실제로는 아무것도 내려받지 않고,
   * 눌렀다는 사실(MOCK_APP_CLICK)만 서버에 남겨 리포트에 반영해요.
   */
  const clickMockApp = async (key: string) => {
    const id = idRef.current
    if (id === null || stage !== "chat") return
    setChatLines((lines) => lines.map((l) => l.key === key
      ? { ...l, appClicked: true } : l))
    const record = async () => {
      const res = await inOrder(() => trainingApi.action(id, { stateVersion: versionRef.current, actionCode: "MOCK_APP_CLICK" }))
      versionRef.current = res.stateVersion
    }
    try {
      await record()
    } catch (err) {
      if (isStateConflict(err)) {
        try {
          const detail = await trainingApi.detail(id)
          versionRef.current = detail.stateVersion
          await record()
          return
        } catch { /* 아래 안내로 넘어가요 */ }
      }
      setError("앱 링크를 누른 기록을 남기지 못했어요. 잠시 후 다시 눌러 주세요.")
      setChatLines((lines) => lines.map((l) => l.key === key ? { ...l, appClicked: false, note: undefined } : l))
    }
  }

  /**
   * 대화 속 훈련용 계좌([모의계좌])의 "송금하기"를 눌렀을 때. 실제로 돈은 나가지 않고,
   * 눌렀다는 사실(MOCK_TRANSFER)만 서버에 남겨 사기범의 다음 말과 리포트에 반영해요.
   */
  const clickMockTransfer = async (key: string) => {
    const id = idRef.current
    if (id === null || stage !== "chat") return
    setChatLines((lines) => lines.map((l) => l.key === key
      ? { ...l, transferDone: true } : l))
    const record = async () => {
      const res = await inOrder(() => trainingApi.action(id, { stateVersion: versionRef.current, actionCode: "MOCK_TRANSFER" }))
      versionRef.current = res.stateVersion
    }
    try {
      await record()
    } catch (err) {
      if (isStateConflict(err)) {
        try {
          const detail = await trainingApi.detail(id)
          versionRef.current = detail.stateVersion
          await record()
          return
        } catch { /* 아래 안내로 넘어가요 */ }
      }
      setError("송금 버튼을 누른 기록을 남기지 못했어요. 잠시 후 다시 눌러 주세요.")
      setChatLines((lines) => lines.map((l) => l.key === key ? { ...l, transferDone: false, note: undefined } : l))
    }
  }

  /** 모의 페이지 창 열기. 창 안의 화면이 자기 행동(열기·제출·닫기)을 직접 기록해요. */
  const showMockPage = (_fallback?: MockPage) => {
    const id = idRef.current
    if (id === null || stage !== "chat") return
    setCheckOpen(true)
  }
  const closeMockPage = () => setCheckOpen(false)

  // The separate tab records its own actions. Refresh only the authoritative version,
  // so returning to this tab does not discard chat lines or submit an outdated version.
  useEffect(() => {
    if (trainingId === null || stage !== "chat") return
    const id = trainingId
    const refresh = () => { void inOrder(async () => {
      const detail = await trainingApi.detail(id)
      if (idRef.current === id) versionRef.current = detail.stateVersion
    }).catch(() => undefined) }
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(trainingChannel(id)) : null
    if (channel) channel.onmessage = (event) => { if (event.data?.type === "state-changed") refresh() }
    window.addEventListener("focus", refresh)
    return () => { channel?.close(); window.removeEventListener("focus", refresh) }
  }, [trainingId, stage])
  /** TRN-11 훈련 종료 → RPT-01 결과 조회 → 리포트 화면으로 */
  const finish = async () => {
    const id = idRef.current
    if (id === null || (stage !== "chat" && stage !== "done")) return
    setEndConfirm(false)
    setError("")
    // 이미 끝난 훈련(새로고침·다른 탭에서 종료, 또는 종료는 됐는데 리포트 조회만 실패)이면 종료 요청 없이 리포트만 다시 불러와요
    const alreadyFinished = stage === "done"
    setStage("finishing")
    let finished = alreadyFinished
    try {
      if (!alreadyFinished) {
        await inOrder(() => trainingApi.finish(id, { stateVersion: versionRef.current, reason: "USER_FINISH" }))
        finished = true
        saveLastFinished(id)
      }
      setSaveNotice("")
      setReport(await trainingApi.report(id))
      setReportState("idle")
      setStage("done")
      go("report")
    } catch (err) {
      if (finished) {
        // 훈련은 서버에서 끝났어요 → 대화로 되돌리지 않고, 버튼으로 리포트만 다시 불러오게 해요
        setStage("done")
        fail(err)
        return
      }
      setStage("chat")
      await recover(err)
    }
  }
  /** 상황 대화·시나리오 단계에서 나가기: 평가할 훈련이 없으므로 종료 처리 없이 홈으로(서버에는 남아 이어서 할 수 있어요) */
  const leave = () => {
    setEndConfirm(false)
    resetLocal()
    go("home")
  }

  /** RPT-02 내 리포트에 저장 */
  const saveReport = async () => {
    if (!report || saving) return
    if (report.saved) { setSaveNotice("이미 내 리포트에 저장되어 있어요."); return }
    setSaving(true)
    setSaveNotice("")
    try {
      await reportsApi.save(report.reportId)
      setReport({ ...report, saved: true })
      setSaveNotice("리포트를 마이페이지에 저장했어요.")
    } catch (err) {
      if (!onUnauthorized(err, "report")) setSaveNotice(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }
  /** RPT-05 PDF 다운로드 (저장한 리포트만 가능) */
  const downloadPdf = async () => {
    if (!report?.saved) return
    try { await reportsApi.downloadPdf(report.reportId) } catch (err) { if (!onUnauthorized(err, "report")) setSaveNotice(errorMessage(err)) }
  }

  /** 로그아웃: 화면 상태만 비웁니다. 진행 중인 훈련은 서버에 남아 다시 로그인하면 이어서 할 수 있어요. */
  const resetForLogout = () => {
    resetLocal()
    setReport(null)
    setReportState("idle")
    setSaveNotice("")
    setActive(null)
    saveLastFinished(null)
  }

  const resumeInfo = active
    ? {
        title: readScenarioInfo(active.trainingId)?.title ?? "진행 중인 훈련",
        label: PHASE_LABEL[active.phase] ?? "진행 중",
        time: new Date(active.lastActivityAt).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" }),
      }
    : null

  return {
    stage, trainingId, discoveryLines, canGenerate, scenario, chatLines, turnCount, shouldFinish, typing, error,
    usedImages, endConfirm, setEndConfirm, report, reportState, saveNotice, saving, resumeInfo,
    startNew, retry, sendDiscovery, pendingPreset, clearPreset: () => setPendingPreset(null), uploadDiscoveryImages, generateScenario, startTraining, sendTraining,
    showMockPage, closeMockPage, checkOpen, clickMockApp, clickMockTransfer, finish, leave, saveReport, downloadPdf, resetForLogout, nudge,
    clearError: () => setError(""),
  }
}
export type Simulation = ReturnType<typeof useSimulation>
