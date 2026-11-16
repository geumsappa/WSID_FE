// 리포트 화면이 쓰는 타입은 백엔드 응답(api/types.ts의 TrainingReport·ReportDetail·Evaluation) 그대로예요.
export type { Evaluation, ReportDetail, TrainingReport } from "@/api"

/** 규칙 기반 데모 분석(mock)이 만드는 결과. mock에서만 쓰여요 */
export type ConversationAnalysis = {
  score: number
  safe: string[]
  risky: string[]
  missed: string[]
  summary: string
  leaked?: string[]
}
