import type { UploadedImage } from "@/types/common"

/** 화면의 상황 카드 6종 (+ custom: 직접 설명). mock 데이터와 상황 카드 목록이 써요 */
export type EmergencyKey = "transfer" | "link" | "app" | "privacy" | "call" | "trade" | "custom"

/** 상담 화면의 대화 한 줄 */
export type AssistantMessage = {
  key: string
  from: "assistant" | "user"
  text: string
  images?: UploadedImage[]
  /** 도우미 말의 종류. clarification: AI 추가 질문 / answer: AI 답변 / unable: 답변 불가 안내 (없으면 일반 안내) */
  kind?: "clarification" | "answer" | "unable"
}

/** mock 기관 데이터의 키 */
export type OrganizationKey = "police" | "cyber" | "fss" | "kisa"

/** 상황 카드 → 상담 시작 때 서버에 보낼 설명 문장 */
export const SITUATION_TEXT: Record<Exclude<EmergencyKey, "custom">, string> = {
  transfer: "사기범으로 의심되는 상대에게 돈을 송금했어요.",
  link: "문자나 메신저로 받은 의심스러운 링크를 눌렀어요.",
  app: "상대가 알려 준 앱을 설치했어요.",
  privacy: "비밀번호나 인증번호 같은 개인정보를 상대에게 알려 줬어요.",
  call: "기관이나 지인을 사칭한 전화를 받았어요.",
  trade: "중고거래 중 사기가 의심돼요.",
}
