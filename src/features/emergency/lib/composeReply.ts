// 피해 대응 상담에서 도우미가 할 말을 만듭니다.
// 1) 서버 응답 전후를 비교해 "무엇이 바뀌었는지"(사실·카드·다음 질문)를 설명하고
// 2) 사용자가 글로 물으면 질문 의도(환급·신고·앱·개인정보·증거·먼저 할 일)에 맞춰 지금 카드 내용으로 답해요.
// 3) 서버가 AI 근거 설명(explanation)을 주면 그 설명을 우선 붙여요. (AI-07 연결 전까지는 규칙 기반 답변)
// 실제 서버에서도 그대로 동작해요. 서버 응답 모양(facts·responseCards·nextQuestion)만 씁니다.
import type { FactKey, Institution, NextQuestion, ResponseCard, SolutionCard, SolutionFacts, YesNoUnknown } from "@/api"
// 카드의 actions·requiredMaterials는 문자열 또는 객체라서 제목·본문으로 맞춰 읽어요. (다른 파일에 의존하지 않도록 여기 둠)
type TextItem = { title?: string; body: string }
const pickStr = (o: Record<string, unknown>, keys: string[]) => {
  for (const k of keys) {
    const v = o[k]
    if (typeof v === "string" && v.trim()) return v.trim()
    if (typeof v === "number") return String(v)
  }
  return undefined
}
function toTextItems(list: unknown): TextItem[] {
  if (!Array.isArray(list)) return []
  const out: TextItem[] = []
  for (const raw of list) {
    if (typeof raw === "string") { if (raw.trim()) out.push({ body: raw.trim() }) }
    else if (raw && typeof raw === "object") {
      const o = raw as Record<string, unknown>
      const title = pickStr(o, ["title", "name", "label", "step", "heading", "summary"])
      const body = pickStr(o, ["body", "description", "content", "text", "detail", "guide"])
      if (title || body) out.push({ title: body ? title : undefined, body: body ?? title! })
    }
  }
  return out
}

export type SolutionView = { facts: SolutionFacts | null; cards: SolutionCard[]; nextQuestion: NextQuestion | null }
type Details = Record<string, ResponseCard>

const FACT_PHRASE: Record<FactKey, Record<YesNoUnknown, string>> = {
  transferredMoney: { YES: "돈을 보내신 것", NO: "돈은 보내지 않으신 것", UNKNOWN: "송금 여부는 아직 모르는 것" },
  sharedInformation: { YES: "개인정보를 알려 주신 것", NO: "개인정보는 알려 주지 않으신 것", UNKNOWN: "정보 제공 여부는 아직 모르는 것" },
  installedApp: { YES: "앱을 설치하신 것", NO: "앱은 설치하지 않으신 것", UNKNOWN: "앱 설치 여부는 아직 모르는 것" },
  contactContinues: { YES: "상대와 아직 연락이 이어지는 것", NO: "상대와 연락이 끊긴 것", UNKNOWN: "연락 지속 여부는 아직 모르는 것" },
}
/** 사실을 새로 알게 됐을 때 하는 말 ("반영했어요" 같은 시스템 말투 대신 대화체로) */
const FACT_ACK: Record<FactKey, Record<YesNoUnknown, string>> = {
  transferredMoney: { YES: "돈을 보내셨군요.", NO: "다행히 돈은 보내지 않으셨네요.", UNKNOWN: "송금했는지는 확인되면 알려 주세요." },
  sharedInformation: { YES: "개인정보를 알려 주셨군요.", NO: "개인정보는 알려 주지 않으셨네요.", UNKNOWN: "정보를 알려 줬는지는 확인되면 알려 주세요." },
  installedApp: { YES: "상대가 알려 준 앱을 설치하셨군요.", NO: "앱은 설치하지 않으셨네요.", UNKNOWN: "앱을 설치했는지는 확인되면 알려 주세요." },
  contactContinues: { YES: "아직 상대와 연락이 이어지고 있군요.", NO: "상대와는 연락이 끊겼군요.", UNKNOWN: "연락이 이어지는지는 확인되면 알려 주세요." },
}
const FACT_ORDER: FactKey[] = ["transferredMoney", "sharedInformation", "installedApp", "contactContinues"]

const has = (cards: SolutionCard[], code: string) => cards.some((c) => c.code === code)
const titleOf = (c: SolutionCard, d: Details) => d[c.code]?.title ?? c.title ?? c.code
const isUrgent = (c: SolutionCard, d: Details) => (c.priority ?? d[c.code]?.priority) === "URGENT" // 상담 응답의 우선순위가 먼저
function actionsOf(code: string, d: Details) {
  return toTextItems(d[code]?.actions).map((a) => (a.title ? `${a.title}: ${a.body}` : a.body))
}
/** "가장 먼저 '제목'부터 해 주세요. 본문" 꼴 */
function firstStep(code: string, d: Details) {
  const a = toTextItems(d[code]?.actions)[0]
  if (!a) return null
  return a.title ? `가장 먼저 '${a.title}'부터 해 주세요. ${a.body}` : `가장 먼저 할 일: ${a.body}`
}
const joinKo = (list: string[]) => (list.length <= 1 ? list.join("") : `${list.slice(0, -1).join(", ")}, ${list[list.length - 1]}`)

/** 서버 응답 전후 비교 → "무엇이 바뀌었는지" 설명. 바뀐 게 없으면 빈 배열 */
export function describeChange(prev: SolutionView, next: SolutionView, d: Details, fixedGuide = false): string[] {
  const lines: string[] = []
  if (next.facts) {
    const changed = FACT_ORDER.filter((k) => prev.facts?.[k] !== next.facts![k] && !(prev.facts === null && next.facts![k] === "UNKNOWN"))
    lines.push(...changed.map((k) => FACT_ACK[k][next.facts![k]]))
  }
  // 유형 카드로 시작했으면 화면에 고정 안내만 보여서, 서버 대응 카드가 늘고 줄어든 건 말하지 않아요
  const added = fixedGuide ? [] : next.cards.filter((c) => !has(prev.cards, c.code))
  const removed = fixedGuide ? [] : prev.cards.filter((c) => !has(next.cards, c.code))
  if (added.length) {
    lines.push(`${joinKo(added.map((c) => `'${titleOf(c, d)}'`))} 대응을 추가했어요.`)
    const urgent = added.find((c) => isUrgent(c, d))
    const step = urgent && firstStep(urgent.code, d)
    if (step) lines.push(step)
  }
  if (removed.length) lines.push(`${joinKo(removed.map((c) => `'${titleOf(c, d)}'`))} 대응은 지금 상황에 해당하지 않아 뺐어요.`)
  // 다음 확인 질문은 채팅 맨 아래 [예][아니오][모름] 말풍선이 따로 보여 줘서 여기서는 말하지 않아요
  if (!next.nextQuestion && prev.nextQuestion) lines.push("여쭤볼 건 다 여쭤봤어요. 위 대응 방법을 순서대로 진행하시고, 궁금한 점은 편하게 물어봐 주세요.")
  return lines
}

type Intent = { test: RegExp; answer: (s: SolutionView, d: Details, inst: Institution[]) => string }
const SECONDHAND = "SECONDHAND_TRADE_RESPONSE"

/** 지금 상황에서 할 일을 순서대로 정리 (카드마다 첫 조치, 중고거래 송금은 신고 중심 순서) */
function planFor(s: SolutionView, d: Details): string {
  if (has(s.cards, SECONDHAND) && s.facts?.transferredMoney === "YES")
    return "지금 하실 일을 순서대로 정리할게요. 1) 판매 글, 대화 내용, 상대 계좌번호, 송금 내역을 캡처해 두세요. 2) 경찰 사이버범죄 신고시스템에 온라인으로 신고하거나 112에 신고해 주세요. 3) 송금한 은행 고객센터에도 사기 피해 사실과 상대 계좌를 알려 주세요. 4) 당근 등 거래한 플랫폼에도 판매자를 신고해 주세요. 신고까지 마치셨다면 '신고했어요'라고 알려 주세요. 그다음 할 일을 안내할게요."
  const steps: string[] = []
  const ordered = [...s.cards.filter((c) => isUrgent(c, d)), ...s.cards.filter((c) => !isUrgent(c, d))]
  for (const c of ordered) {
    const a = toTextItems(d[c.code]?.actions)[0]
    if (a) steps.push(a.title ? `${a.title}: ${a.body}` : a.body)
    if (steps.length >= 4) break
  }
  // 카드가 하나뿐이면 그 카드의 다음 조치까지 이어서 보여 줘요 (최대 3개)
  if (steps.length < 3 && ordered[0]) {
    for (const a of toTextItems(d[ordered[0].code]?.actions).slice(1)) {
      if (steps.length >= 3) break
      steps.push(a.title ? `${a.title}: ${a.body}` : a.body)
    }
  }
  if (!steps.length) return "아래 공식 기관에 상담해 지금 상황에 맞는 조치를 확인하는 게 가장 안전해요."
  return `지금 하실 일을 순서대로 정리할게요. ${steps.map((t, i) => `${i + 1}) ${t}`).join(" ")} 다 하셨다면 '신고했어요'처럼 알려 주세요. 그다음 할 일을 안내할게요.`
}

const INTENTS: Intent[] = [
  {
    // 기프트카드·상품권 핀번호를 보낸 경우 (계좌 송금이 아니라 지급정지·환급 제도로 막기 어려움)
    test: /기프트 ?카드|상품권|핀 ?번호|구글 ?플레이 ?카드|기프티콘/,
    answer: () =>
      "기프트카드·상품권은 계좌로 보낸 돈이 아니라서 은행 지급정지나 피해금 환급 제도로 막기 어려워요. 핀번호는 바로 현금처럼 쓰일 수 있으니 서둘러 주세요. 1) 상품권을 산 곳이나 발행사 고객센터에 바로 연락해 보낸 핀번호가 이미 쓰였는지 확인하고, 아직 안 쓰였다면 사용을 막을 수 있는지 물어보세요. 2) 영수증, 카드 실물이나 사진, 상대에게 핀번호를 보낸 대화는 지우지 말고 보관하세요. 3) 112에 신고하면서 핀번호와 보낸 시각을 함께 알려 주세요. 4) 상대가 더 사서 보내라고 해도 절대 응하지 마세요.",
  },
  {
    // 상대가 돈을 더 보내라고 할 때 (추가 송금·수수료·보증금·환불 조건)
    test: /또 ?(보내|입금|송금)|더 ?(보내|입금)|추가.{0,4}(송금|입금|결제|돈|비용)|수수료|보증금|선입금|환불.{0,8}(하려면|조건|먼저)/,
    answer: () =>
      "더 보내지 마세요. 환불, 수수료, 보증금, 계좌 확인 등 어떤 이유를 대도 추가로 돈을 요구하는 건 피해를 키우는 전형적인 수법이에요. 그 대화는 지우지 말고 캡처해 두고, 상대 연락에는 응하지 말고 차단한 뒤, 신고할 때 함께 알려 주세요.",
  },
  {
    // 이미 신고한 뒤 "다음엔 뭘 해요?"
    test: /신고 ?(했|를 ?했|하고|완료|접수|해 ?놨|해 ?뒀)|접수 ?(했|완료)|신고 ?(후|다음|이후|하고 나서)/,
    answer: (s) => {
      if (has(s.cards, SECONDHAND))
        return "신고하셨군요, 잘하셨어요. 이제 이렇게 해 주세요. 1) 신고 접수번호와 담당 수사관 연락처를 메모해 두세요. 2) 판매 글·대화·송금 내역 캡처를 지우지 말고, 수사관이 요청하면 바로 낼 수 있게 모아 두세요. 3) 거래한 플랫폼(당근 등)에도 그 판매자를 신고해 추가 피해를 막아 주세요. 4) 돈을 돌려받는 건 수사 결과를 기다리면서, 재판이 열리면 배상명령을 신청하거나 따로 민사 절차(지급명령·소액소송)를 밟는 방법이 있어요. 그리고 '환불해 줄게', '수사 중이니 돈을 보내라' 같은 연락이 다시 오면 2차 사기일 수 있으니 응하지 마세요."
      if (s.facts?.transferredMoney === "YES")
        return "신고하셨군요, 잘하셨어요. 돈을 보낸 경우라면 다음이 중요해요. 1) 경찰서에서 '사건사고사실확인원'을 발급받으세요. 2) 지급정지를 요청한 금융회사에 피해구제 신청서와 함께 내세요. 지급정지 후 14일 안에 내지 않으면 지급정지가 풀릴 수 있어요. 3) 대화·통화·송금 기록은 지우지 말고 보관하고, 신고 접수번호를 메모해 두세요. '돈을 찾아 주겠다'는 연락은 2차 사기일 수 있으니 응하지 마세요."
      return "신고하셨군요, 잘하셨어요. 신고 접수번호를 메모하고, 대화·통화 기록은 지우지 말고 보관해 주세요. 수사관이 연락하면 그 기록을 제출하면 돼요. 같은 사람에게서 다시 연락이 오면 응하지 말고 차단해 주세요."
    },
  },
  {
    test: /환급|돌려받|돌려 받|환불|피해구제|돈.{0,6}(찾|돌려|회수|받을)/,
    answer: (s) => {
      const sent = s.facts?.transferredMoney === "YES"
      if (has(s.cards, SECONDHAND))
        return sent
          ? "중고거래처럼 물건이나 서비스를 주겠다고 속인 사기는 보이스피싱 피해금 환급 제도 대상이 아니에요. 송금한 금융회사에 피해 사실을 알리고 경찰에 사기 신고를 한 뒤, 수사와 민사 절차로 돌려받는 방법을 상담해 보세요. 그동안 판매 글, 대화, 송금 내역은 지우지 말고 보관해 주세요."
          : "중고거래 사기는 보이스피싱 피해금 환급 제도 대상이 아니에요. 아직 돈을 보내지 않으셨다면 추가 송금을 멈추는 게 가장 중요해요."
      if (sent)
        return "전화·문자·메신저로 속아서 보낸 경우라면 지급정지를 요청한 뒤 그 금융회사에 피해구제 신청서를 내면 환급 절차가 진행돼요. 다만 사기 계좌에 남은 잔액 범위에서 돌려받고, 피해자가 여럿이면 나눠 받아서 전액이 보장되지는 않아요. 지급정지가 빠를수록 남은 잔액이 많아요."
      return "아직 돈을 보내신 것으로 파악되지 않았어요. 보내셨다면 위 '돈을 보냈나요?' 항목을 '예'로 바꿔 주세요. 송금 대응 방법으로 바로 안내할게요."
    },
  },
  {
    test: /신고|경찰|어디(에|로|서)|누구한테|연락처|전화번호|기관/,
    answer: (s, d, inst) => {
      const codes = Array.from(new Set(s.cards.flatMap((c) => d[c.code]?.institutionCodes ?? c.institutionCodes ?? [])))
      const names = codes.map((code) => inst.find((i) => i.code === code)?.name ?? code)
      const base = names.length ? `지금 상황에서는 ${joinKo(names)}에 문의하시면 돼요. 아래 '관련 공식 기관'에서 바로 연결할 수 있어요.` : "아래 '관련 공식 기관'에서 연락처를 확인해 주세요."
      if (has(s.cards, SECONDHAND)) return `${base} 중고거래 사기는 경찰 사이버범죄 신고시스템에 온라인으로 접수한 뒤, 안내에 따라 경찰서를 방문해 조사를 받는 순서예요.`
      if (s.facts?.transferredMoney === "YES") return `${base} 돈을 보냈다면 신고보다 금융회사 지급정지 요청이 먼저예요.`
      return base
    },
  },
  {
    test: /앱|삭제|초기화|원격|바이러스|악성|해킹|폰|휴대폰/,
    answer: (s, d) => {
      const a = actionsOf("MALICIOUS_APP_RESPONSE", d)
      if (has(s.cards, "MALICIOUS_APP_RESPONSE") && a.length) return `앱을 설치하셨다면 이렇게 해 주세요. ${a.join(" ")}`
      return "앱을 설치하지 않으신 것으로 파악했어요. 상대가 알려 준 앱을 설치했다면 위 '앱을 설치했나요?'를 '예'로 바꿔 주세요. 설치했다면 그 휴대폰으로는 금융 앱을 쓰지 않는 게 가장 중요해요."
    },
  },
  {
    test: /비밀번호|신분증|개인정보|인증번호|명의|주민|계좌번호|카드번호/,
    answer: (s, d) => {
      const a = actionsOf("PERSONAL_INFO_RESPONSE", d)
      const tail = " 신분증이나 계좌 정보가 넘어갔다면 금융감독원 개인정보노출자 사고예방시스템 등록과 명의도용 대출을 막는 안심차단 신청도 함께 해 두세요."
      if (has(s.cards, "PERSONAL_INFO_RESPONSE") && a.length) return `${a.join(" ")}${tail}`
      return `개인정보를 알려 주지 않으신 것으로 파악했어요. 알려 주셨다면 위 '정보를 알려 줬나요?'를 '예'로 바꿔 주세요.${tail}`
    },
  },
  {
    test: /증거|캡처|캡쳐|보관|준비|서류|자료/,
    answer: (s, d) => {
      const materials = s.cards.flatMap((c) => toTextItems(d[c.code]?.requiredMaterials).map((m) => m.body))
      const base = has(s.cards, SECONDHAND) ? "판매 글, 대화 내용, 상대 계좌번호, 송금 내역과 상대 정보를 화면으로 저장해 두세요." : "상대와 나눈 문자·메신저 대화, 통화 기록, 송금 내역을 지우지 말고 캡처해 두세요."
      return materials.length ? `${base} 신고할 때 준비할 것: ${joinKo(materials)}.` : `${base} 신고와 피해 확인 때 필요해요.`
    },
  },
  {
    test: /먼저|뭐부터|무엇부터|뭘|뭐 ?(하|해)|뭐를|무엇을|어떻게|어떡|해야|하면 ?돼|하면 ?되|할 ?일|다음|이제|방법/,
    answer: (s, d) => planFor(s, d),
  },
]

/** 글로 물었을 때 의도에 맞는 답. 맞는 의도가 없으면 지금 가장 위 조치를 안내 */
export function answerQuestion(text: string, s: SolutionView, d: Details, inst: Institution[]): string {
  const hit = INTENTS.find((i) => i.test.test(text))
  if (hit) return hit.answer(s, d, inst)
  return `그 질문은 제가 가진 공식 자료로는 정확히 답하기 어려워요. 정확한 답은 아래 공식 기관 상담이 가장 확실해요. ${planFor(s, d)}`
}

export type ReplyInput = {
  kind: "start" | "choice" | "text" | "correct"
  prev: SolutionView
  next: SolutionView
  details: Details
  institutions: Institution[]
  userText?: string
  /** 서버가 주는 AI 근거 설명 (AI-07 연결 후). 있으면 우선 보여 줘요 */
  explanation?: string | null
  /** 선택지로 답한 항목 (값이 그대로여도 대답했다는 걸 알려 주려고) */
  answered?: { factKey: FactKey; value: YesNoUnknown }
  /** 사기 유형 카드로 시작해 고정 안내를 보여 주는 중이면 true (서버 카드 변화는 말하지 않아요) */
  fixedGuide?: boolean
}

/**
 * 다음 질문에 "아뇨", "네 깔았어요", "모르겠어요"처럼 짧게 글로 답한 경우 선택지 값으로 바꿔요.
 * 짧은 답(20자 이하)만 해당하고, 질문이나 긴 설명은 null을 돌려줘서 글 그대로 보내요.
 */
export function parseShortAnswer(text: string): YesNoUnknown | null {
  const t = text.trim().replace(/[.!~?…\s]+$/g, "")
  // "신고했어요", "이제 뭐 해요"처럼 내용이 있는 말은 짧아도 답변(예/아니오)으로 보지 않아요
  if (INTENTS.some((i) => i.test.test(t))) return null
  if (!t || t.length > 20 || /\?|어떻게|뭐|어디|왜|언제|할까|되나|돼요\?/.test(text)) return null
  if (/(모르|몰라|글쎄|기억이 ?안|확실하지)/.test(t)) return "UNKNOWN"
  if (/^(아니|아뇨|아녀|ㄴㄴ|노|no\b)|안 ?(했|깔|보냈|알려|줬|설치)|없어요|없었|않았/i.test(t)) return "NO"
  if (/^(네|예|응|어|ㅇㅇ|맞|그래|yes\b)|했어|깔았|보냈|알려 ?줬|설치했|있어요|있었/i.test(t)) return "YES"
  return null
}

const SECONDHAND_NOTE = "중고거래 사기는 보이스피싱과 달리 통신사기피해환급법의 지급정지·환급 대상이 아니에요. 그래서 112나 경찰 사이버범죄 신고시스템으로 신고하는 게 중심이고, 돈을 돌려받는 건 배상명령이나 민사 절차로 진행해요."

/** 도우미가 할 말 한 덩어리 */
export function composeReply({ kind, prev, next, details, institutions, userText, explanation, answered, fixedGuide }: ReplyInput): string {
  const change = describeChange(prev, next, details, fixedGuide)
  const parts: string[] = []
  if (kind === "start") {
    // 짧게: 무엇을 준비했는지 + 가장 먼저 할 일 하나. ("돈을 보내셨군요" 같은 사실 되풀이는 아래 체크리스트가 대신해요)
    const titles = next.cards.map((c) => `'${titleOf(c, details)}'`)
    if (!titles.length) parts.push("상황을 정리했어요. 아직 피해 사실이 분명하지 않아 기본 대응 원칙부터 안내할게요.")
    else {
      parts.push(`상황을 정리했어요. 위 ${joinKo(titles)} 대응 방법을 확인해 주세요.`)
      const first = next.cards.find((c) => isUrgent(c, details)) ?? next.cards[0]
      const step = toTextItems(details[first.code]?.actions)[0]
      if (step?.title) parts.push(`가장 먼저 '${step.title}'부터 해 주세요.`)
    }
  } else if (kind === "text") {
    if (change.length) parts.push("알겠어요.", ...change)
    // 질문이 섞여 있거나 바뀐 게 없으면 질문에 답해요
    if (userText && !change.length && parseShortAnswer(userText)) {
      // 남은 질문이 없는데 "네", "아니요"처럼 짧게만 답한 경우
      parts.push("알겠어요. 지금은 더 여쭤볼 질문이 없어요. 상황이 달라졌다면 채팅으로 알려 주시거나(예: \"사실 돈은 안 보냈어요\"), 궁금한 점을 물어봐 주세요. 예: \"돈 돌려받을 수 있어요?\", \"신고는 어디에 해요?\"")
    } else if (userText && (!change.length || /\?|까|나요|돼|되나|어떻게|뭐|어디|언제|왜/.test(userText))) parts.push(answerQuestion(userText, next, details, institutions))
  } else {
    const factChanged = !!next.facts && FACT_ORDER.some((k) => prev.facts?.[k] !== next.facts![k])
    if (answered && !factChanged) {
      parts.push(answered.value === "UNKNOWN" ? `알겠어요. ${FACT_PHRASE[answered.factKey].UNKNOWN}으로 둘게요. 나중에 확인되면 채팅으로 알려 주세요.` : "확인했어요.")
    }
    parts.push(...(change.length ? change : answered ? ["지금 안내된 대응은 그대로예요."] : ["확인했어요. 지금 안내된 대응은 그대로예요."]))
  }
  // 선택·정정 뒤에도 같은 질문이 남아 있으면 다시 보여 줘서, 다음에 "네/아니요"로 답할 때 무엇에 답하는지 알 수 있게 해요
  // 중고거래 + 송금이 새로 확인되면, 지급정지가 안 될 수 있다는 점을 한 번 알려요
  const secondhandPaid = (v: SolutionView) => has(v.cards, SECONDHAND) && v.facts?.transferredMoney === "YES"
  if (!fixedGuide && secondhandPaid(next) && !secondhandPaid(prev) && !parts.some((p) => p.includes("환급"))) {
    const i = parts.findIndex((p) => p.startsWith("이어서") || p.startsWith("여쭤볼 건"))
    const note = kind === "start" ? "중고거래는 지급정지 대상이 아니라 경찰 신고가 먼저예요." : SECONDHAND_NOTE
    if (i >= 0) parts.splice(i, 0, note); else parts.push(note)
  }
  if (explanation?.trim()) parts.push(explanation.trim())
  return parts.join(" ")
}

/** 체크리스트(있었던 일 모두 고르기)에 쓰는 이름. 화면 버튼과 내 말풍선에 같이 써요 */
export const CHECK_LABEL: Record<FactKey, string> = {
  transferredMoney: "돈을 보냈어요",
  sharedInformation: "개인정보·인증번호를 알려 줬어요",
  installedApp: "앱을 설치했어요",
  contactContinues: "아직 연락하고 있어요",
}
export const CHECK_ORDER = FACT_ORDER

/**
 * 체크리스트를 보낸 뒤의 답: 고른 일마다 '지금 바로 할 일' 한 문장 + 대응 카드가 바뀌었으면 한 줄.
 * ("돈을 보내셨군요"처럼 따라 말하지 않고 다음 행동을 말해요)
 */
export function checklistReply(prev: SolutionView, next: SolutionView, d: Details): string {
  const yes = (k: FactKey) => next.facts?.[k] === "YES"
  const steps: string[] = []
  if (yes("transferredMoney")) {
    steps.push(has(next.cards, SECONDHAND)
      ? "대화·송금 내역을 저장하고 경찰 사이버범죄 신고시스템에 신고하기 (중고거래는 지급정지 대상이 아니에요)"
      : "112나 돈을 보낸 금융회사에 바로 지급정지 요청하기")
  }
  if (yes("sharedInformation")) steps.push("개인정보노출자 사고예방시스템에 등록하고 금융 비밀번호 바꾸기")
  if (yes("installedApp")) steps.push("다른 전화로 신고하고, 설치한 앱 지우기 또는 휴대폰 초기화하기")
  if (yes("contactContinues")) steps.push("상대가 무엇을 더 요구해도 응하지 말고 연락 끊기")
  const added = next.cards.some((c) => !has(prev.cards, c.code))
  const lead = steps.length
    ? `지금 할 일을 순서대로 정리했어요.${added ? " 위 대응 방법도 맞춰 바꿨어요." : ""}`
    : "다행이에요. 지금은 이렇게만 해 두세요."
  if (!steps.length) steps.push("상대와 더 연락하지 않기", "대화 화면 저장해 두기")
  // 화면에서 번호 목록으로 보이게 줄바꿈 + "1. " 형식으로 돌려줘요
  return [lead, ...steps.map((t, i) => `${i + 1}. ${t}`)].join("\n")
}
