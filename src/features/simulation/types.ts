import type { UploadedImage } from "@/types/common"

export type SimStage = "input" | "loading" | "summary" | "chat" | "complete"

export type SituationKey = "trade" | "delivery" | "loan" | "job" | "institution"

export type Scenario = {
  key: SituationKey
  title: string
  description: string
  opening: string
  subject: string
}
export interface SimulationMessage {
  from: "contact" | "user"
  text: string
  images?: UploadedImage[]
  imageCount?: number // 새로고침 후 복구된 메시지: 사진 원본은 저장하지 않고 장수만 남깁니다.
  leaked?: string[] // 이 메시지에서 입력한 개인정보 "종류"만 기록합니다(실제 값은 저장하지 않음).
}
export interface SituationOption {
  key: SituationKey
  label: string
}

export type SimulationMode = "choose" | "mine" | "discover"
export type EverydayCategory = "shopping" | "job" | "finance" | "housing" | "travel" | "social"

export type SimProgress = {
  version: 1
  updatedAt: number
  simStage: SimStage
  simMode: SimulationMode
  everydayCategory: EverydayCategory | null
  scenarioOptions: Scenario[]
  context: string
  scenario: Scenario
  chatMessages: SimulationMessage[]
  contextImageCount: number
}

export type InterviewAnswer = { question: string; answer: string; images?: UploadedImage[] }

export type SimulationProps = {
  stage: SimStage
  context: string
  setContext: (value: string) => void
  selectedSituation: SituationKey | null
  setSelectedSituation: (value: SituationKey | null) => void
  scenario: Scenario
  simMode: SimulationMode
  setSimMode: (value: SimulationMode) => void
  everydayCategory: EverydayCategory | null
  setEverydayCategory: (value: EverydayCategory | null) => void
  scenarioOptions: Scenario[]
  chatTyping: boolean
  chatMessages: SimulationMessage[]
  onCreate: () => void
  onInterviewComplete: (context: string, images: UploadedImage[]) => void
  usedImages: number
  contextImages: UploadedImage[]
  restoredContextImageCount: number
  onReset: () => void
  onStart: (scenario?: Scenario) => void
  onSend: (message: string, images: UploadedImage[]) => string
  onEnd: () => void
  onReport: () => void
}
