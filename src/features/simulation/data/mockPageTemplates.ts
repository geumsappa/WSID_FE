import type { MockPage } from "@/api"

/**
 * 모의 페이지(훈련용 가짜 사이트) 화면 설정표.
 * 서버가 보내는 MockPage.templateCode에 맞는 설정을 골라 TrainingCheckView가 그려요.
 * 새 사기 유형이 생기면 여기에 한 덩어리만 추가하면 돼요.
 *
 * 안전 원칙 (모든 템플릿 공통):
 * - 실제 카드번호·주민등록번호 전체 같은 입력칸은 만들지 않아요.
 * - 인증번호·OTP 칸도 만들지 않아요 (훈련에서는 실제 문자를 받을 수 없어서).
 * - 입력값은 서버·AI로 보내지 않고 "제출했다"는 행동만 기록해요 (TrainingCheckPage).
 */
export type MockField = { label: string; placeholder: string; type?: "text" | "tel" | "password"; maxLength?: number }
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

export const MOCK_TEMPLATES: Record<string, MockTemplate> = {
  DELIVERY_ADDRESS: {
    service: "DELIVERY SERVICE", nav: "배송 조회", kicker: "ADDRESS VERIFICATION",
    title: "배송지 재확인", lead: "배송 주소 오류로 보류된 택배를 다시 접수하려면 정보를 확인해 주세요.",
    section: "배송 정보 확인", sectionDesc: "아래 정보를 확인하고 재배송을 신청해 주세요.",
    fields: [
      { label: "받는 분 이름", placeholder: "이름을 입력해 주세요" },
      { label: "휴대폰 번호", placeholder: "휴대폰 번호를 입력해 주세요", type: "tel" },
      { label: "배송 주소", placeholder: "도로명 주소를 입력해 주세요", maxLength: 150 },
    ],
    submit: "주소 확인 후 재배송 신청",
    steps: [{ title: "배송지 확인", desc: "주소·연락처 확인" }, { title: "재배송 접수", desc: "훈련 대화에서 이어서 진행" }],
    submitted: "재배송 신청이 접수되었습니다.",
  },
  BANK_LOGIN: {
    service: "BANKING SERVICE", nav: "보안 센터", kicker: "ACCOUNT PROTECTION",
    title: "계정 보호 본인 확인", lead: "이상 거래가 감지되어 계정 보호를 위해 본인 확인이 필요합니다.",
    section: "로그인 정보 확인", sectionDesc: "본인 확인을 위해 로그인 정보를 입력해 주세요.",
    fields: [
      { label: "아이디", placeholder: "아이디를 입력해 주세요" },
      { label: "비밀번호", placeholder: "비밀번호를 입력해 주세요", type: "password", maxLength: 128 },
    ],
    submit: "본인 확인하기",
    steps: [{ title: "본인 확인", desc: "로그인 정보 확인" }, NEXT_STEP],
    submitted: "본인 확인 요청이 접수되었습니다.",
  },
  RECRUIT_APPLICANT: {
    service: "RECRUITMENT SERVICE", nav: "지원자 확인", kicker: "APPLICANT VERIFICATION",
    title: "지원자 확인", lead: "원활한 전형 안내를 위해 지원자 정보를 확인해 주세요.",
    section: "지원자 정보 확인", sectionDesc: "아래 내용을 확인하고 본인 확인 절차를 진행해 주세요.",
    fields: [
      { label: "지원자 이름", placeholder: "이름을 입력해 주세요" },
      { label: "지원자 번호", placeholder: "지원자 번호를 입력해 주세요", maxLength: 100 },
      { label: "확인 비밀번호", placeholder: "확인 비밀번호를 입력해 주세요", type: "password", maxLength: 128 },
    ],
    submit: "본인 확인 진행",
    steps: [{ title: "지원자 확인", desc: "확인 정보 검토 및 요청" }, NEXT_STEP],
    submitted: "확인 요청이 접수되었습니다.",
  },
  LOAN_APPLY: {
    service: "LOAN SERVICE", nav: "한도 조회", kicker: "LIMIT CHECK",
    title: "대출 한도 조회", lead: "간단한 정보 입력으로 승인 가능한 대출 한도를 확인해 보세요.",
    section: "신청자 정보 확인", sectionDesc: "한도 조회를 위해 아래 정보를 입력해 주세요.",
    fields: [
      { label: "이름", placeholder: "이름을 입력해 주세요" },
      { label: "생년월일", placeholder: "생년월일 6자리 (예: 990101)", type: "tel", maxLength: 6 },
      { label: "휴대폰 번호", placeholder: "휴대폰 번호를 입력해 주세요", type: "tel" },
      { label: "희망 대출 금액", placeholder: "예: 1,000만 원" },
    ],
    submit: "한도 조회하기",
    steps: [{ title: "한도 조회", desc: "신청자 정보 확인" }, NEXT_STEP],
    submitted: "한도 조회 요청이 접수되었습니다.",
  },
  SECONDHAND_SAFE_PAY: {
    service: "SAFE PAYMENT", nav: "안전결제", kicker: "SAFE PAYMENT",
    title: "안전결제 확인", lead: "안전결제로 거래를 진행하려면 거래자 정보와 정산 계좌를 확인해 주세요.",
    section: "거래자 정보 확인", sectionDesc: "결제·정산 진행을 위해 아래 정보를 입력해 주세요.",
    fields: [
      { label: "이름", placeholder: "이름을 입력해 주세요" },
      { label: "휴대폰 번호", placeholder: "휴대폰 번호를 입력해 주세요", type: "tel" },
      { label: "정산 받을 계좌번호", placeholder: "은행명과 계좌번호를 입력해 주세요", maxLength: 40 },
    ],
    submit: "안전결제 진행",
    steps: [{ title: "거래자 확인", desc: "결제·정산 정보 확인" }, NEXT_STEP],
    submitted: "안전결제 요청이 접수되었습니다.",
  },
  CASE_LOOKUP: {
    service: "CASE INQUIRY", nav: "사건 조회", kicker: "CASE LOOKUP",
    title: "사건 조회", lead: "본인 명의로 접수된 사건을 확인하려면 정보를 입력해 주세요.",
    section: "조회 정보 입력", sectionDesc: "안내받은 사건번호와 본인 정보를 입력해 주세요.",
    fields: [
      { label: "이름", placeholder: "이름을 입력해 주세요" },
      { label: "사건번호", placeholder: "안내받은 사건번호를 입력해 주세요", maxLength: 40 },
      { label: "휴대폰 번호", placeholder: "휴대폰 번호를 입력해 주세요", type: "tel" },
    ],
    submit: "사건 조회하기",
    steps: [{ title: "사건 조회", desc: "본인 정보 확인" }, NEXT_STEP],
    submitted: "사건 조회 요청이 접수되었습니다.",
  },
  GENERIC: {
    service: "VERIFICATION SERVICE", nav: "본인 확인", kicker: "VERIFICATION",
    title: "본인 확인", lead: "서비스 이용을 위해 본인 정보를 확인해 주세요.",
    section: "본인 정보 확인", sectionDesc: "아래 내용을 확인하고 본인 확인 절차를 진행해 주세요.",
    fields: [
      { label: "이름", placeholder: "이름을 입력해 주세요" },
      { label: "휴대폰 번호", placeholder: "휴대폰 번호를 입력해 주세요", type: "tel" },
    ],
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
const KEYWORDS: [RegExp, string][] = [
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
  if (MOCK_TEMPLATES[code]) return MOCK_TEMPLATES[code]
  if (ALIASES[code]) return MOCK_TEMPLATES[ALIASES[code]]
  const text = [page?.institutionName, page?.title, scenarioTitle].filter(Boolean).join(" ")
  const hit = KEYWORDS.find(([re]) => re.test(text))
  if (hit) return MOCK_TEMPLATES[hit[1]]
  const part = code === "BANK_NOTICE" ? undefined : Object.keys(ALIASES).find((k) => code.includes(k))
  return MOCK_TEMPLATES[part ? ALIASES[part] : "GENERIC"]
}
