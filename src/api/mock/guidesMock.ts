// 서버 없이 가이드 API를 흉내 냅니다. 화면에 이미 있는 대응 카드·기관 데이터를 노션 형식으로 바꿔 돌려줘요.
// ⚠️ 코드 값(TRANSFER_RESPONSE, POLICE 등)은 노션 예시에 나온 것 말고는 mock용으로 만든 것이에요.
import { emergencyData } from "@/features/emergency/data/emergencyData"
import { organizationData } from "@/features/emergency/data/organizations"
import type { EmergencyKey } from "@/features/emergency/types"
import { errorFromCode } from "../client"
import type { FraudTypeDetail, FraudTypeSummary, Institution, ResponseCard } from "../types"
import { delay } from "./delay"

/** 화면의 상황 키 ↔ 대응 카드 코드 */
export const CARD_CODE: Record<EmergencyKey, string> = {
  transfer: "TRANSFER_RESPONSE",
  privacy: "PERSONAL_INFO_RESPONSE",
  app: "MALICIOUS_APP_RESPONSE",
  link: "SUSPICIOUS_LINK_RESPONSE",
  call: "IMPERSONATION_CALL_RESPONSE",
  trade: "SECONDHAND_TRADE_RESPONSE",
  custom: "GENERAL_RESPONSE",
}
const INSTITUTION_CODE: Record<keyof typeof organizationData, string> = { police: "POLICE", cyber: "CYBER_POLICE", fss: "FSS", kisa: "KISA" }
export const URGENT_KEYS: EmergencyKey[] = ["transfer", "privacy", "app"]

const FRAUD_TYPES: FraudTypeDetail[] = [
  { code: "MESSENGER_PHISHING", name: "메신저피싱", description: "지인·가족을 사칭해 송금이나 정보를 요구해요.", examples: ["지인·가족 사칭"], warningSignals: ["갑자기 번호가 바뀌었다는 연락", "급한 송금 요청"], preventionTips: ["전화로 본인 확인", "송금 전 멈추기"], references: [] },
  { code: "SMISHING", name: "스미싱", description: "문자 속 링크로 앱 설치나 정보 입력을 유도해요.", examples: ["택배 사칭", "부고·청첩장 사칭"], warningSignals: ["문자 속 낯선 링크"], preventionTips: ["링크 누르지 않기", "118 상담"], references: [] },
  { code: "LOAN_FRAUD", name: "대출빙자", description: "저금리 대출을 미끼로 수수료나 정보를 요구해요.", examples: ["대출 사기"], warningSignals: ["선입금·수수료 요구"], preventionTips: ["금융회사 공식 번호로 확인"], references: [] },
  { code: "INSTITUTION_IMPERSONATION", name: "기관사칭", description: "공공기관을 사칭해 정보나 송금을 요구해요.", examples: ["공공기관 사칭"], warningSignals: ["안전 조치 명목의 이체 요구"], preventionTips: ["전화 끊고 대표번호로 확인"], references: [] },
  { code: "INVESTMENT_FRAUD", name: "투자·가상자산", description: "고수익을 내세워 투자금을 받아 가요.", examples: ["투자 리딩방"], warningSignals: ["원금 보장·고수익 약속"], preventionTips: ["제도권 금융회사인지 조회"], references: [] },
  { code: "SECONDHAND_TRADE", name: "중고거래 관련 사기", description: "중고거래 중 발생할 수 있는 위험 유형", examples: ["선입금 후 연락 두절"], warningSignals: ["안전결제 거부", "플랫폼 밖 거래 유도"], preventionTips: ["안전결제 이용"], references: [] },
  { code: "JOB_SCAM", name: "채용·아르바이트 사기", description: "채용을 미끼로 비용이나 정보를 요구해요.", examples: ["재택 부업 제안"], warningSignals: ["교육비·보증금 요구"], preventionTips: ["회사 정보 직접 확인"], references: [] },
]

export function toCard(key: EmergencyKey): ResponseCard {
  const d = emergencyData[key]
  return {
    code: CARD_CODE[key],
    title: d.title,
    priority: URGENT_KEYS.includes(key) ? "URGENT" : "NORMAL",
    actions: d.steps,
    requiredMaterials: [],
    institutionCodes: d.organizations.map((o) => INSTITUTION_CODE[o]),
    sourceReferences: [],
    reviewedAt: null,
  }
}

export const guidesMock = {
  async fraudTypes(): Promise<FraudTypeSummary[]> {
    await delay(150)
    return FRAUD_TYPES.map(({ code, name, description }) => ({ code, name, description }))
  },
  async fraudType(code: string): Promise<FraudTypeDetail> {
    await delay(150)
    const item = FRAUD_TYPES.find((t) => t.code === code)
    if (!item) throw errorFromCode(404, "GUIDE_NOT_FOUND")
    return item
  },
  async responseCards(codes?: string[]): Promise<ResponseCard[]> {
    await delay(150)
    const all = (Object.keys(emergencyData) as EmergencyKey[]).map(toCard)
    return codes?.length ? all.filter((c) => codes.includes(c.code)) : all
  },
  async institutions(): Promise<Institution[]> {
    await delay(150)
    return (Object.keys(organizationData) as (keyof typeof organizationData)[]).map((k) => ({
      code: INSTITUTION_CODE[k],
      name: organizationData[k].name,
      role: organizationData[k].desc,
      phone: organizationData[k].href.startsWith("tel:") ? organizationData[k].href.slice(4) : null,
      officialUrl: organizationData[k].href.startsWith("http") ? organizationData[k].href : null,
      reviewedAt: null,
    }))
  },
}
