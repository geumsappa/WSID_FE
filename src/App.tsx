import { useEffect, useMemo, useRef, useState } from "react"

type Page = "home" | "simulation" | "emergency" | "emergencyChat" | "report"
type SimStage = "input" | "loading" | "summary" | "chat" | "complete"
type EmergencyKey = "transfer" | "link" | "app" | "privacy" | "call" | "trade" | "custom"
type IconName = "shield" | "chat" | "bell" | "spark" | "building" | "send" | "link" | "phone" | "user" | "app" | "check" | "lock" | "search" | "arrow" | "download" | "refresh" | "alert" | "close" | "cart" | "image"
type SituationKey = "trade" | "delivery" | "loan" | "job" | "institution"
type AssistantMessage = {
  from: "assistant" | "user"
  text: string
}
type Scenario = {
  key: SituationKey
  title: string
  description: string
  opening: string
  subject: string
}
interface SimulationMessage {
  from: "contact" | "user"
  text: string
}
interface SituationOption {
  key: SituationKey
  label: string
}
interface IconProps {
  name: IconName
  size?: number
}
interface UploadedImage {
  name: string
  preview: string
}
type ConversationAnalysis = {
  score: number
  safe: string[]
  risky: string[]
  missed: string[]
  summary: string
}

const situations: SituationOption[] = [
  { key: "trade", label: "중고거래를 했어요" },
  { key: "delivery", label: "택배를 기다리고 있어요" },
  { key: "loan", label: "대출을 알아보고 있어요" },
  { key: "job", label: "취업을 준비하고 있어요" },
  { key: "institution", label: "금융기관에서 연락을 받았어요" },
]

const scenarios: Record<SituationKey, Scenario> = {
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

const classifyScenario = (text: string, selected: SituationKey | null) => {
  if (selected) return scenarios[selected]
  if (/중고|거래|판매자|구매/.test(text)) return scenarios.trade
  if (/대출|금리|한도|상환/.test(text)) return scenarios.loan
  if (/취업|채용|면접|구직/.test(text)) return scenarios.job
  if (/은행|금융|카드|기관|계좌/.test(text)) return scenarios.institution
  return scenarios.delivery
}

const hasSafeEnding = (text: string) =>
  /차단|신고|대화.{0,3}(중단|종료)|연락.{0,3}(그만|중단)|응하지 않|거절|끊겠습니다|공식.{0,12}(확인|문의)|고객센터.{0,8}(확인|문의)|앱.{0,8}확인/.test(
    text,
  )

const createDemoReply = (message: string, turn: number, scenario: Scenario) => {
  if (hasSafeEnding(message))
    return "알겠습니다. 공식 경로로 확인하거나 대화를 중단하겠다는 뜻을 확인했습니다. 이 가상 대화는 여기서 종료됩니다."
  if (
    /공식|고객센터|대표번호|앱|홈페이지|직접 확인|판매자에게 확인/.test(message)
  )
    return `공식 경로로 확인하면 시간이 걸릴 수 있습니다. ${scenario.subject} 처리를 위해 이 대화에서 바로 확인하는 편이 빠릅니다.`
  if (/누구|어디|소속|택배사|기관|회사|담당|운송장|주문/.test(message))
    return `현재 시스템에는 세부 정보가 표시되지 않습니다. ${scenario.subject} 처리가 지연되지 않도록 먼저 본인 여부만 확인해 주세요.`
  if (
    /개인정보|비밀번호|인증번호|계좌|정보.{0,3}(안|못)|제공하지/.test(message)
  )
    return "복잡한 정보는 필요하지 않다고 주장하며, 지금 확인하지 않으면 처리가 취소될 수 있다고 다시 재촉합니다."
  if (/링크|주소|접속|클릭/.test(message))
    return "보안상 실제 링크는 제공되지 않습니다. 상대는 별도 확인 화면을 이용해야 한다는 말로 계속 접속을 유도합니다."
  if (/돈|비용|입금|송금|결제|얼마/.test(message))
    return "소액 확인 절차가 필요하다고 주장하지만, 교육용 시뮬레이션에서는 실제 금액이나 결제 방법을 안내하지 않습니다."
  const replies = [
    `말씀하신 내용과 관계없이 ${scenario.subject} 확인이 급하다며 오늘 안에 처리해야 한다고 재촉합니다.`,
    "정확한 근거는 제시하지 않은 채, 확인이 늦어지면 불이익이 생길 수 있다고 압박합니다.",
    "공식 경로보다 이 대화에서 처리하는 것이 빠르다며 즉시 답변해 달라고 요구합니다.",
    "본인 확인이 완료되지 않았다며 개인정보를 입력하도록 유도하려 합니다.",
  ]
  return replies[Math.min(turn, replies.length - 1)]
}

const analyzeConversation = (
  messages: SimulationMessage[],
): ConversationAnalysis => {
  const text = messages
    .filter((m) => m.from === "user")
    .map((m) => m.text)
    .join(" ")
  const checks = {
    recognized: /의심|사기|수상|믿을 수|확인.*필요/.test(text),
    protected:
      /개인정보.*(안|못)|비밀번호.*(안|못)|인증번호.*(안|못)|제공하지|알려주지/.test(
        text,
      ),
    verified:
      /공식|고객센터|대표번호|앱|홈페이지|직접 확인|판매자에게 확인/.test(text),
    refused: /거절|하지 않|안 할|못 합니다|링크.*(안|못)|송금.*(안|못)/.test(
      text,
    ),
    ended: hasSafeEnding(text),
  }
  const riskyPatterns = [
    [
      /링크.{0,8}(열|접속|클릭|눌)/,
      "출처가 확인되지 않은 링크를 이용하려는 표현이 있었어요.",
    ],
    [
      /(송금|입금|결제).{0,8}(할게|하겠|했어)/,
      "확인되지 않은 상대에게 비용을 보내려는 표현이 있었어요.",
    ],
    [
      /(비밀번호|인증번호|계좌번호|주민등록번호).{0,8}(알려|보내|제공)/,
      "민감정보를 전달하려는 표현이 있었어요.",
    ],
  ] as const
  const risky = riskyPatterns
    .filter(([pattern]) => pattern.test(text))
    .map(([, label]) => label)
  const safe = [
    checks.recognized && "연락의 수상한 점을 인식하고 의심을 표현했어요.",
    checks.protected && "민감한 개인정보를 제공하지 않겠다고 밝혔어요.",
    checks.verified && "공식 앱이나 고객센터 등 독립된 경로로 확인하려 했어요.",
    checks.refused && "안전하지 않은 요청을 분명하게 거절했어요.",
    checks.ended && "의심스러운 대화를 중단하거나 신고·차단하려 했어요.",
  ].filter(Boolean) as string[]
  const missed = [
    !checks.recognized &&
      "상대의 재촉과 불이익 경고를 의심 신호로 명확히 짚지 않았어요.",
    !checks.verified &&
      "상대가 제공한 정보와 분리된 공식 경로 확인이 필요해요.",
    !checks.ended &&
      "확인되지 않은 대화는 중단하고 차단하는 단계까지 이어가 보세요.",
  ].filter(Boolean) as string[]
  const score = Math.max(
    0,
    Object.values(checks).filter(Boolean).length * 20 - risky.length * 15,
  )
  return {
    score,
    safe: safe.length ? safe : ["대화에 참여하며 상황을 확인하려고 했어요."],
    risky: risky.length
      ? risky
      : ["직접적인 민감정보 제공이나 송금 표현은 발견되지 않았어요."],
    missed: missed.length ? missed : ["주요 위험 신호를 빠짐없이 확인했어요."],
    summary:
      score >= 80
        ? "의심스러운 연락에 대체로 안전하게 대응했어요."
        : score >= 60
          ? "위험 신호를 살펴보며 신중하게 대응했어요."
          : "공식 경로 확인과 대화 중단을 더 적극적으로 활용해 보세요.",
  }
}

const emergencyData: Record<EmergencyKey, {
  title: string
  short: string
  intro: string
  steps: {
    title: string
    body: string
  }[]
  organizations: ("police" | "cyber" | "fss" | "kisa")[]
}> = {
  transfer: {
    title: "돈을 송금했어요",
    short: "사기범에게 계좌이체를 한 상황",
    intro:
      "금융사기가 의심되는 계좌로 돈을 송금하셨군요. 추가 피해를 막기 위해 아래 순서대로 대응해 주세요.",
    steps: [
      {
        title: "즉시 신고 및 지급정지 요청",
        body: "112 또는 해당 금융회사에 연락해 피해 사실을 알리고 지급정지를 요청하세요.",
      },
      {
        title: "거래 기록 보관",
        body: "이체 내역과 상대방과의 연락 기록 등을 삭제하지 말고 보관하세요.",
      },
      {
        title: "피해 신고 진행",
        body: "경찰의 안내에 따라 신고 및 피해구제 절차를 진행하세요.",
      },
    ],
    organizations: ["police", "cyber", "fss"],
  },
  link: {
    title: "의심스러운 링크를 눌렀어요",
    short: "문자나 메신저의 링크를 클릭한 상황",
    intro:
      "링크를 눌렀더라도 정보를 입력하거나 앱을 설치하지 않았다면 우선 침착하게 아래 항목을 확인하세요.",
    steps: [
      {
        title: "추가 입력과 설치 중단",
        body: "열린 화면에서 개인정보나 인증번호를 입력하지 말고 파일도 내려받지 마세요.",
      },
      {
        title: "계정과 결제 내역 확인",
        body: "정보를 입력했다면 해당 계정의 비밀번호를 안전한 기기에서 변경하고 결제 내역을 확인하세요.",
      },
      {
        title: "전문 상담 요청",
        body: "이상 증상이 있거나 판단이 어렵다면 118에 상담을 요청하세요.",
      },
    ],
    organizations: ["kisa", "police"],
  },
  app: {
    title: "앱을 설치했어요",
    short: "출처를 알 수 없는 앱을 설치한 상황",
    intro:
      "출처를 알 수 없는 앱을 설치했다면 해당 기기로 금융 업무를 계속하지 않는 것이 중요합니다.",
    steps: [
      {
        title: "통신과 금융 이용 중단",
        body: "가능하면 비행기 모드로 전환하고 해당 기기에서 금융 앱이나 인증 서비스를 사용하지 마세요.",
      },
      {
        title: "안전한 기기로 금융회사 연락",
        body: "다른 안전한 기기에서 금융회사에 연락해 이상 거래 여부를 확인하세요.",
      },
      {
        title: "악성앱 상담 및 점검",
        body: "118에 상담하고 안내에 따라 기기 점검과 앱 삭제를 진행하세요.",
      },
    ],
    organizations: ["kisa", "police", "fss"],
  },
  privacy: {
    title: "개인정보를 알려줬어요",
    short: "신분증이나 금융정보 등을 전달한 상황",
    intro:
      "전달한 정보의 종류에 따라 조치가 달라집니다. 인증번호나 금융 비밀번호를 알렸다면 즉시 금융회사에 연락하세요.",
    steps: [
      {
        title: "전달한 정보 범위 확인",
        body: "어떤 정보와 자료를 언제, 누구에게 보냈는지 정리하세요.",
      },
      {
        title: "비밀번호 변경 및 금융회사 상담",
        body: "안전한 기기에서 관련 계정 비밀번호를 변경하고 금융회사에 노출 사실을 알리세요.",
      },
      {
        title: "명의도용 가능성 상담",
        body: "추가 피해가 우려되면 금융감독원 또는 경찰에 필요한 보호 조치를 문의하세요.",
      },
    ],
    organizations: ["fss", "police", "cyber"],
  },
  call: {
    title: "사칭 전화를 받았어요",
    short: "금융기관·수사기관 등을 사칭한 연락",
    intro:
      "전화를 받기만 하고 송금이나 정보 제공을 하지 않았다면 전화를 끊고 공식 대표번호로 사실을 확인하세요.",
    steps: [
      {
        title: "통화 종료",
        body: "상대방의 지시에 따르지 말고 일단 전화를 끊으세요.",
      },
      {
        title: "공식 번호로 직접 확인",
        body: "상대방이 알려준 번호가 아닌 기관의 공식 대표번호를 직접 찾아 확인하세요.",
      },
      {
        title: "기록 보관과 신고",
        body: "발신 번호와 통화 시각을 기록하고 사기가 의심되면 경찰에 상담하세요.",
      },
    ],
    organizations: ["police", "fss"],
  },
  trade: {
    title: "중고거래 사기가 의심돼요",
    short: "물품 구매 후 연락이 끊기거나 거래가 의심되는 상황",
    intro:
      "중고거래 사기가 의심되는군요. 추가 송금을 멈추고 거래 기록과 대화 내용을 보관한 뒤 공식 경로로 신고 여부를 확인하세요.",
    steps: [
      {
        title: "추가 결제와 연락 중단",
        body: "배송비나 보증금 등 추가 비용을 요구해도 보내지 말고 거래 플랫폼 밖의 연락은 중단하세요.",
      },
      {
        title: "거래 증거 보관",
        body: "판매 글, 대화 내용, 계좌번호, 송금 내역과 상대방 정보를 화면으로 저장하세요.",
      },
      {
        title: "플랫폼·금융회사·경찰에 문의",
        body: "거래 플랫폼에 신고하고, 송금했다면 즉시 금융회사와 112에 피해 대응을 요청하세요.",
      },
    ],
    organizations: ["police", "cyber", "fss"],
  },
  custom: {
    title: "직접 입력한 의심 상황",
    short: "상황이 복잡하거나 분류하기 어려운 경우",
    intro:
      "입력하신 내용을 바탕으로 가장 가까운 대응 원칙을 안내합니다. 이 안내는 규칙 기반 예시이며 공식 신고를 대신하지 않습니다.",
    steps: [
      {
        title: "추가 행동 잠시 중단",
        body: "송금, 링크 접속, 앱 설치, 개인정보 전달 등 상대방이 요구하는 행동을 멈추세요.",
      },
      {
        title: "공식 경로에서 사실 확인",
        body: "연락받은 기관의 공식 대표번호와 홈페이지를 직접 찾아 확인하세요.",
      },
      {
        title: "판단이 어렵다면 상담",
        body: "금전 피해가 있으면 112와 금융회사에, 정보보호 문제는 118에 문의하세요.",
      },
    ],
    organizations: ["police", "kisa", "fss"],
  },
}

const organizationData = {
  police: {
    name: "경찰청 112",
    desc: "긴급 신고 및 피해 대응",
    action: "112 전화하기",
    href: "tel:112",
    mark: "112",
  },
  cyber: {
    name: "경찰청 사이버범죄 신고시스템",
    desc: "온라인 사이버범죄 신고",
    action: "공식 신고 사이트 이동",
    href: "https://ecrm.police.go.kr",
    mark: "경찰",
  },
  fss: {
    name: "금융감독원",
    desc: "금융 피해 상담 및 피해구제 정보",
    action: "공식 홈페이지 이동",
    href: "https://www.fss.or.kr",
    mark: "금융",
  },
  kisa: {
    name: "한국인터넷진흥원 118",
    desc: "스미싱, 악성앱 등 정보보호 상담",
    action: "공식 상담 안내 보기",
    href: "https://www.kisa.kr/118",
    mark: "118",
  },
}

function Icon({ name, size = 24 }: IconProps) {
  const paths: Record<IconName, React.ReactNode> = {
    shield: (
      <>
        <path d="M12 3 4.5 6v5.6c0 4.6 3.1 7.6 7.5 9.4 4.4-1.8 7.5-4.8 7.5-9.4V6L12 3Z" />
        <path d="m8.8 12 2.1 2.1 4.5-4.6" />
      </>
    ),
    chat: (
      <>
        <path d="M5 5.5h14v10H9l-4 3v-13Z" />
        <path d="M9 9h6M9 12h4" />
      </>
    ),
    bell: (
      <>
        <path d="M6.5 16.5h11L16 14V9a4 4 0 0 0-8 0v5l-1.5 2.5Z" />
        <path d="M10 19h4" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 1.3 4.2L17.5 8.5l-4.2 1.3L12 14l-1.3-4.2-4.2-1.3 4.2-1.3L12 3Z" />
        <path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" />
      </>
    ),
    building: (
      <>
        <path d="M4 20h16M6 17h12M7 9v8M11 9v8M15 9v8M19 7H5l7-4 7 4Z" />
      </>
    ),
    send: (
      <>
        <path d="m4 4 17 8-17 8 3-8-3-8Z" />
        <path d="M7 12h14" />
      </>
    ),
    link: (
      <>
        <path d="M9.5 14.5 14.5 9" />
        <path d="M7.5 16.5 6 18a3 3 0 0 1-4-4l3-3a3 3 0 0 1 4 0M16.5 7.5 18 6a3 3 0 0 1 4 4l-3 3a3 3 0 0 1-4 0" />
      </>
    ),
    phone: (
      <path d="M7 3H4.5A1.5 1.5 0 0 0 3 4.5C3 13.6 10.4 21 19.5 21a1.5 1.5 0 0 0 1.5-1.5V17l-4-1-1.2 2.2a14.5 14.5 0 0 1-10-10L8 7 7 3Z" />
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c.8-4.1 3.5-6 8-6s7.2 1.9 8 6" />
      </>
    ),
    app: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="3" />
        <path d="M9 7h6M10 17h4" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14M14 7l5 5-5 5" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M6.1 8A7 7 0 0 1 18 6l2 6M17.9 16A7 7 0 0 1 6 18l-2-6" />
      </>
    ),
    alert: (
      <>
        <path d="M12 3 2.5 20h19L12 3Z" />
        <path d="M12 9v5M12 17h.01" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    cart: (
      <>
        <path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.7L20.5 8H6" />
        <circle cx="10" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <circle cx="9" cy="10" r="2" />
        <path d="m5 18 4.5-4.5 3 3 2.5-2.5 4 4" />
      </>
    ),
  }
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

function Logo({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="logo"
      onClick={onClick}
      aria-label="어떡하지 홈으로 이동"
    >
      <span className="logo-mark">
        <Icon name="shield" size={24} />
      </span>
      <span>어떡하지</span>
    </button>
  )
}

export default function App() {
  const initialPage: Page =
    window.location.pathname === "/emergency/chat"
      ? "emergency"
      : window.location.pathname === "/emergency"
        ? "emergency"
        : window.location.pathname === "/simulation"
          ? "simulation"
          : window.location.pathname === "/report"
            ? "report"
            : "home"
  const [page, setPage] = useState<Page>(initialPage)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [simStage, setSimStage] = useState<SimStage>("input")
  const [context, setContext] = useState("")
  const [selectedSituation, setSelectedSituation] =
    useState<SituationKey | null>(null)
  const [scenario, setScenario] = useState<Scenario>(scenarios.delivery)
  const [chatTyping, setChatTyping] = useState(false)
  const [chatMessages, setChatMessages] = useState<SimulationMessage[]>([])
  const [emergency, setEmergency] = useState<EmergencyKey | null>(null)
  const [emergencyText, setEmergencyText] = useState("")
  const [emergencyImage, setEmergencyImage] = useState<UploadedImage | null>(
    null,
  )
  const [emergencyAnalyzing, setEmergencyAnalyzing] = useState(false)
  const [submittedText, setSubmittedText] = useState("")
  const [emergencyMessages, setEmergencyMessages] =
    useState<AssistantMessage[]>([])
  const [emergencyTyping, setEmergencyTyping] = useState(false)

  const go = (next: Page) => {
    setPage(next)
    setMobileMenu(false)
    const paths: Record<Page, string> = {
      home: "/",
      simulation: "/simulation",
      emergency: "/emergency",
      emergencyChat: "/emergency/chat",
      report: "/report",
    }
    const path = paths[next]
    window.history.pushState({ page: next }, "", path)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
  useEffect(() => {
    window.history.replaceState(
      { page: initialPage },
      "",
      window.location.pathname,
    )
    const handleBack = (event: PopStateEvent) => {
      const next = event.state?.page as Page | undefined
      if (next) {
        setPage(next)
        setMobileMenu(false)
        window.scrollTo({ top: 0 })
      }
    }
    window.addEventListener("popstate", handleBack)
    return () => window.removeEventListener("popstate", handleBack)
  }, [])
  const analysis = useMemo(
    () => analyzeConversation(chatMessages),
    [chatMessages],
  )
  const resetSimulation = () => {
    setSimStage("input")
    setContext("")
    setSelectedSituation(null)
    setChatMessages([])
    setChatTyping(false)
    go("simulation")
  }
  const createScenario = () => {
    if (!selectedSituation && !context.trim()) return
    setSimStage("loading")
    const nextScenario = classifyScenario(context, selectedSituation)
    window.setTimeout(() => {
      setScenario(nextScenario)
      setSimStage("summary")
    }, 650)
  }
  const startChat = () => {
    setChatMessages([])
    setChatTyping(true)
    setSimStage("chat")
    window.setTimeout(() => {
      setChatMessages([{ from: "contact", text: scenario.opening }])
      setChatTyping(false)
    }, 650)
    window.setTimeout(() => setChatTyping(true), 1150)
    window.setTimeout(() => {
      setChatMessages((items) => [
        ...items,
        {
          from: "contact",
          text: `${scenario.subject} 처리가 지연될 수 있어요. 지금 이 대화에서 바로 확인해 주세요.`,
        },
      ])
      setChatTyping(false)
    }, 1950)
  }
  const sendSimulationMessage = (rawMessage: string) => {
    const message = rawMessage.trim().slice(0, 500)
    if (!message || simStage !== "chat" || chatTyping) return
    const userTurns = chatMessages.filter((item) => item.from === "user").length
    const sensitive =
      /(비밀번호|인증번호|보안카드|주민등록번호|계좌번호).{0,12}\d{3,}/.test(
        message,
      )
    const displayedMessage = sensitive
      ? "민감정보가 포함된 내용은 안전을 위해 전송하지 않았어요."
      : message
    setChatMessages((items) => [
      ...items,
      { from: "user", text: displayedMessage },
    ])
    setChatTyping(true)
    window.setTimeout(() => {
      const reply = sensitive
        ? "실제 비밀번호, 인증번호, 계좌번호는 시뮬레이션에서도 입력하면 안 됩니다. 민감정보를 보호하기 위해 대화를 안전하게 종료합니다."
        : createDemoReply(message, userTurns, scenario)
      setChatMessages((items) => [...items, { from: "contact", text: reply }])
      setChatTyping(false)
      if (sensitive || hasSafeEnding(message) || userTurns + 1 >= 5)
        setSimStage("complete")
    }, 700)
  }
  const openEmergencyChat = (
    key: EmergencyKey,
    text = "",
    attachment: UploadedImage | null = null,
  ) => {
    setEmergency(key)
    setSubmittedText(text)
    setEmergencyImage(attachment)
    setEmergencyMessages([
      ...(text ? [{ from: "user" as const, text }] : []),
      { from: "assistant", text: emergencyData[key].intro },
    ])
    go("emergencyChat")
  }
  const analyzeEmergency = () => {
    const value = emergencyText.trim()
    if (!value && !emergencyImage) return
    setEmergencyAnalyzing(true)
    const key: EmergencyKey = /송금|이체|돈을 보냈|입금/.test(value)
      ? "transfer"
      : /앱|설치|파일/.test(value)
        ? "app"
        : /링크|주소|눌렀|클릭/.test(value)
          ? "link"
          : /개인정보|신분증|비밀번호|인증번호/.test(value)
            ? "privacy"
            : /전화|사칭|검찰|경찰|은행 직원/.test(value)
              ? "call"
              : /중고|판매자|물품|거래/.test(value)
                ? "trade"
                : "custom"
    window.setTimeout(() => {
      setEmergencyAnalyzing(false)
      openEmergencyChat(key, value, emergencyImage)
    }, 750)
  }
  const sendEmergencyMessage = (message: string) => {
    if (!message.trim() || emergencyTyping || !emergency) return
    const value = message.trim()
    if (/송금|이체|돈을 보냈/.test(value)) setEmergency("transfer")
    else if (/앱.*설치|파일.*설치/.test(value)) setEmergency("app")
    else if (/인증번호|신분증|비밀번호.*알려|개인정보.*보냈/.test(value))
      setEmergency("privacy")
    setEmergencyMessages((items) => [...items, { from: "user", text: value }])
    setEmergencyTyping(true)
    window.setTimeout(() => {
      let response =
        "현재 안내된 조치를 우선 진행해 주세요. 판단이 어렵다면 관련 공식 기관에 직접 상담하는 것이 가장 안전합니다."
      if (/입력.*안|입력하지|안 했|안했/.test(value))
        response =
          "개인정보를 입력하지 않았다면 정보 노출 위험은 상대적으로 낮을 수 있어요. 다만 파일 다운로드나 앱 설치가 있었는지 확인하고, 의심스러운 사이트에는 다시 접속하지 마세요."
      else if (/설치.*안|설치하지|아무것도 설치/.test(value))
        response =
          "앱을 설치하지 않았다면 악성앱을 통한 피해 가능성은 상대적으로 낮을 수 있어요. 계정이나 금융거래에 이상이 있는지 살펴보고, 걱정되는 부분은 118에 상담할 수 있어요."
      else if (/송금|이체|돈을 보냈/.test(value))
        response =
          "금전 이체가 있었다면 추가 대화를 중단하고 즉시 112와 해당 금융회사에 연락해 지급정지를 요청하세요. 이체 내역과 연락 기록도 보관해 주세요."
      else if (/비밀번호|인증번호|신분증|개인정보/.test(value))
        response =
          "정보를 전달했다면 안전한 기기에서 관련 계정 비밀번호를 변경하고 금융회사에 노출 사실을 알려 주세요. 전달한 정보와 시각도 함께 정리해 두세요."
      setEmergencyMessages((items) => [
        ...items,
        { from: "assistant", text: response },
      ])
      setEmergencyTyping(false)
    }, 750)
  }

  return (
    <div className="app">
      <header className={`nav-shell ${page === "home" ? "home-nav" : ""}`}>
        <nav className="nav" aria-label="주요 메뉴">
          <Logo onClick={() => go("home")} />
          {page !== "home" && (
            <button
              className="menu-button"
              onClick={() => setMobileMenu(!mobileMenu)}
              aria-label="메뉴 열기"
              aria-expanded={mobileMenu}
            >
              <span />
              <span />
              <span />
            </button>
          )}
          {page !== "home" && (
            <div className={`nav-links ${mobileMenu ? "open" : ""}`}>
              <button onClick={() => go("home")}>홈</button>
              <button
                className={
                  page === "simulation" || page === "report" ? "active" : ""
                }
                onClick={() => go("simulation")}
              >
                금융사기 시뮬레이션
              </button>
              <button
                className={
                  page === "emergency" || page === "emergencyChat"
                    ? "active"
                    : ""
                }
                onClick={() => go("emergency")}
              >
                긴급 대응
              </button>
            </div>
          )}
        </nav>
      </header>
      <main>
        {page === "home" && (
          <Home
            onSimulation={() => go("simulation")}
            onEmergency={() => go("emergency")}
          />
        )}
        {page === "simulation" && (
          <Simulation
            stage={simStage}
            context={context}
            setContext={setContext}
            selectedSituation={selectedSituation}
            setSelectedSituation={setSelectedSituation}
            scenario={scenario}
            chatTyping={chatTyping}
            chatMessages={chatMessages}
            onCreate={createScenario}
            onReset={() => setSimStage("input")}
            onStart={startChat}
            onSend={sendSimulationMessage}
            onEnd={() => setSimStage("complete")}
            onReport={() => go("report")}
          />
        )}
        {page === "emergency" && (
          <Emergency
            selected={emergency}
            text={emergencyText}
            setText={setEmergencyText}
            attachment={emergencyImage}
            setAttachment={setEmergencyImage}
            analyzing={emergencyAnalyzing}
            onSelect={(key) => openEmergencyChat(key)}
            onAnalyze={analyzeEmergency}
          />
        )}
        {page === "emergencyChat" && emergency && (
          <EmergencyChat
            category={emergency}
            submittedText={submittedText}
            attachment={emergencyImage}
            messages={emergencyMessages}
            typing={emergencyTyping}
            onSend={sendEmergencyMessage}
            onBack={() => go("emergency")}
          />
        )}
        {page === "report" && (
          <Report
            analysis={analysis}
            scenario={scenario}
            onRetry={resetSimulation}
            onEmergency={() => go("emergency")}
          />
        )}
      </main>
      {page !== "home" && (
        <footer className="footer no-print">
          <div>
            <Logo onClick={() => go("home")} />
            <p>금융사기 예방을 위한 안전한 연습과 대응 안내</p>
          </div>
          <p>
            어떡하지의 안내는 교육용이며 공식 수사·신고 및 금융회사 상담을
            대신하지 않습니다.
          </p>
        </footer>
      )}
    </div>
  )
}

function Home({
  onSimulation,
  onEmergency,
}: {
  onSimulation: () => void
  onEmergency: () => void
}) {
  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-orb one" />
        <div className="hero-orb two" />
        <div className="container hero-inner">
          <h1>
            금융사기,
            <br />
            미리 경험하고 <em>빠르게 대응하세요.</em>
          </h1>
          <p>필요한 서비스를 선택해 바로 시작하세요.</p>
          <div className="home-actions" aria-label="주요 서비스">
            <button onClick={onSimulation}>
              <span className="home-action-icon">
                <Icon name="chat" size={34} />
              </span>
              <span className="home-action-copy">
                <strong>금융사기 시뮬레이션</strong>
                <small>
                  실제처럼 체험하고, 금융사기 대응 능력을 키워보세요.
                </small>
              </span>
              <span className="home-action-arrow">
                <Icon name="arrow" size={22} />
              </span>
            </button>
            <button className="emergency-action" onClick={onEmergency}>
              <span className="home-action-icon">
                <Icon name="alert" size={34} />
              </span>
              <span className="home-action-copy">
                <strong>긴급 대응</strong>
                <small>
                  사기가 의심된다면 지금 필요한 대응 방법을 확인하세요.
                </small>
              </span>
              <span className="home-action-arrow">
                <Icon name="arrow" size={22} />
              </span>
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function PageIntro({
  kicker,
  title,
  subtitle,
}: {
  kicker: string
  title: string
  subtitle: string
}) {
  return (
    <div className="page-intro">
      <span>{kicker}</span>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  )
}

type SimulationProps = {
  stage: SimStage
  context: string
  setContext: (value: string) => void
  selectedSituation: SituationKey | null
  setSelectedSituation: (value: SituationKey | null) => void
  scenario: Scenario
  chatTyping: boolean
  chatMessages: SimulationMessage[]
  onCreate: () => void
  onReset: () => void
  onStart: () => void
  onSend: (message: string) => void
  onEnd: () => void
  onReport: () => void
}
function Simulation(p: SimulationProps) {
  if (p.stage === "chat" || p.stage === "complete")
    return <SimulationChat {...p} />
  return (
    <section className="subpage">
      <div className="container preparation-container">
        <PageIntro
          kicker="안전한 예방 연습"
          title="AI 금융사기 시뮬레이션"
          subtitle="상황을 선택하거나 최근 있었던 일을 직접 입력하면, 관련 금융사기 유형을 바탕으로 안전한 교육용 시나리오를 만들어 드립니다."
        />
        {p.stage === "input" && (
          <div className="input-card simulation-setup">
            <div className="step-label">
              <span>1</span> 상황 선택
            </div>
            <h2>어떤 상황을 연습해 볼까요?</h2>
            <p>가장 가까운 상황 하나를 선택해 주세요.</p>
            <div className="setup-situations">
              {situations.map((item) => (
                <button
                  className={p.selectedSituation === item.key ? "selected" : ""}
                  key={item.key}
                  onClick={() =>
                    p.setSelectedSituation(
                      p.selectedSituation === item.key ? null : item.key,
                    )
                  }
                  aria-pressed={p.selectedSituation === item.key}
                >
                  <Icon name="check" size={16} />
                  {item.label}
                </button>
              ))}
            </div>
            <div className="setup-divider">
              <span>또는</span>
            </div>
            <label htmlFor="situation-description">
              최근 어떤 일이 있었나요?
            </label>
            <textarea
              id="situation-description"
              value={p.context}
              maxLength={500}
              onChange={(event) => p.setContext(event.target.value)}
              placeholder="예: 최근 중고거래로 노트북을 구매했고 배송을 기다리고 있어요."
            />
            <div className="privacy">
              <Icon name="lock" size={16} />
              <span>
                계좌번호, 비밀번호, 주민등록번호 등 민감한 개인정보는 입력하지
                마세요.
              </span>
            </div>
            <button
              className="primary-button full"
              disabled={!p.selectedSituation && !p.context.trim()}
              onClick={p.onCreate}
            >
              내 상황으로 시뮬레이션 만들기 <Icon name="spark" size={18} />
            </button>
          </div>
        )}
        {p.stage === "loading" && (
          <div className="loading-card" aria-live="polite">
            <div className="loader-visual">
              <Icon name="shield" size={34} />
              <span />
            </div>
            <h2>안전한 시나리오를 준비하고 있어요.</h2>
            <p>
              입력한 상황과 관련된 승인된 금융사기 유형을 확인하고 있습니다.
            </p>
            <div className="progress-list">
              <div className="done">
                <span>1</span>
                <p>상황 확인</p>
              </div>
              <div className="current">
                <span>2</span>
                <p>유형 분석</p>
              </div>
              <div>
                <span>3</span>
                <p>시나리오 구성</p>
              </div>
            </div>
            <span className="demo-note">
              규칙 기반 데모 모드로 안전하게 구성합니다.
            </span>
          </div>
        )}
        {p.stage === "summary" && (
          <div className="scenario-card">
            <div className="scenario-visual">
              <div>
                <Icon name="chat" size={48} />
              </div>
              <span>
                <Icon name="shield" size={22} />
              </span>
            </div>
            <div className="scenario-content">
              <span className="badge">맞춤형 시뮬레이션이 준비되었어요.</span>
              <p className="overline">시나리오</p>
              <h2>{p.scenario.title}</h2>
              <p>{p.scenario.description}</p>
              <div className="scenario-meta">
                <span>
                  <Icon name="lock" size={16} /> 안전한 교육용 가상 상황
                </span>
                <span>
                  <Icon name="chat" size={16} /> 자유 대화 4~6회
                </span>
              </div>
              <div className="demo-disclosure">
                현재는 실제 인공지능이 연결되지 않은 규칙 기반 데모 모드입니다.
                입력에 따라 문맥형 응답을 제공하며, 향후 인공지능 연동을 고려한
                구조로 구성되어 있습니다.
              </div>
              <div className="button-row">
                <button className="primary-button" onClick={p.onStart}>
                  시뮬레이션 시작하기 <Icon name="arrow" size={18} />
                </button>
                <button className="text-button" onClick={p.onReset}>
                  상황 다시 선택하기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function Typing() {
  return (
    <div className="typing" aria-label="답변을 작성하고 있어요">
      <span>
        <Icon name="spark" size={16} />
      </span>
      <div>
        <i />
        <i />
        <i />
      </div>
    </div>
  )
}

function SimulationChat(p: SimulationProps) {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const userTurns = p.chatMessages.filter(
    (message) => message.from === "user",
  ).length
  const progress = p.stage === "complete" ? 5 : Math.min(5, userTurns + 1)
  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" })
  }, [p.chatMessages, p.chatTyping, p.stage])
  const submit = () => {
    if (!input.trim() || p.chatTyping) return
    p.onSend(input)
    setInput("")
  }
  return (
    <section className="chat-page">
      <div className="container chat-layout">
        <aside className="scenario-sidebar">
          <span className="sidebar-kicker">현재 체험 중인 상황</span>
          <div className="sidebar-icon">
            <Icon name="shield" size={26} />
          </div>
          <h1>{p.scenario.title}</h1>
          <p>{p.scenario.description}</p>
          <div className="progress-head">
            <strong>진행 단계</strong>
            <span>{progress} / 5</span>
          </div>
          <div className="progress-bar">
            <span style={{ width: `${progress * 20}%` }} />
          </div>
          <div className="education-notice">
            <Icon name="lock" size={18} />
            <p>
              이 대화는 금융사기 예방을 위한 가상 시뮬레이션입니다. 실제
              금융기관이나 개인과 연결되지 않습니다.
            </p>
          </div>
          <button className="outline-button" onClick={p.onEnd}>
            <Icon name="close" size={17} /> 시뮬레이션 종료하기
          </button>
        </aside>
        <div className="messenger">
          <div className="messenger-header">
            <div>
              <h2>가상 대화 시뮬레이션</h2>
              <p>
                <span /> 규칙 기반 데모 모드
              </p>
            </div>
            <span className="header-shield">
              <Icon name="shield" size={22} />
            </span>
          </div>
          <div className="messages" ref={scrollRef} aria-live="polite">
            <div className="time-divider">오늘 오후 2:18</div>
            {p.chatMessages.map((m, i) => (
              <div className={`message-row ${m.from}`} key={`${m.text}-${i}`}>
                {m.from === "contact" && (
                  <span className="avatar">
                    <Icon name="chat" size={18} />
                  </span>
                )}
                <div>
                  <span className="sender">
                    {m.from === "contact" ? "의심스러운 연락" : "나"}
                  </span>
                  <p>{m.text}</p>
                </div>
              </div>
            ))}
            {p.chatTyping && <Typing />}
            {p.stage === "complete" && (
              <div className="complete-card">
                <span>
                  <Icon name="check" size={26} />
                </span>
                <h3>시뮬레이션이 종료되었습니다.</h3>
                <p>대화 내용을 바탕으로 대응 결과를 분석해 드릴게요.</p>
                <button className="primary-button" onClick={p.onReport}>
                  결과 분석 리포트 보기 <Icon name="arrow" size={18} />
                </button>
              </div>
            )}
          </div>
          {p.stage === "chat" && (
            <div className="simulation-chat-input">
              <div className="privacy">
                <Icon name="lock" size={15} />
                <span>
                  실제 비밀번호, 인증번호, 계좌번호는 입력하지 마세요.
                </span>
              </div>
              <div>
                <textarea
                  rows={1}
                  maxLength={500}
                  value={input}
                  disabled={p.chatTyping}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault()
                      submit()
                    }
                  }}
                  placeholder="상대방에게 보낼 답변을 직접 입력해 주세요."
                />
                <button
                  disabled={!input.trim() || p.chatTyping}
                  onClick={submit}
                >
                  <Icon name="send" size={17} /> 전송
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

type EmergencyProps = {
  selected: EmergencyKey | null
  text: string
  setText: (value: string) => void
  attachment: UploadedImage | null
  setAttachment: (value: UploadedImage | null) => void
  analyzing: boolean
  onSelect: (key: EmergencyKey) => void
  onAnalyze: () => void
}
function Emergency(p: EmergencyProps) {
  const [uploadError, setUploadError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!p.attachment && fileRef.current) fileRef.current.value = ""
  }, [p.attachment])
  const cards: [EmergencyKey, IconName][] = [
    ["transfer", "send"],
    ["link", "link"],
    ["app", "app"],
    ["privacy", "user"],
    ["call", "phone"],
    ["trade", "cart"],
  ]
  const selectImage = (file?: File) => {
    if (!file) return
    const supported = ["image/jpeg", "image/png", "image/webp"]
    const supportedName = /\.(jpe?g|png|webp)$/i.test(file.name)
    if (!supported.includes(file.type) && !supportedName) {
      setUploadError("JPG, JPEG, PNG, WEBP 형식의 이미지만 첨부할 수 있어요.")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("사진 용량은 10MB 이하로 첨부해 주세요.")
      return
    }
    setUploadError("")
    const reader = new FileReader()
    reader.onerror = () =>
      setUploadError("사진을 불러오지 못했어요. 다시 시도해 주세요.")
    reader.onload = () => {
      if (typeof reader.result === "string")
        p.setAttachment({ name: file.name, preview: reader.result })
    }
    reader.readAsDataURL(file)
  }
  return (
    <section className="subpage emergency-page">
      <div className="container">
        <PageIntro
          kicker="상황별 빠른 안내"
          title="금융사기 긴급 대응"
          subtitle="현재 상황을 선택하거나 직접 설명해 주세요. 필요한 대응 방법과 공식 신고 경로를 안내해 드립니다."
        />
        <div className="urgent-notice">
          <span>
            <Icon name="alert" size={22} />
          </span>
          <div>
            <strong>이미 돈을 송금하셨나요?</strong>
            <p>
              사기가 의심된다면 즉시 112와 해당 금융회사에 신고하고 지급정지를
              요청하세요.
            </p>
          </div>
        </div>
        <div className="section-heading left">
          <span>상황 선택</span>
          <h2>어떤 상황에 처하셨나요?</h2>
          <p>가장 가까운 상황을 선택해 주세요.</p>
        </div>
        <div className="situation-grid">
          {cards.map(([key, icon]) => (
            <button
              className={p.selected === key ? "selected" : ""}
              key={key}
              onClick={() => p.onSelect(key)}
            >
              <span>
                <Icon name={icon} size={25} />
              </span>
              <div>
                <h3>{emergencyData[key].title}</h3>
                <p>{emergencyData[key].short}</p>
              </div>
              <Icon name="arrow" size={18} />
            </button>
          ))}
        </div>
        <div className="direct-input">
          <div>
            <span className="direct-icon">
              <Icon name="chat" size={24} />
            </span>
            <h2>내 상황을 직접 설명해 주세요.</h2>
            <p>
              의심스러운 문자, 대화, 전화, 송금이나 피싱 상황을 글과 사진으로
              알려주세요.
            </p>
          </div>
          <textarea
            value={p.text}
            onChange={(e) => p.setText(e.target.value)}
            placeholder="예: 은행 직원이라는 사람에게 전화를 받고 안내에 따라 돈을 이체했어요. 어떻게 해야 하나요?"
          />
          <div className="upload-zone">
            <input
              ref={fileRef}
              id="evidence-image"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={(event) => selectImage(event.target.files?.[0])}
            />
            {!p.attachment ? (
              <label htmlFor="evidence-image">
                <span>
                  <Icon name="image" size={23} />
                </span>
                <span>
                  <strong>사진 첨부하기</strong>
                  <small>
                    의심스러운 문자, 채팅, 계좌번호, 전화번호 등의 화면을 첨부해
                    주세요.
                  </small>
                </span>
                <Icon name="arrow" size={18} />
              </label>
            ) : (
              <div className="upload-preview">
                <img src={p.attachment.preview} alt="첨부한 화면 미리보기" />
                <div>
                  <strong>{p.attachment.name}</strong>
                  <small>
                    사진은 현재 기기에서만 미리보기되며 외부로 전송되지 않아요.
                  </small>
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        if (fileRef.current) {
                          fileRef.current.value = ""
                          fileRef.current.click()
                        }
                      }}
                    >
                      사진 바꾸기
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        p.setAttachment(null)
                        if (fileRef.current) fileRef.current.value = ""
                      }}
                    >
                      사진 삭제
                    </button>
                  </div>
                </div>
              </div>
            )}
            {uploadError && (
              <p className="upload-error" role="alert">
                {uploadError}
              </p>
            )}
            <p className="upload-safety">
              <Icon name="lock" size={15} />
              제출 전에 비밀번호, 인증번호, 전체 주민등록번호 등 불필요한
              민감정보가 보이지 않도록 사진을 자르거나 가려 주세요.
            </p>
          </div>
          <div className="direct-footer">
            <span>
              <Icon name="lock" size={16} /> 첨부 자료는 저장하거나 외부
              서비스로 전송하지 않습니다.
            </span>
            <button
              className="primary-button"
              disabled={(!p.text.trim() && !p.attachment) || p.analyzing}
              onClick={p.onAnalyze}
            >
              {p.analyzing
                ? "상황을 분석하고 있어요..."
                : "AI로 대응 방법 확인하기"}
              {!p.analyzing && <Icon name="arrow" size={17} />}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

type EmergencyChatProps = {
  category: EmergencyKey
  submittedText: string
  attachment: UploadedImage | null
  messages: AssistantMessage[]
  typing: boolean
  onSend: (message: string) => void
  onBack: () => void
}
function EmergencyChat(p: EmergencyChatProps) {
  const [input, setInput] = useState("")
  const extractedPhone =
    p.submittedText.match(/01[016789][-\s]?\d{3,4}[-\s]?\d{4}/)?.[0] || ""
  const extractedAccount =
    p.submittedText
      .match(/\d[\d-\s]{8,18}\d/g)
      ?.find(
        (value) =>
          value.replace(/\D/g, "").length >= 10 &&
          !value.includes(extractedPhone),
      ) || ""
  const [phoneNumber, setPhoneNumber] = useState(extractedPhone)
  const [accountNumber, setAccountNumber] = useState(extractedAccount)
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "done">(
    "idle",
  )
  const scrollRef = useRef<HTMLDivElement>(null)
  const initialScrollSet = useRef(false)
  const previousMessageCount = useRef(p.messages.length)
  const data = emergencyData[p.category]
  const firstResponseEnd = p.submittedText ? 2 : 1
  const isAnalysis = Boolean(p.submittedText || p.attachment)
  const similarCase =
    p.category === "trade"
      ? {
          type: "중고거래 선입금 사기",
          summary:
            "판매자가 물품 발송 전 입금을 받은 뒤 연락을 끊는 사례가 있어요.",
          similarity:
            "개인 간 거래, 계좌이체 또는 판매자 연락 중단 여부를 함께 살펴봐야 해요.",
          signs:
            "시세보다 지나치게 낮은 가격, 안전결제 거부, 플랫폼 밖 연락 유도",
        }
      : p.category === "link" || p.category === "app"
        ? {
            type: "문자 링크를 이용한 피싱",
            summary:
              "기관이나 배송 안내를 사칭해 링크 접속 또는 앱 설치를 유도하는 사례가 있어요.",
            similarity:
              "출처를 확인하기 어려운 메시지와 외부 화면 이동 요청이 유사 신호일 수 있어요.",
            signs: "긴급함 강조, 주소가 낯선 링크, 개인정보나 앱 설치 요구",
          }
        : {
            type: "기관·지인 사칭 금융사기",
            summary:
              "신뢰할 만한 사람이나 기관을 사칭해 송금과 정보 제공을 요구하는 사례가 있어요.",
            similarity:
              "갑작스러운 연락, 긴급한 요청, 공식 경로가 아닌 확인 방식이 공통 신호일 수 있어요.",
            signs: "즉시 송금 요구, 비밀 유지 요청, 비밀번호·인증번호 요구",
          }
  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    if (!initialScrollSet.current) {
      node.scrollTop = 0
      initialScrollSet.current = true
      previousMessageCount.current = p.messages.length
      return
    }
    if (p.messages.length > previousMessageCount.current) {
      node.scrollTo({ top: node.scrollHeight, behavior: "smooth" })
    }
    previousMessageCount.current = p.messages.length
  }, [p.messages, p.typing])
  const submit = () => {
    if (!input.trim()) return
    p.onSend(input)
    setInput("")
  }
  return (
    <section className="emergency-chat-page">
      <div className="container emergency-chat-heading">
        <div>
          <span className="badge">금융사기 대응 안내</span>
          <h1>어떡하지 긴급 대응 도우미</h1>
          <p>
            현재 상황에 필요한 대응 방법을 안내하고, 궁금한 점에 답변해
            드립니다.
          </p>
        </div>
        <button className="outline-button" onClick={p.onBack}>
          <Icon name="refresh" size={16} /> 다른 상황 선택하기
        </button>
      </div>
      <div className="container emergency-chat-layout">
        <aside className="emergency-sidebar">
          <span className="sidebar-kicker">현재 상황</span>
          <div className="sidebar-icon">
            <Icon name="alert" size={24} />
          </div>
          <h2>{data.title}</h2>
          <p>{p.submittedText || data.short}</p>
          {p.attachment && (
            <img
              className="sidebar-attachment"
              src={p.attachment.preview}
              alt="첨부한 상황 화면"
            />
          )}
          <div className="sidebar-divider" />
          <h3>빠른 연락</h3>
          <a href="tel:112">
            <span>112</span>
            <div>
              <strong>경찰청</strong>
              <small>긴급 신고 및 피해 대응</small>
            </div>
            <Icon name="phone" size={16} />
          </a>
          {data.organizations.includes("kisa") && (
            <a href="tel:118">
              <span>118</span>
              <div>
                <strong>정보보호 상담</strong>
                <small>스미싱 및 악성앱 상담</small>
              </div>
              <Icon name="phone" size={16} />
            </a>
          )}
          <p className="sidebar-safety">
            <Icon name="lock" size={15} /> 이 안내는 공식 신고를 대신하지
            않습니다.
          </p>
        </aside>
        <div className="emergency-conversation">
          <div className="assistant-header">
            <span>
              <Icon name="shield" size={23} />
            </span>
            <div>
              <h2>어떡하지 대응 도우미</h2>
              <p>
                <i /> 규칙 기반 데모 분석
              </p>
            </div>
          </div>
          <div
            className="emergency-messages"
            ref={scrollRef}
            aria-live="polite"
          >
            {p.messages.slice(0, firstResponseEnd).map((message, index) => (
              <div
                className={`prep-message ${message.from}`}
                key={`${message.text}-${index}`}
              >
                {message.from === "assistant" && (
                  <span>
                    <Icon name="shield" size={18} />
                  </span>
                )}
                <div>
                  <small>
                    {message.from === "assistant" ? "어떡하지 도우미" : "나"}
                  </small>
                  <p>{message.text}</p>
                </div>
              </div>
            ))}
            {isAnalysis && (
              <div className="demo-analysis-notice">
                <Icon name="spark" size={18} />
                <p>
                  <strong>데모 분석 결과</strong>
                  실제 인공지능·이미지 문자 인식·신고 데이터베이스가 연결되지
                  않았습니다. 입력한 글의 핵심어를 바탕으로 참고 정보를
                  보여드려요.
                </p>
              </div>
            )}
            {isAnalysis && (
              <div className="analysis-result-stack">
                <section className="result-card summary-result">
                  <div className="result-card-heading">
                    <span>
                      <Icon name="search" size={21} />
                    </span>
                    <div>
                      <small>입력 내용 확인</small>
                      <h3>상황 분석 요약</h3>
                    </div>
                  </div>
                  <p>
                    {p.submittedText
                      ? `${data.title} 상황과 관련된 표현이 확인되었어요. 상대의 신원과 요청 내용을 공식 경로에서 별도로 확인하는 것이 필요합니다.`
                      : "첨부한 사진이 확인되었어요. 현재 데모에서는 이미지 속 문자를 읽을 수 없으므로 아래 대화창에 핵심 내용을 추가해 주세요."}
                  </p>
                  {p.attachment && (
                    <div className="result-attachment">
                      <img src={p.attachment.preview} alt="분석할 첨부 화면" />
                      <span>첨부 화면 · 기기 내 미리보기</span>
                    </div>
                  )}
                  <div className="uncertainty-note">
                    입력 정보만으로 실제 사기 여부를 확정할 수 없어요.
                  </div>
                </section>
                <section className="result-card">
                  <div className="result-card-heading">
                    <span>
                      <Icon name="alert" size={21} />
                    </span>
                    <div>
                      <small>참고 사례</small>
                      <h3>비슷한 금융사기 사례</h3>
                    </div>
                  </div>
                  <p className="case-lead">
                    입력하신 상황과 유사한 금융사기 사례가 있습니다.
                  </p>
                  <dl className="case-details">
                    <div>
                      <dt>사기 유형</dt>
                      <dd>{similarCase.type}</dd>
                    </div>
                    <div>
                      <dt>사례 요약</dt>
                      <dd>{similarCase.summary}</dd>
                    </div>
                    <div>
                      <dt>유사한 점</dt>
                      <dd>{similarCase.similarity}</dd>
                    </div>
                    <div>
                      <dt>주요 경고 신호</dt>
                      <dd>{similarCase.signs}</dd>
                    </div>
                  </dl>
                </section>
                <section className="result-card">
                  <div className="result-card-heading">
                    <span>
                      <Icon name="phone" size={21} />
                    </span>
                    <div>
                      <small>직접 확인</small>
                      <h3>계좌번호 · 전화번호 조회</h3>
                    </div>
                  </div>
                  <p>추출된 정보가 있다면 정확한지 확인하고 수정해 주세요.</p>
                  <div className="extracted-fields">
                    <label>
                      전화번호
                      <input
                        value={phoneNumber}
                        onChange={(event) => {
                          setPhoneNumber(event.target.value)
                          setLookupState("idle")
                        }}
                        placeholder="확인할 전화번호 입력"
                      />
                    </label>
                    <label>
                      계좌번호
                      <input
                        value={accountNumber}
                        onChange={(event) => {
                          setAccountNumber(event.target.value)
                          setLookupState("idle")
                        }}
                        placeholder="확인할 계좌번호 입력"
                      />
                    </label>
                  </div>
                  <button
                    className="lookup-button"
                    disabled={
                      (!phoneNumber.trim() && !accountNumber.trim()) ||
                      lookupState === "loading"
                    }
                    onClick={() => {
                      setLookupState("loading")
                      window.setTimeout(() => setLookupState("done"), 650)
                    }}
                  >
                    <Icon name="search" size={17} />
                    {lookupState === "loading"
                      ? "조회 화면을 준비하고 있어요..."
                      : "신고 이력 조회하기"}
                  </button>
                  {lookupState === "done" && (
                    <div className="lookup-demo-result" role="status">
                      <strong>데모 안내</strong>
                      현재 실제 신고 데이터베이스와 연결되어 있지 않아 신고
                      이력을 조회하지 않았습니다. 실제 조회 서비스가 연결되기
                      전까지 결과를 제공하지 않습니다.
                    </div>
                  )}
                  <small className="lookup-caution">
                    신고 이력이 없더라도 안전한 연락처나 계좌라는 뜻은 아닙니다.
                  </small>
                </section>
                <section className="result-card action-result">
                  <div className="result-card-heading">
                    <span>
                      <Icon name="check" size={21} />
                    </span>
                    <div>
                      <small>안전 행동 안내</small>
                      <h3>지금 필요한 대응 방법</h3>
                    </div>
                  </div>
                  <div className="action-steps">
                    {data.steps.map((step, index) => (
                      <div key={step.title}>
                        <span>{index + 1}</span>
                        <div>
                          <h4>{step.title}</h4>
                          <p>{step.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                <p className="analysis-disclaimer">
                  <Icon name="alert" size={15} /> AI 분석 결과는 참고용이며,
                  실제 금융사기 여부를 확정하는 판단은 아닙니다.
                </p>
              </div>
            )}
            {!isAnalysis && (
              <div className="action-card chat-guidance">
                <div className="action-title">
                  <span>
                    <Icon name="alert" size={21} />
                  </span>
                  <div>
                    <small>우선 확인하세요</small>
                    <h3>지금 해야 할 일</h3>
                  </div>
                </div>
                <div className="action-steps">
                  {data.steps.map((step, index) => (
                    <div key={step.title}>
                      <span>{index + 1}</span>
                      <div>
                        <h4>{step.title}</h4>
                        <p>{step.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="chat-organizations">
              <h3>관련 공식 기관</h3>
              <div className="organization-grid">
                {data.organizations.map((key) => {
                  const item = organizationData[key]
                  return (
                    <a
                      key={key}
                      href={item.href}
                      target={
                        item.href.startsWith("http") ? "_blank" : undefined
                      }
                      rel="noreferrer"
                    >
                      <span className="org-mark">{item.mark}</span>
                      <div>
                        <h4>{item.name}</h4>
                        <p>{item.desc}</p>
                        <strong>
                          {item.action} <Icon name="arrow" size={15} />
                        </strong>
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
            {p.messages.slice(firstResponseEnd).map((message, index) => (
              <div
                className={`prep-message ${message.from}`}
                key={`후속-${message.text}-${index}`}
              >
                {message.from === "assistant" && (
                  <span>
                    <Icon name="shield" size={18} />
                  </span>
                )}
                <div>
                  <small>
                    {message.from === "assistant" ? "어떡하지 도우미" : "나"}
                  </small>
                  <p>{message.text}</p>
                </div>
              </div>
            ))}
            {p.typing && <Typing />}
          </div>
          <div className="emergency-chat-input">
            <div className="privacy">
              <Icon name="lock" size={15} />
              <span>민감한 개인정보는 입력하지 마세요.</span>
            </div>
            <div>
              <textarea
                rows={1}
                value={input}
                disabled={p.typing}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    submit()
                  }
                }}
                placeholder="추가로 궁금한 점을 입력해 주세요."
              />
              <button disabled={!input.trim() || p.typing} onClick={submit}>
                <Icon name="send" size={17} /> 전송
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Report({
  analysis,
  scenario,
  onRetry,
  onEmergency,
}: {
  analysis: ConversationAnalysis
  scenario: Scenario
  onRetry: () => void
  onEmergency: () => void
}) {
  const displayScore = analysis.score
  const status = analysis.summary
  return (
    <section className="subpage report-page">
      <div className="container report-container">
        <PageIntro
          kicker="나의 예방 훈련 결과"
          title="나의 금융사기 대응 분석 리포트"
          subtitle="시뮬레이션에서 직접 나눈 대화를 일관된 안전 대응 기준으로 분석하고, 더 안전한 대응 방법을 알려드립니다."
        />
        <div className="report-date">{scenario.title} · 오늘 완료</div>
        <div className="score-card">
          <div className="score-copy">
            <span>종합 분석</span>
            <h2>나의 대응 점수</h2>
            <div className="score-mobile">
              {displayScore}
              <small> / 100점</small>
            </div>
            <h3>{status}</h3>
            <p>
              의심 인식, 민감정보 보호, 공식 경로 확인, 위험 요청 거절, 대화
              종료의 다섯 항목을 각각 20점 기준으로 평가했어요.
            </p>
          </div>
          <div
            className="score-ring"
            style={
              { "--score": `${displayScore * 3.6}deg` } as React.CSSProperties
            }
          >
            <div>
              <strong>{displayScore}</strong>
              <span>/ 100점</span>
            </div>
          </div>
        </div>
        <div className="analysis-grid">
          <article className="analysis-card good">
            <span className="analysis-icon">
              <Icon name="check" size={23} />
            </span>
            <h3>잘한 대응</h3>
            <ul>
              {analysis.safe.slice(0, 3).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </article>
          <article className="analysis-card caution">
            <span className="analysis-icon">
              <Icon name="alert" size={23} />
            </span>
            <h3>주의가 필요한 대응</h3>
            <ul>
              {analysis.risky.slice(0, 3).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </article>
          <article className="analysis-card signal">
            <span className="analysis-icon">
              <Icon name="search" size={23} />
            </span>
            <h3>놓치기 쉬운 사기 신호</h3>
            <ul>
              {analysis.missed.slice(0, 3).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </article>
        </div>
        <div className="guide-card">
          <div className="section-heading left">
            <span>맞춤 예방 안내</span>
            <h2>다음에는 이렇게 대응해 보세요.</h2>
          </div>
          <div className="guide-grid">
            {([
              [
                "building",
                "공식 채널에서 직접 확인하기",
                "메시지 속 연락처 대신 공식 앱과 대표번호를 이용하세요.",
              ],
              [
                "lock",
                "민감한 정보 입력하지 않기",
                "비밀번호와 인증번호는 누구에게도 알려주지 마세요.",
              ],
              [
                "phone",
                "피해가 의심되면 즉시 신고하기",
                "금전 피해가 생겼다면 112와 금융회사에 바로 연락하세요.",
              ],
            ] as [IconName, string, string][]).map(([icon, title, body], i) => (
              <div key={title}>
                <span>
                  <Icon name={icon} />
                </span>
                <small>0{i + 1}</small>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="report-actions no-print">
          <button className="primary-button" onClick={() => window.print()}>
            <Icon name="download" size={18} /> 인쇄 또는 문서로 저장
          </button>
          <button className="outline-button" onClick={onRetry}>
            <Icon name="refresh" size={17} /> 다시 시뮬레이션 하기
          </button>
          <button className="text-button" onClick={onEmergency}>
            긴급 대응 가이드 보기 <Icon name="arrow" size={17} />
          </button>
          <p>
            인쇄 창에서 문서 저장 기능을 선택하면 한글 리포트를 파일로 보관할 수
            있습니다.
          </p>
        </div>
      </div>
    </section>
  )
}
