import { useEffect, useMemo, useRef, useState } from "react"
import type { Page, UploadedImage } from "@/types/common"
import { SIM_IMAGE_LIMITS } from "@/lib/image"
import { scrubPersonalInfo } from "@/lib/privacy"
import type { DemoAccount } from "@/features/auth/types"
import { analyzeConversation } from "@/features/report/lib/analyzeConversation"
import { scenarios } from "../data/scenarios"
import { createDemoReply, hasSafeEnding } from "../lib/demoReply"
import { countImages, readSimProgress, removeSimProgress, simProgressKey } from "../lib/progressStorage"
import { categoryFromContext, createEverydayOptions, createInterviewOptions } from "../lib/scenarioFactory"
import type { EverydayCategory, Scenario, SimProgress, SimStage, SimulationMessage, SimulationMode, SituationKey } from "../types"

// 시뮬레이션 진행 상태·이어하기 저장·대화 처리를 모두 담당합니다.
export function useSimulation(account: DemoAccount | null, page: Page, go: (next: Page) => void) {
  const [simStage, setSimStage] = useState<SimStage>("input")
  const [simMode, setSimMode] = useState<SimulationMode>("choose")
  const [everydayCategory, setEverydayCategory] = useState<EverydayCategory | null>(null)
  const [scenarioOptions, setScenarioOptions] = useState<Scenario[]>([])
  const [context, setContext] = useState("")
  const [selectedSituation, setSelectedSituation] =
    useState<SituationKey | null>(null)
  const [scenario, setScenario] = useState<Scenario>(scenarios.delivery)
  const [chatTyping, setChatTyping] = useState(false)
  const [chatMessages, setChatMessages] = useState<SimulationMessage[]>([])
  const [endConfirm, setEndConfirm] = useState(false)
  const simRun = useRef(0)
  const [contextImages, setContextImages] = useState<UploadedImage[]>([]) // 처음 상황 설명에 첨부한 사진(메모리에만 보관)
  const [restoredContextImageCount, setRestoredContextImageCount] = useState(0)
  const hydratedFor = useRef<string | null>(null) // 어느 계정의 진행 상태를 불러왔는지

  // 로그인한 계정의 진행 중 훈련을 불러옵니다(새로고침·재방문 시 복구).
  useEffect(() => {
    if (!account) return
    if (hydratedFor.current === account.email) return
    hydratedFor.current = account.email
    const saved = readSimProgress(account.email)
    if (!saved) return
    const stage: SimStage = saved.simStage === "loading" ? "input" : saved.simStage
    let messages = saved.chatMessages
    const userTurns = messages.filter((m) => m.from === "user").length
    // 상대 답변을 기다리던 중 새로고침했다면 답변을 이어서 붙여 줍니다.
    if (stage === "chat" && messages.length && messages[messages.length - 1].from === "user")
      messages = [...messages, { from: "contact", text: createDemoReply(messages[messages.length - 1].text, userTurns - 1, saved.scenario) }]
    simRun.current += 1
    setSimStage(stage === "chat" && userTurns >= 5 ? "complete" : stage)
    setSimMode(saved.simMode)
    setEverydayCategory(saved.everydayCategory)
    setScenarioOptions(saved.scenarioOptions)
    setContext(saved.context)
    setScenario(saved.scenario)
    setChatMessages(messages)
    setChatTyping(false)
    setContextImages([])
    setRestoredContextImageCount(saved.contextImageCount)
  }, [account])
  // 진행 중인 훈련(상황 선택·대화·완료)을 바뀔 때마다 저장합니다. 사진은 장수만 남깁니다.
  useEffect(() => {
    if (!account || hydratedFor.current !== account.email) return
    if (simStage !== "summary" && simStage !== "chat" && simStage !== "complete") return
    const progress: SimProgress = {
      version: 1,
      updatedAt: Date.now(),
      simStage,
      simMode,
      everydayCategory,
      scenarioOptions,
      context,
      scenario,
      chatMessages: chatMessages.map((m) => ({ from: m.from, text: m.text, imageCount: (m.images?.length ?? m.imageCount ?? 0) || undefined, leaked: m.leaked })),
      contextImageCount: contextImages.length + restoredContextImageCount,
    }
    try { localStorage.setItem(simProgressKey(account.email), JSON.stringify(progress)) } catch { /* 저장 공간 부족 시 이어하기만 생략 */ }
  }, [account, simStage, simMode, everydayCategory, scenarioOptions, context, scenario, chatMessages, contextImages, restoredContextImageCount])
  const analysis = useMemo(
    () => analyzeConversation(chatMessages),
    [chatMessages],
  )
  // removeSaved=false는 로그아웃처럼 화면 상태만 비우고 저장된 이어하기 기록은 남길 때 씁니다.
  const clearSimulation = (removeSaved = true) => {
    simRun.current += 1 // 진행 중이던 답변 타이머가 초기화 이후에 끼어들지 않도록 합니다.
    setSimStage("input")
    setSimMode("choose")
    setEverydayCategory(null)
    setScenarioOptions([])
    setContext("")
    setSelectedSituation(null)
    setChatMessages([])
    setChatTyping(false)
    setContextImages([])
    setRestoredContextImageCount(0)
    if (removeSaved && account) removeSimProgress(account.email)
  }
  const usedSimImages = contextImages.length + restoredContextImageCount + countImages(chatMessages)
  const savedProgress = account && page === "home" ? readSimProgress(account.email) : null
  const resumeInfo = savedProgress
    ? {
        title: savedProgress.simStage === "summary" ? "추천받은 상황 선택 중" : savedProgress.scenario.title,
        label:
          savedProgress.simStage === "complete"
            ? "훈련 완료 · 결과 리포트 확인 전"
            : savedProgress.simStage === "chat"
              ? `대화 진행 중 · ${savedProgress.chatMessages.filter((m) => m.from === "user").length}/5턴`
              : "상황 선택 단계",
        time: new Date(savedProgress.updatedAt).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" }),
      }
    : null
  const resetSimulation = () => {
    clearSimulation()
    go("simulation")
  }
  const confirmEndSimulation = () => {
    setEndConfirm(false)
    clearSimulation()
    go("home")
  }
  const createScenario = (interviewContext?: string, images: UploadedImage[] = []) => {
    const effectiveContext = interviewContext ?? context
    if (interviewContext !== undefined) setContextImages(images)
    if (simMode === "mine" && !effectiveContext.trim()) return
    if (simMode === "discover" && !everydayCategory) return
    setSimStage("loading")
    const category = simMode === "discover" ? everydayCategory! : categoryFromContext(effectiveContext)
    if (interviewContext !== undefined) setContext(interviewContext)
    const options = simMode === "mine" ? createInterviewOptions(effectiveContext) : createEverydayOptions(category, "")
    window.setTimeout(() => {
      setScenarioOptions(options)
      setScenario(options[0])
      setSimStage("summary")
    }, 450)
  }
  const startChat = (chosen?: Scenario) => {
    const active = chosen ?? scenario
    setScenario(active)
    setChatMessages([])
    setChatTyping(true)
    setSimStage("chat")
    const run = ++simRun.current
    window.setTimeout(() => {
      if (run !== simRun.current) return
      setChatMessages([{ from: "contact", text: active.opening }])
      setChatTyping(false)
    }, 550)
  }
  // 반환값: 전송을 막은 이유(없으면 빈 문자열)
  const sendSimulationMessage = (rawMessage: string, images: UploadedImage[] = []): string => {
    if ((!rawMessage.trim() && !images.length) || simStage !== "chat" || chatTyping) return ""
    // 개인정보 입력 여부는 기록하고(리포트 반영), 실제 값은 이 시점에 지워 어디에도 남기지 않습니다.
    const lastContact = [...chatMessages].reverse().find((m) => m.from === "contact")?.text ?? ""
    const askedForCode = /인증|비밀번호|코드|본인 확인|번호/.test(lastContact)
    const { text: message, types: leaked } = scrubPersonalInfo(rawMessage.trim().slice(0, 500), askedForCode)
    if (usedSimImages + images.length > SIM_IMAGE_LIMITS.max)
      return `사진은 훈련 한 번에 최대 ${SIM_IMAGE_LIMITS.max}장까지 보낼 수 있어요.`
    const userTurns = chatMessages.filter((item) => item.from === "user").length
    setChatMessages((items) => [...items, { from: "user", text: message, images: images.length ? images : undefined, leaked: leaked.length ? leaked : undefined }])
    setChatTyping(true)
    const run = simRun.current
    window.setTimeout(() => {
      if (run !== simRun.current) return
      const reply = leaked.length
        ? `${leaked.join(", ")} 확인 감사하다며, 처리를 마치려면 추가 확인이 필요하다고 다른 정보도 요구합니다.`
        : message
        ? createDemoReply(message, userTurns, scenario)
        : `보내주신 사진을 확인했다며, ${scenario.subject} 처리를 위해 지금 이 대화에서 바로 진행하자고 재촉합니다.`
      setChatMessages((items) => [...items, { from: "contact", text: reply }])
      setChatTyping(false)
      if (hasSafeEnding(message) || userTurns + 1 >= 5) setSimStage("complete")
    }, 700)
    return ""
  }
  // 로그아웃: 화면에서는 지우되, 다시 로그인하면 이어서 할 수 있게 저장 기록은 남깁니다.
  const resetForLogout = () => {
    clearSimulation(false)
    hydratedFor.current = null
  }
  return {
    simStage, simMode, setSimMode, everydayCategory, setEverydayCategory, scenarioOptions,
    context, setContext, selectedSituation, setSelectedSituation, scenario,
    chatTyping, chatMessages, contextImages, restoredContextImageCount,
    endConfirm, setEndConfirm, analysis, usedSimImages, resumeInfo,
    clearSimulation, resetSimulation, confirmEndSimulation, resetForLogout,
    createScenario, startChat, sendSimulationMessage,
  }
}
