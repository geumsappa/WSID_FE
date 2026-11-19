import type { UploadedImage } from "@/types/common"

/** 서버 대응 카드 종류 (+ custom: 직접 설명). mock 데이터와 대응 카드 본문이 써요 */
export type EmergencyKey = "transfer" | "link" | "app" | "privacy" | "call" | "trade" | "custom"

/** 상담 화면의 대화 한 줄 */
export type AssistantMessage = {
  key: string
  from: "assistant" | "user"
  text: string
  images?: UploadedImage[]
  /** 도우미 말의 종류. clarification: AI 추가 질문 / answer: AI 답변 / unable: 답변 불가 안내 (없으면 일반 안내) */
  kind?: "clarification" | "answer" | "unable"
  /** AI 답변의 근거 카드 코드 (assistant.referenceCodes) */
  references?: string[]
}

/** 첫 화면 상황 카드(사기 유형 6종). 누르면 data/situationGuides.ts의 고정 안내가 나와요 */
export type SituationKey = "institution" | "loan" | "acquaintance" | "smishing" | "trade" | "investment"

/** mock 기관 데이터의 키 */
export type OrganizationKey = "police" | "cyber" | "fss" | "kisa" | "counterscam" | "pd" | "payinfo" | "msafer"
