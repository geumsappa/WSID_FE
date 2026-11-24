import type { MockPage } from "@/api"

/**
 * 모의 페이지(훈련용 가짜 사이트) 화면 설정표.
 * 서버가 보내는 MockPage.templateCode에 맞는 설정을 골라 TrainingCheckView가 그려요.
 * 새 사기 유형이 생기면 여기에 한 덩어리만 추가하면 돼요.
 *
 * 안전 원칙 (모든 템플릿 공통):
 * - 입력칸은 이름·휴대폰 번호·주소·생년월일·성별 안에서만 골라요 (아이디·비밀번호·카드·계좌·주민등록번호 칸은 만들지 않아요).
 * - 인증번호·OTP 칸도 만들지 않아요 (훈련에서는 실제 문자를 받을 수 없어서).
 * - 입력값은 서버·AI로 보내지 않고 "제출했다"는 행동만 기록해요 (TrainingCheckPage).
 */
export type MockField = { label: string; placeholder: string; type?: "text" | "tel" | "gender"; maxLength?: number }
export type MockTemplate = {
  /** 로고 아래 영문 부제 */
  service: string
  /** 머리글 오른쪽 메뉴 이름 */
  nav: string
  /** 큰 제목 위 영문 작은 글씨 */
  kicker: string
  title: string
  lead: string
  /** 입력 카드 제목과 설명 */
  section: string
  sectionDesc: string
  fields: MockField[]
  submit: string
  /** 오른쪽 진행 안내 2단계 */
  steps: [{ title: string; desc: string }, { title: string; desc: string }]
  /** 제출 뒤 결과 문구 */
  submitted: string
}

const NEXT_STEP = { title: "다음 절차 안내", desc: "훈련 대화에서 이어서 진행" }

/**
 * 입력칸은 이름·휴대폰 번호·주소·생년월일·성별 다섯 가지 안에서만, 화면마다 실제 사기 페이지가 그럴듯하게 묻는 것만 골라 넣어요.
 * (아이디·비밀번호·계좌번호·사건번호 같은 칸은 만들지 않아요)
 */
const F = {
  name: (label = "이름"): MockField => ({ label, placeholder: "이름을 입력해 주세요" }),
  phone: (label = "휴대폰 번호"): MockField => ({ label, placeholder: "- 없이 숫자만 입력해 주세요", type: "tel", maxLength: 13 }),
  address: (label = "주소", placeholder = "도로명 주소를 입력해 주세요"): MockField => ({ label, placeholder, maxLength: 150 }),
  birth: (label = "생년월일"): MockField => ({ label, placeholder: "생년월일 6자리 (예: 990101)", type: "tel", maxLength: 6 }),
  gender: (): MockField => ({ label: "성별", placeholder: "", type: "gender" }),
}

export const MOCK_TEMPLATES: Record<string, MockTemplate> = {
  // 택배 주소 오류 문자: 받는 사람·연락처·주소를 다시 받는 척해요
  DELIVERY_ADDRESS: {
    service: "DELIVERY SERVICE", nav: "배송 조회", kicker: "ADDRESS VERIFICATION",
    title: "배송지 재확인", lead: "배송 주소 오류로 보류된 택배를 다시 접수하려면 정보를 확인해 주세요.",
    section: "배송 정보 확인", sectionDesc: "아래 정보를 확인하고 재배송을 신청해 주세요.",
    fields: [F.name("받는 분 이름"), F.phone(), F.address("배송 주소")],
    submit: "주소 확인 후 재배송 신청",
    steps: [{ title: "배송지 확인", desc: "주소·연락처 확인" }, { title: "재배송 접수", desc: "훈련 대화에서 이어서 진행" }],
    submitted: "재배송 신청이 접수되었습니다.",
  },
  // 은행·카드사 보안 안내: 명의자 확인이라며 이름·생년월일·번호를 받아요
  BANK_LOGIN: {
    service: "BANKING SERVICE", nav: "보안 센터", kicker: "ACCOUNT PROTECTION",
    title: "계정 보호 본인 확인", lead: "이상 거래가 감지되어 계정 보호를 위해 명의자 본인 확인이 필요합니다.",
    section: "명의자 정보 확인", sectionDesc: "등록된 명의자 정보와 일치하는지 확인합니다.",
    fields: [F.name(), F.birth(), F.phone("등록된 휴대폰 번호")],
    submit: "본인 확인하기",
    steps: [{ title: "본인 확인", desc: "명의자 정보 확인" }, NEXT_STEP],
    submitted: "본인 확인 요청이 접수되었습니다.",
  },
  // 피해 보상금·환급금 안내: 지급 대상자 확인이라며 인적 사항을 받아요
  REFUND_CLAIM: {
    service: "REFUND SERVICE", nav: "지급 조회", kicker: "REFUND CLAIM",
    title: "지급 대상자 확인", lead: "지급 대상으로 조회되었습니다. 본인 확인 후 지급 신청이 진행됩니다.",
    section: "대상자 정보 입력", sectionDesc: "조회된 대상자 정보와 일치해야 지급이 가능합니다.",
    fields: [F.name(), F.birth(), F.gender(), F.phone()],
    submit: "지급 신청하기",
    steps: [{ title: "대상자 확인", desc: "인적 사항 확인" }, { title: "지급 신청", desc: "훈련 대화에서 이어서 진행" }],
    submitted: "지급 신청이 접수되었습니다.",
  },
  // 채용·알바: 지원서처럼 인적 사항과 거주지를 받아요
  RECRUIT_APPLICANT: {
    service: "RECRUITMENT SERVICE", nav: "지원자 확인", kicker: "APPLICANT VERIFICATION",
    title: "지원자 정보 등록", lead: "원활한 전형 안내와 근무지 배정을 위해 지원자 정보를 등록해 주세요.",
    section: "지원자 기본 정보", sectionDesc: "입력한 정보로 면접·근무 일정을 안내해 드립니다.",
    fields: [F.name("지원자 이름"), F.birth(), F.gender(), F.phone("연락받을 휴대폰 번호"), F.address("거주지", "시·구·동까지 입력해 주세요")],
    submit: "지원 정보 등록",
    steps: [{ title: "지원자 등록", desc: "기본 정보 확인" }, NEXT_STEP],
    submitted: "지원 정보가 등록되었습니다.",
  },
  // 저금리 대출: 한도 조회라며 신청자 정보와 거주지를 받아요
  LOAN_APPLY: {
    service: "LOAN SERVICE", nav: "한도 조회", kicker: "LIMIT CHECK",
    title: "대출 한도 조회", lead: "간단한 정보 입력으로 승인 가능한 대출 한도를 확인해 보세요.",
    section: "신청자 정보 확인", sectionDesc: "한도 조회를 위해 아래 정보를 입력해 주세요.",
    fields: [F.name(), F.birth(), F.phone(), F.address("거주지 주소")],
    submit: "한도 조회하기",
    steps: [{ title: "한도 조회", desc: "신청자 정보 확인" }, NEXT_STEP],
    submitted: "한도 조회 요청이 접수되었습니다.",
  },
  // 중고거래 안전결제: 거래자·배송지 확인이라며 받아요
  SECONDHAND_SAFE_PAY: {
    service: "SAFE PAYMENT", nav: "안전결제", kicker: "SAFE PAYMENT",
    title: "안전결제 확인", lead: "안전결제로 거래를 진행하려면 거래자 정보와 받을 주소를 확인해 주세요.",
    section: "거래자 정보 확인", sectionDesc: "결제·배송 진행을 위해 아래 정보를 입력해 주세요.",
    fields: [F.name(), F.phone(), F.address("받을 주소")],
    submit: "안전결제 진행",
    steps: [{ title: "거래자 확인", desc: "결제·배송 정보 확인" }, NEXT_STEP],
    submitted: "안전결제 요청이 접수되었습니다.",
  },
  // 수사기관 사칭: 본인 명의 사건 조회라며 인적 사항과 주소를 받아요
  CASE_LOOKUP: {
    service: "CASE INQUIRY", nav: "사건 조회", kicker: "CASE LOOKUP",
    title: "사건 조회", lead: "본인 명의로 접수된 사건을 확인하려면 본인 정보를 입력해 주세요.",
    section: "본인 확인", sectionDesc: "사건 기록의 명의자와 일치하는지 확인합니다.",
    fields: [F.name(), F.birth(), F.gender(), F.address("주민등록상 주소")],
    submit: "사건 조회하기",
    steps: [{ title: "사건 조회", desc: "명의자 확인" }, NEXT_STEP],
    submitted: "사건 조회 요청이 접수되었습니다.",
  },
  GENERIC: {
    service: "VERIFICATION SERVICE", nav: "본인 확인", kicker: "VERIFICATION",
    title: "본인 확인", lead: "서비스 이용을 위해 본인 정보를 확인해 주세요.",
    section: "본인 정보 확인", sectionDesc: "아래 내용을 확인하고 본인 확인 절차를 진행해 주세요.",
    fields: [F.name(), F.birth(), F.phone()],
    submit: "본인 확인 진행",
    steps: [{ title: "본인 확인", desc: "확인 정보 검토 및 요청" }, NEXT_STEP],
    submitted: "확인 요청이 접수되었습니다.",
  },
}

/**
 * 서버가 다른 이름으로 보낼 수 있는 코드를 위 템플릿에 연결해요.
 * BANK_NOTICE는 예전 서버가 모든 시나리오에 똑같이 보내던 코드라 연결하지 않고,
 * 기관 이름·시나리오 제목으로 짐작하게 둬요 (아래 resolveMockTemplate 3단계).
 */
const ALIASES: Record<string, string> = {
  BANK: "BANK_LOGIN",
  DELIVERY: "DELIVERY_ADDRESS", PARCEL: "DELIVERY_ADDRESS", SMISHING: "DELIVERY_ADDRESS",
  RECRUIT: "RECRUIT_APPLICANT", JOB: "RECRUIT_APPLICANT", JOB_SCAM: "RECRUIT_APPLICANT",
  LOAN: "LOAN_APPLY", LOAN_FRAUD: "LOAN_APPLY",
  SECONDHAND: "SECONDHAND_SAFE_PAY", SECONDHAND_TRADE: "SECONDHAND_SAFE_PAY", SAFE_PAY: "SECONDHAND_SAFE_PAY",
  CASE: "CASE_LOOKUP", INSTITUTION_IMPERSONATION: "CASE_LOOKUP",
}
/** 코드로 못 고르면 글자(기관 이름·시나리오 제목)로 짐작해요 */
const REFUND_WORDS = /보상금|피해\s*보상|환급|지원금|지급/
const KEYWORDS: [RegExp, string][] = [
  [REFUND_WORDS, "REFUND_CLAIM"],
  [/택배|배송|우체국|물류/, "DELIVERY_ADDRESS"],
  [/중고|안전결제|직거래|마켓/, "SECONDHAND_SAFE_PAY"],
  [/대출|한도|캐피탈|저금리/, "LOAN_APPLY"],
  [/채용|지원자|면접|알바|구인|인사/, "RECRUIT_APPLICANT"],
  [/검찰|경찰|법원|사건|수사|금융감독/, "CASE_LOOKUP"],
  [/은행|뱅크|카드|금융|보안|계정/, "BANK_LOGIN"],
]

/**
 * 어떤 템플릿을 쓸지 정해요.
 * 1) templateCode가 설정표에 있으면 그대로 2) 알려진 다른 이름이면 연결
 * 3) 기관 이름·시나리오 제목으로 짐작 (예: "새롬택배" → 배송지 재확인)
 * 4) 코드 안의 단어로 짐작 5) 기본(본인 확인)
 */
export function resolveMockTemplate(page: MockPage | null, scenarioTitle?: string | null): MockTemplate {
  const code = (page?.templateCode ?? "").toUpperCase()
  const text = [page?.institutionName, page?.title, scenarioTitle].filter(Boolean).join(" ")
  // 서버는 보상금·환급금 안내도 은행 확인 화면(BANK_LOGIN)으로 보내요 → 지급 대상자 확인 화면이 더 어울려요
  if ((code === "BANK_LOGIN" || code === "BANK" || code === "GENERIC") && REFUND_WORDS.test(text)) return MOCK_TEMPLATES.REFUND_CLAIM
  if (MOCK_TEMPLATES[code]) return MOCK_TEMPLATES[code]
  if (ALIASES[code]) return MOCK_TEMPLATES[ALIASES[code]]
  const hit = KEYWORDS.find(([re]) => re.test(text))
  if (hit) return MOCK_TEMPLATES[hit[1]]
  const part = code === "BANK_NOTICE" ? undefined : Object.keys(ALIASES).find((k) => code.includes(k))
  return MOCK_TEMPLATES[part ? ALIASES[part] : "GENERIC"]
}
