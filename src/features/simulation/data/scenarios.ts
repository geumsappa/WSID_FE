// ⚠️ mock 전용: 서버 없이 쓸 때 api/mock이 리포트를 만들려고 씁니다. 화면은 이 파일을 직접 쓰지 않아요.
import type { IconName } from "@/types/common"
import type { EverydayCategory, Scenario, SituationKey, SituationOption } from "../types"

export const situations: SituationOption[] = [
  { key: "trade", label: "중고거래를 했어요" },
  { key: "delivery", label: "택배를 기다리고 있어요" },
  { key: "loan", label: "대출을 알아보고 있어요" },
  { key: "job", label: "취업을 준비하고 있어요" },
  { key: "institution", label: "금융기관에서 연락을 받았어요" },
]

export const scenarios: Record<SituationKey, Scenario> = {
  trade: {
    key: "trade",
    title: "중고거래 판매자를 가장한 결제 확인 연락",
    description:
      "거래 상대의 재촉과 외부 결제 유도에서 위험 신호를 찾는 연습입니다.",
    opening:
      "안녕하세요. 거래한 상품 결제 확인에 문제가 생겼습니다. 지금 확인해 주실 수 있나요?",
    subject: "거래",
  },
  delivery: {
    key: "delivery",
    title: "택배 배송 안내를 가장한 의심스러운 연락",
    description:
      "배송 관련 연락에서 위험 신호를 발견하고 안전하게 대응하는 방법을 연습합니다.",
    opening: "안녕하세요. 주문하신 상품의 배송 상태를 확인해 주세요.",
    subject: "배송",
  },
  loan: {
    key: "loan",
    title: "대출 상담원을 가장한 의심스러운 연락",
    description:
      "낮은 금리와 빠른 승인을 내세운 요청을 안전하게 확인하는 연습입니다.",
    opening:
      "고객님께 특별 대출 한도가 확인되었습니다. 간단한 확인 후 바로 진행해 드릴까요?",
    subject: "대출",
  },
  job: {
    key: "job",
    title: "채용 담당자를 가장한 비용 요구 연락",
    description:
      "채용 과정에서 개인정보나 비용을 요구하는 위험 신호를 살펴봅니다.",
    opening:
      "지원하신 채용 건으로 연락드렸습니다. 최종 확인 절차를 지금 진행해도 될까요?",
    subject: "채용",
  },
  institution: {
    key: "institution",
    title: "금융기관 직원을 가장한 본인 확인 연락",
    description:
      "기관 사칭 연락을 공식 채널로 검증하고 정보를 보호하는 연습입니다.",
    opening:
      "고객님 계정에서 이상 거래가 확인되어 긴급 본인 확인이 필요합니다.",
    subject: "계정",
  },
}

export const everydayCategories: { key: EverydayCategory; title: string; description: string; icon: IconName }[] = [
  { key: "shopping", title: "쇼핑·택배", description: "주문, 배송, 환불", icon: "cart" },
  { key: "job", title: "취업·아르바이트", description: "채용 연락, 급여, 부업", icon: "user" },
  { key: "finance", title: "금융·은행", description: "대출, 카드, 계좌", icon: "building" },
  { key: "housing", title: "부동산·계약", description: "월세, 보증금, 계약", icon: "shield" },
  { key: "travel", title: "여행·숙박", description: "예약, 항공권, 숙소", icon: "bell" },
  { key: "social", title: "지인·SNS", description: "메신저, 계정, 지인 연락", icon: "chat" },
]
// 검증된 교육용 유형을 바탕으로 한 3개 후보. 백엔드 AI 연결 전에는 규칙 기반으로 구성합니다.
export const everydayTemplates: Record<EverydayCategory, { title: string; description: string; opening: string; subject: string }[]> = {
  shopping: [
    { title: "택배 배송 오류 안내", description: "기다리던 택배의 배송지에 문제가 생겼다는 연락을 받았어요.", opening: "안녕하세요. 고객님 택배가 주소 확인 문제로 잠시 보류되었습니다. 주문하신 물건이 맞으실까요?", subject: "배송" },
    { title: "쇼핑몰 환불 요청", description: "판매자가 환불 처리 절차를 안내한다며 연락했어요.", opening: "안녕하세요. 주문 상품 환불 접수가 확인되었습니다. 처리 상태를 안내해 드려도 될까요?", subject: "환불" },
    { title: "해외 직구 통관 안내", description: "해외에서 주문한 상품에 통관 관련 안내가 도착했어요.", opening: "해외 배송 중인 물품에 통관 관련 확인 사항이 있습니다. 최근 해외 구매하신 적 있으신가요?", subject: "통관" },
  ],
  job: [
    { title: "합격 안내와 서류 요청", description: "지원했던 곳에서 합격 안내와 추가 서류 요청을 받았어요.", opening: "안녕하세요. 지원하신 채용 전형 결과를 안내드리려고 연락했습니다. 지금 통화 가능하신가요?", subject: "채용" },
    { title: "재택 아르바이트 제안", description: "짧은 시간에 수익을 낼 수 있다는 부업 제안을 받았어요.", opening: "간단한 재택 업무 참여자를 모집 중입니다. 일해 본 경험이 없어도 지원 가능하세요.", subject: "아르바이트" },
    { title: "급여 계좌 확인 연락", description: "회사 담당자라고 주장하는 사람에게 급여 계좌 확인 연락이 왔어요.", opening: "급여 지급 전 확인이 필요한 항목이 있어 연락드렸습니다. 잠깐 확인 부탁드려도 될까요?", subject: "급여" },
  ],
  finance: [
    { title: "카드 이상 거래 알림", description: "사용하지 않은 카드 결제가 발견되었다는 연락을 받았어요.", opening: "카드 사용 내역 확인과 관련해 연락드렸습니다. 최근 승인 내역을 확인하신 적 있으신가요?", subject: "카드" },
    { title: "저금리 대환대출 안내", description: "기존 대출을 낮은 금리로 바꿀 수 있다는 연락을 받았어요.", opening: "금리 인하 대상자 안내로 연락드렸습니다. 대출 변경 관련 상담을 받아보시겠어요?", subject: "대출" },
    { title: "계좌 보안 점검 안내", description: "은행에서 계좌 보안 문제가 발견됐다는 연락이 왔어요.", opening: "고객님 계좌에 보안 확인이 필요한 사항이 발견되었습니다. 먼저 안내드려도 될까요?", subject: "계좌" },
  ],
  housing: [
    { title: "계약금 입금 계좌 변경", description: "부동산 계약 직전 입금 계좌가 변경되었다는 안내를 받았어요.", opening: "안녕하세요. 계약 진행과 관련해 입금 정보에 변동이 생겨 안내드립니다. 계약 일정 확인 가능하실까요?", subject: "계약" },
    { title: "전세 보증금 반환 안내", description: "보증금 반환 절차를 도와주겠다는 연락을 받았어요.", opening: "보증금 반환 절차 관련 안내 사항이 있어 연락드렸습니다. 계약 만료일이 가까우신가요?", subject: "보증금" },
    { title: "매물 예약금 요청", description: "인기 매물을 확보하려면 먼저 예약해야 한다는 연락을 받았어요.", opening: "문의하신 매물에 다른 문의가 많이 들어오고 있습니다. 아직 관심 있으신가요?", subject: "매물" },
  ],
  travel: [
    { title: "숙박 예약 취소 안내", description: "예약한 숙소가 취소될 수 있다는 안내를 받았어요.", opening: "안녕하세요. 고객님 예약 내역에 확인이 필요한 내용이 있습니다. 예약하신 날짜가 언제인가요?", subject: "예약" },
    { title: "항공권 변경 수수료", description: "항공편이 변경되어 별도 처리가 필요하다는 연락을 받았어요.", opening: "이용 예정 항공편에 일정 변경이 있어 안내드립니다. 변경 내용 확인 가능하실까요?", subject: "항공권" },
    { title: "해외 결제 오류 안내", description: "여행 예약 결제가 정상 처리되지 않았다는 메시지를 받았어요.", opening: "여행 예약 결제 상태를 확인해 드리려고 합니다. 최근 예약하신 상품이 있으신가요?", subject: "결제" },
  ],
  social: [
    { title: "지인의 갑작스러운 부탁", description: "친구의 계정에서 평소와 다른 부탁이 도착했어요.", opening: "나 지금 급하게 확인할 일이 생겼어. 잠깐 연락 가능해?", subject: "부탁" },
    { title: "SNS 계정 보안 알림", description: "사용 중인 계정에 이상 로그인이 감지됐다는 메시지를 받았어요.", opening: "계정에서 새로운 로그인 활동이 발견되어 안내드립니다. 본인이 로그인한 기록인가요?", subject: "계정" },
    { title: "공동구매 정산 연락", description: "온라인 모임의 공동구매 정산 관련 연락을 받았어요.", opening: "참여하신 공동구매 정산 안내입니다. 주문 내역을 확인하고 계신가요?", subject: "정산" },
  ],
}
