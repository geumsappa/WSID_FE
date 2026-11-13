export type ConversationAnalysis = {
  score: number
  safe: string[]
  risky: string[]
  missed: string[]
  summary: string
  leaked?: string[] // 훈련 중 입력한 개인정보 종류(값 없음). 예전에 저장한 리포트에는 없을 수 있어 선택 항목입니다.
}
