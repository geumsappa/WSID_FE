// 규칙 기반 시나리오 추천. 백엔드 AI 연결 시 교체 대상입니다.
import { everydayTemplates, scenarios } from "../data/scenarios"
import type { EverydayCategory, InterviewAnswer, Scenario, SituationKey } from "../types"

export const classifyScenario = (text: string, selected: SituationKey | null) => {
  if (selected) return scenarios[selected]
  if (/중고|거래|판매자|구매/.test(text)) return scenarios.trade
  if (/대출|금리|한도|상환/.test(text)) return scenarios.loan
  if (/취업|채용|면접|구직/.test(text)) return scenarios.job
  if (/은행|금융|카드|기관|계좌/.test(text)) return scenarios.institution
  return scenarios.delivery
}

export function categoryFromContext(text: string): EverydayCategory {
  if (/취업|구직|면접|알바|채용|직장/.test(text)) return "job"
  if (/대출|은행|카드|금리|계좌/.test(text)) return "finance"
  if (/전세|월세|집|부동산|계약|이사/.test(text)) return "housing"
  if (/여행|숙소|호텔|항공|비행|예약/.test(text)) return "travel"
  if (/지인|친구|SNS|인스타|카톡|메신저/.test(text)) return "social"
  return "shopping"
}
export function createEverydayOptions(category: EverydayCategory, personalContext: string): Scenario[] {
  const legacyKeys: Record<EverydayCategory, SituationKey> = { shopping: "delivery", job: "job", finance: "institution", housing: "trade", travel: "delivery", social: "institution" }
  return everydayTemplates[category].map((v, index) => ({
    key: legacyKeys[category],
    title: v.title,
    description: personalContext.trim() ? `내 경험과 연관된 상황 ${index + 1}. ${v.description}` : v.description,
    opening: v.opening,
    subject: v.subject,
  }))
}

// 개인화 인터뷰: 역할(구매/판매)과 진행 상태를 반영하되, 사기 여부는 미리 공개하지 않습니다.
export function createInterviewOptions(context: string): Scenario[] {
  const c = context.toLowerCase()
  if (/중고|당근|번개장터|판매|구매/.test(c)) {
    const seller = /판매자|팔았|판매했|물건을 팔|판매 중|판매를/.test(c) && !/구매자|구매했|샀|구입했/.test(c)
    if (seller) return [
      { key: "trade", title: "안전결제 확인 요청", description: "구매자가 안전결제 확인이 필요하다며 별도 안내를 보냈어요.", opening: "안녕하세요, 올리신 물건 구매하고 싶어요. 안전결제로 진행할 수 있을까요?", subject: "중고거래 결제" },
      { key: "trade", title: "택배 접수 확인 연락", description: "거래한 상품의 배송 확인을 요청하는 연락을 받았어요.", opening: "물건 배송 확인 때문에 연락드렸어요. 택배 접수 상태를 확인해 주실 수 있나요?", subject: "거래 배송" },
      { key: "trade", title: "입금 오류 재확인 요청", description: "구매자가 입금이 잘못됐다며 정산 절차를 안내했어요.", opening: "방금 송금했는데 입금 오류라고 떠요. 확인을 좀 부탁드려도 될까요?", subject: "거래 입금" },
    ]
    return [
      { key: "trade", title: "판매자의 선입금 요청", description: "판매자가 인기 상품이라며 먼저 돈을 보내 달라고 했어요.", opening: "문의하신 물건 아직 있어요. 다른 구매자도 관심 있어 해서 오늘 거래 가능하실까요?", subject: "중고거래 결제" },
      { key: "trade", title: "가짜 안전결제 안내", description: "거래 상대가 안전하게 결제할 수 있다며 외부 절차를 안내했어요.", opening: "이 거래는 안전결제도 가능합니다. 어떤 방식으로 거래하고 싶으세요?", subject: "안전결제" },
      { key: "trade", title: "배송 확인을 가장한 연락", description: "구매한 물건의 배송 확인을 위해 추가 절차가 필요하다는 연락을 받았어요.", opening: "구매하신 물품 배송 안내입니다. 현재 수령 주소에 문제가 없는지 확인 가능하신가요?", subject: "택배 배송" },
    ]
  }
  return createEverydayOptions(categoryFromContext(context), context)
}

export function interviewQuestion(answers: InterviewAnswer[]) {
  const first = answers[0]?.answer ?? ""
  const second = answers[1]?.answer ?? ""
  if (answers.length === 0) return { text: "최근에 어떤 일이 있었나요?", choices: ["중고거래를 했어요", "온라인 쇼핑을 했어요", "취업을 준비했어요", "은행 업무를 봤어요", "여행을 준비했어요", "기타 일상" ] }
  if (answers.length === 1) {
    if (/중고|거래|당근|번개/.test(first)) return { text: "중고거래에서 구매하셨나요, 판매하셨나요?", choices: ["구매했어요", "판매했어요", "거래를 알아보는 중이에요"] }
    if (/쇼핑|택배|배송|주문/.test(first)) return { text: "어떤 상황이었나요?", choices: ["상품을 주문했어요", "배송을 기다려요", "환불 중이에요"] }
    if (/취업|면접|구직|알바/.test(first)) return { text: "어떤 단계에 있나요?", choices: ["지원했어요", "면접을 봤어요", "합격 연락을 기다려요"] }
    if (/은행|대출|카드|계좌|금융/.test(first)) return { text: "어떤 금융 업무였나요?", choices: ["대출", "계좌·이체", "카드", "기타"] }
    if (/여행|호텔|항공|숙소/.test(first)) return { text: "무엇을 준비하고 있었나요?", choices: ["숙박 예약", "항공권", "해외 결제"] }
    return { text: "조금 더 알려주실래요? 어떤 활동을 하셨나요?", choices: ["물건 구매·판매", "금융 업무", "일·구직", "여행·예약", "지인과 연락"] }
  }
  if (/중고|거래|당근|번개/.test(first) || /구매|판매/.test(second)) return { text: "지금 거래는 어느 단계인가요?", choices: ["상대방과 대화 중", "결제 전", "결제 완료", "배송·수령 대기"] }
  return { text: "지금은 어떤 상태인가요?", choices: ["연락을 기다리는 중", "진행 중", "결제·신청 완료", "잘 모르겠어요"] }
}
