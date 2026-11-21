import type { ChoiceOption, MockAttachment, MockPage } from "@/api"
import type { UploadedImage } from "@/types/common"

// ───────── 화면이 쓰는 타입 (백엔드 훈련 API와 연결) ─────────
/**
 * 화면 단계. 서버의 phase(DISCOVERY·SCENARIO_READY·SIMULATION·RESULT)에 로딩 상태를 더한 것이에요.
 * loading: 훈련을 만들거나 불러오는 중 / discovery: 상황 대화 / generating: 시나리오 생성 중
 * ready: 시나리오 준비 완료 / chat: 가상 훈련 대화 / finishing: 종료·리포트 생성 중 / done: 종료됨
 */
export type SimStage = "idle" | "loading" | "failed" | "discovery" | "generating" | "ready" | "chat" | "finishing" | "done"

/** 채팅 한 줄 */
export type ChatLine = {
  key: string
  from: "ai" | "user"
  text: string
  /** AI가 준 선택지 (있으면 버튼으로 표시) */
  options?: ChoiceOption[]
  /** 내 메시지 아래 작은 안내 (예: 입력한 개인정보를 가렸다는 문구) */
  note?: string
  /** 이 대사와 함께 온 모의 페이지 링크 */
  mockAttachment?: MockAttachment
  mockPage?: MockPage
  /** 이 대사의 가상 앱 설치 링크([모의앱])를 눌렀는지 (실제 설치는 없음) */
  appClicked?: boolean
}
/** channel: 대화 화면 모양 (SMS 문자, MESSENGER 메신저, MARKET 중고거래 채팅, EMAIL, SNS) */
export type ScenarioChannel = "SMS" | "MESSENGER" | "MARKET" | "EMAIL" | "SNS"
export type ScenarioInfo = { title: string; description: string; senderName?: string | null; organizationName?: string | null; channel?: ScenarioChannel | null }

// ───────── 아래는 mock(서버 없는 데모) 데이터가 쓰는 타입 ─────────

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

export type InterviewAnswer = { question: string; answer: string; images?: UploadedImage[] }
