import { useEffect, useMemo, useRef, useState } from "react"

type Page = "home" | "simulation" | "emergency" | "emergencyChat" | "report" | "login" | "signup" | "mypage"
type SimStage = "input" | "loading" | "summary" | "chat" | "complete"
type EmergencyKey = "transfer" | "link" | "app" | "privacy" | "call" | "trade" | "custom"
type IconName = "shield" | "chat" | "bell" | "spark" | "building" | "send" | "link" | "phone" | "user" | "app" | "check" | "lock" | "search" | "arrow" | "download" | "refresh" | "alert" | "close" | "cart" | "image"
type SituationKey = "trade" | "delivery" | "loan" | "job" | "institution"
type AssistantMessage = {
  from: "assistant" | "user"
  text: string
  images?: UploadedImage[]
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
  images?: UploadedImage[]
  imageCount?: number // 새로고침 후 복구된 메시지: 사진 원본은 저장하지 않고 장수만 남깁니다.
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
  id: string
}
type DemoAccount = { name: string; email: string; gender: string; salt: string; passwordHash: string; verified: boolean }
type SavedReport = { id: string; title: string; type: string; date: string; analysis: ConversationAnalysis }
type SavedConversation = { id: string; title: string; date: string; messages: { from: "assistant" | "user"; text: string; imageCount?: number }[] }
type SimProgress = {
  version: 1
  updatedAt: number
  simStage: SimStage
  simMode: SimulationMode
  everydayCategory: EverydayCategory | null
  scenarioOptions: Scenario[]
  context: string
  scenario: Scenario
  chatMessages: SimulationMessage[]
  contextImageCount: number
}
const ACCOUNT_KEY = "wsid-demo-accounts-v1"
const SESSION_KEY = "wsid-demo-session-v1"
function readStore<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback } catch { return fallback } }
function formatDate() { return new Date().toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" }) }
async function hashDemoPassword(password: string, salt: string) {
  const bytes = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, "0")).join("")
}
// 민감정보 감지·가림 (프런트 데모용 규칙)
const isPhoneNumber = (value: string) => /^01[016789][-\s]?\d{3,4}[-\s]?\d{4}$/.test(value.trim())
const SECRET_PATTERN = /(비밀번호|인증번호|보안카드|OTP|otp|PIN|pin)(.{0,12}?)(\d{4,})/g
const RRN_PATTERN = /\d{6}\s?-\s?[1-4]\d{6}/g
const CARD_PATTERN = /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g
const ACCOUNT_PATTERN = /\d{2,6}-\d{2,6}-\d{2,7}/g
function detectSensitive(text: string, includeAccount: boolean): string[] {
  const found: string[] = []
  if (new RegExp(RRN_PATTERN.source).test(text)) found.push("주민등록번호")
  if (new RegExp(CARD_PATTERN.source).test(text)) found.push("카드번호")
  if (new RegExp(SECRET_PATTERN.source).test(text)) found.push("비밀번호·인증번호")
  if (includeAccount) {
    const rest = text.replace(RRN_PATTERN, "").replace(CARD_PATTERN, "")
    const accounts = rest.match(new RegExp(ACCOUNT_PATTERN.source, "g")) ?? []
    if (accounts.some((value) => !isPhoneNumber(value)) || /계좌.{0,8}\d{10,14}/.test(rest)) found.push("계좌번호")
  }
  return found
}
// 피해 대응에서는 본인 민감정보만 가립니다. 상대방 계좌·전화번호는 신고 이력 조회에 쓰이므로 남겨 둡니다.
function maskSensitive(text: string) {
  return text
    .replace(RRN_PATTERN, "[주민등록번호 가림]")
    .replace(CARD_PATTERN, "[카드번호 가림]")
    .replace(SECRET_PATTERN, (_m, key: string, mid: string, digits: string) => `${key}${mid}${"*".repeat(digits.length)}`)
}

function ConfirmModal({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel }: {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onCancel])
  const buttonBase: React.CSSProperties = {
    flex: 1,
    height: 48,
    padding: "0 16px",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1,
    whiteSpace: "nowrap",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  }
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", display: "grid", placeItems: "center", zIndex: 1000, padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 20, padding: "28px 24px 24px", width: "100%", maxWidth: 360, textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}
      >
        <h2 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 800, color: "#0f172a", lineHeight: 1.4 }}>{title}</h2>
        <p style={{ margin: "0 0 24px", fontSize: 15, lineHeight: 1.6, color: "#475569", wordBreak: "keep-all" }}>{message}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ ...buttonBase, background: "#fff", color: "#334155", border: "1px solid #cbd5e1" }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            style={{ ...buttonBase, background: "#1d6fe0", color: "#fff", border: "none" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

const MAX_EVIDENCE_IMAGES = 12
const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]

type ImageLimits = { max: number; maxBytes: number; types: string[]; ext: RegExp; typeLabel: string; sizeLabel: string }
// 긴급 대응: 최대 12장, 장당 10MB, JPG·PNG·WEBP
const EMERGENCY_IMAGE_LIMITS: ImageLimits = { max: MAX_EVIDENCE_IMAGES, maxBytes: MAX_EVIDENCE_BYTES, types: IMAGE_TYPES, ext: /\.(jpe?g|png|webp)$/i, typeLabel: "JPG, PNG, WEBP", sizeLabel: "10MB" }
// 시뮬레이션(요구사항 명세): 훈련 한 번에 최대 3장, 장당 5MB, PNG·JPEG
const SIM_IMAGE_LIMITS: ImageLimits = { max: 3, maxBytes: 5 * 1024 * 1024, types: ["image/jpeg", "image/png"], ext: /\.(jpe?g|png)$/i, typeLabel: "PNG, JPEG", sizeLabel: "5MB" }
const SIM_IMAGE_ACCEPT = ".png,.jpg,.jpeg,image/png,image/jpeg"

async function loadEvidence(files: File[], existing: number, limits: ImageLimits = EMERGENCY_IMAGE_LIMITS): Promise<{ images: UploadedImage[], error: string }> {
  const available = Math.max(0, limits.max - existing)
  const selected = files.slice(0, available)
  const images: UploadedImage[] = []
  const errors: string[] = []
  if (files.length > available) errors.push(`사진은 최대 ${limits.max}장까지 첨부할 수 있어요.`)
  for (const file of selected) {
    if (!limits.types.includes(file.type) && !limits.ext.test(file.name)) {
      errors.push(`${file.name}: ${limits.typeLabel} 파일만 첨부할 수 있어요.`)
      continue
    }
    if (file.size > limits.maxBytes) {
      errors.push(`${file.name}: 사진 한 장은 ${limits.sizeLabel} 이하여야 해요.`)
      continue
    }
    try {
      const preview = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject()
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      images.push({ id: crypto.randomUUID(), name: file.name, preview })
    } catch {
      errors.push(`${file.name}: 사진을 불러오지 못했어요.`)
    }
  }
  return { images, error: errors.join(" ") }
}

// 시뮬레이션 진행 상태 저장(이어하기). 계정별로 이 브라우저에만 저장하며, 사진 원본은 저장하지 않습니다.
const SIM_PROGRESS_TTL = 24 * 60 * 60 * 1000 // 명세 초안: 무활동 24시간 후 만료
const simProgressKey = (email: string) => `wsid-sim-progress-${email}`
function readSimProgress(email: string): SimProgress | null {
  const saved = readStore<SimProgress | null>(simProgressKey(email), null)
  if (!saved || saved.version !== 1 || Date.now() - saved.updatedAt > SIM_PROGRESS_TTL) {
    try { localStorage.removeItem(simProgressKey(email)) } catch { /* 저장소 접근 불가 시 무시 */ }
    return null
  }
  return saved
}
function removeSimProgress(email: string) {
  try { localStorage.removeItem(simProgressKey(email)) } catch { /* 무시 */ }
}
const countImages = (messages: SimulationMessage[]) =>
  messages.reduce((sum, m) => sum + (m.images?.length ?? m.imageCount ?? 0), 0)

function EvidenceGallery({ images, onRemove, onAdd, max = MAX_EVIDENCE_IMAGES }: {
  images: UploadedImage[]
  max?: number
  onRemove?: (id: string) => void
  onAdd?: () => void
}) {
  const [selected, setSelected] = useState<UploadedImage | null>(null)
  useEffect(() => {
    if (!selected) return
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selected])
  return <>
    {images.length > 0 && <div className="evidence-gallery" aria-label="첨부한 사진 목록">
      {images.map((item, index) => <div className="evidence-tile" key={item.id}>
        <button className="evidence-thumb" type="button" title={`${item.name} 크게 보기`} aria-label={`${index + 1}번째 사진 크게 보기`} onClick={() => setSelected(item)}>
          <img src={item.preview} alt={`${index + 1}번째 첨부 사진: ${item.name}`} />
        </button>
        {onRemove && <button className="evidence-remove" type="button" aria-label={`${item.name} 삭제`} title="사진 삭제" onClick={() => onRemove(item.id)}>×</button>}
      </div>)}
      {onAdd && images.length < max && <button className="evidence-add" type="button" onClick={onAdd} aria-label="사진 더 추가하기"><span>＋</span><small>사진 추가</small></button>}
    </div>}
    {selected && <div className="evidence-lightbox" role="dialog" aria-modal="true" aria-label="사진 확대 보기" onClick={() => setSelected(null)}>
      <button type="button" className="lightbox-close" onClick={() => setSelected(null)} aria-label="확대 보기 닫기">×</button>
      <img src={selected.preview} alt={selected.name} onClick={(event) => event.stopPropagation()} />
      <span className="lightbox-caption">{selected.name}</span>
    </div>}
  </>
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

type SimulationMode = "choose" | "mine" | "discover"
type EverydayCategory = "shopping" | "job" | "finance" | "housing" | "travel" | "social"
const everydayCategories: { key: EverydayCategory; title: string; description: string; icon: IconName }[] = [
  { key: "shopping", title: "쇼핑·택배", description: "주문, 배송, 환불", icon: "cart" },
  { key: "job", title: "취업·아르바이트", description: "채용 연락, 급여, 부업", icon: "user" },
  { key: "finance", title: "금융·은행", description: "대출, 카드, 계좌", icon: "building" },
  { key: "housing", title: "부동산·계약", description: "월세, 보증금, 계약", icon: "shield" },
  { key: "travel", title: "여행·숙박", description: "예약, 항공권, 숙소", icon: "bell" },
  { key: "social", title: "지인·SNS", description: "메신저, 계정, 지인 연락", icon: "chat" },
]
// 검증된 교육용 유형을 바탕으로 한 3개 후보. 백엔드 AI 연결 전에는 규칙 기반으로 구성합니다.
const everydayTemplates: Record<EverydayCategory, { title: string; description: string; opening: string; subject: string }[]> = {
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
function categoryFromContext(text: string): EverydayCategory {
  if (/취업|구직|면접|알바|채용|직장/.test(text)) return "job"
  if (/대출|은행|카드|금리|계좌/.test(text)) return "finance"
  if (/전세|월세|집|부동산|계약|이사/.test(text)) return "housing"
  if (/여행|숙소|호텔|항공|비행|예약/.test(text)) return "travel"
  if (/지인|친구|SNS|인스타|카톡|메신저/.test(text)) return "social"
  return "shopping"
}
function createEverydayOptions(category: EverydayCategory, personalContext: string): Scenario[] {
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
function createInterviewOptions(context: string): Scenario[] {
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

// 입력한 설명에서 해당하는 상황을 모두 찾습니다. 순서가 곧 우선순위입니다(송금이 가장 급함).
const emergencyRules: [EmergencyKey, RegExp, RegExp?][] = [
  ["transfer", /송금|이체|(돈|계좌).{0,25}보냈|입금했|입금을 했/, /(송금|이체|입금).{0,4}(안|않)/],
  ["privacy", /개인정보|신분증|비밀번호|인증번호|주민등록|OTP|보안카드|가림\]/i, /(알려|보내|입력|제공).{0,4}(안|않)/],
  ["app", /앱.{0,6}(설치|깔)|설치했|설치를 했|apk|원격.{0,4}(앱|프로그램)/i, /설치.{0,4}(안|않)/],
  ["link", /링크|url|주소.{0,4}(눌|클릭|접속)|눌렀|클릭했/i, /(누르|눌|클릭).{0,4}(안|않)/],
  ["call", /전화|사칭|검찰|경찰|은행 직원|금감원|수사관/],
  ["trade", /중고|판매자|물품|당근|번개장터|중고나라|직거래/],
]
function detectEmergencyKeys(text: string): EmergencyKey[] {
  const keys = emergencyRules
    .filter(([, match, negated]) => match.test(text) && !(negated && negated.test(text) && !match.test(text.replace(negated, ""))))
    .map(([key]) => key)
  return keys.length ? keys : ["custom"]
}
function mergeEmergencyKeys(current: EmergencyKey[], added: EmergencyKey[]): EmergencyKey[] {
  const base = current.filter((key) => key !== "custom")
  const next = [...base, ...added.filter((key) => key !== "custom" && !base.includes(key))]
  return next.length ? next : current
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
      <img className="logo-wordmark" src="/logo-wordmark.png" alt="어떡하지" />
    </button>
  )
}

export default function App() {
  const initialPage: Page =
    window.location.pathname === "/login" ? "login" : window.location.pathname === "/signup" ? "signup" : window.location.pathname === "/mypage" ? "mypage" : window.location.pathname === "/emergency/chat"
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
  const [account, setAccount] = useState<DemoAccount | null>(() => {
    try { const email = sessionStorage.getItem(SESSION_KEY); return readStore<DemoAccount[]>(ACCOUNT_KEY, []).find(a => a.email === email && a.verified) || null } catch { return null }
  })
  const [returnAfterLogin, setReturnAfterLogin] = useState<Page>("mypage")
  const [savedReports, setSavedReports] = useState<SavedReport[]>([])
  const [savedChats, setSavedChats] = useState<SavedConversation[]>([])
  const [saveNotice, setSaveNotice] = useState("")
  useEffect(() => {
    setSavedReports(account ? readStore<SavedReport[]>(`wsid-reports-${account.email}`, []) : [])
    setSavedChats(account ? readStore<SavedConversation[]>(`wsid-conversations-${account.email}`, []) : [])
  }, [account])
  const requireLogin = (destination: Page) => { if (!account) { setReturnAfterLogin(destination); go("login"); return false } return true }
  const saveReport = () => {
    if (!requireLogin("report")) return
    if (!account) return
    const item: SavedReport = { id: crypto.randomUUID(), title: scenario.title, type: "금융사기 시뮬레이션", date: formatDate(), analysis }
    const next = [item, ...savedReports.filter(r => !(r.title === item.title && r.analysis.score === item.analysis.score && r.date === item.date))]
    setSavedReports(next); localStorage.setItem(`wsid-reports-${account.email}`, JSON.stringify(next)); setSaveNotice("리포트를 마이페이지에 저장했어요.")
  }
  const saveEmergencyChat = () => {
    if (!requireLogin("emergencyChat")) return
    if (!account || !emergencyMessages.length) return
    const item: SavedConversation = { id: crypto.randomUUID(), title: emergencyKeys.length ? emergencyKeys.map((key) => emergencyData[key].title).join(" · ") : "긴급 대응 대화", date: formatDate(), messages: emergencyMessages.map(m => ({ from: m.from, text: m.text, imageCount: m.images?.length || 0 })) }
    const next = [item, ...savedChats]; setSavedChats(next)
    try { localStorage.setItem(`wsid-conversations-${account.email}`, JSON.stringify(next)); setSaveNotice("긴급대응 대화를 저장했어요. 사진 원본은 저장하지 않아요.") }
    catch { setSavedChats(savedChats); setSaveNotice("저장 공간이 부족해 저장하지 못했어요.") }
  }
  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    clearSimulation(false) // 화면에서는 지우되, 다시 로그인하면 이어서 할 수 있게 저장 기록은 남깁니다.
    hydratedFor.current = null
    setAccount(null)
    setSaveNotice("")
    go("home")
  }
  const [loginPopup, setLoginPopup] = useState(false)
  // fresh=true: 홈의 시작 버튼처럼 새 훈련을 시작합니다. false: 진행 중인 훈련이 있으면 그대로 이어서 보여줍니다.
  const openSimulation = (fresh = false) => {
    if (!account) {
      setReturnAfterLogin("simulation")
      setLoginPopup(true)
      return
    }
    if (fresh) clearSimulation()
    go("simulation")
  }
  const closeLoginPopup = () => {
    setLoginPopup(false)
    setReturnAfterLogin("mypage")
  }
  const goLoginFromPopup = () => {
    setLoginPopup(false)
    go("login")
  }
  const [simStage, setSimStage] = useState<SimStage>("input")
  const [simMode, setSimMode] = useState<SimulationMode>("choose")
  const [everydayCategory, setEverydayCategory] = useState<EverydayCategory | null>(null)
  const [scenarioOptions, setScenarioOptions] = useState<Scenario[]>([])
  const [context, setContext] = useState("")
  const [selectedSituation, setSelectedSituation] =
    useState<SituationKey | null>(null)
  const [scenario, setScenario] = useState<Scenario>(scenarios.delivery)
  const [chatTyping, setChatTyping] = useState(false)
  const [chatMessages, setChatMessages] = useState<SimulationMessage[]>([])
  const [emergency, setEmergency] = useState<EmergencyKey | null>(null)
  const [emergencyKeys, setEmergencyKeys] = useState<EmergencyKey[]>([])
  const [endConfirm, setEndConfirm] = useState(false)
  const simRun = useRef(0)
  const [contextImages, setContextImages] = useState<UploadedImage[]>([]) // 처음 상황 설명에 첨부한 사진(메모리에만 보관)
  const [restoredContextImageCount, setRestoredContextImageCount] = useState(0)
  const hydratedFor = useRef<string | null>(null) // 어느 계정의 진행 상태를 불러왔는지
  const [emergencyText, setEmergencyText] = useState("")
  const [emergencyImages, setEmergencyImages] = useState<UploadedImage[]>([])
  const [emergencyAnalyzing, setEmergencyAnalyzing] = useState(false)
  const [submittedText, setSubmittedText] = useState("")
  const [emergencyMessages, setEmergencyMessages] =
    useState<AssistantMessage[]>([])
  const [emergencyTyping, setEmergencyTyping] = useState(false)

  // 로그인한 계정의 진행 중 훈련을 불러옵니다(새로고침·재방문 시 복구).
  useEffect(() => {
    if (!account) return
    if (hydratedFor.current === account.email) return
    hydratedFor.current = account.email
    const saved = readSimProgress(account.email)
    if (!saved) return
    const stage: SimStage = saved.simStage === "loading" ? "input" : saved.simStage
    let messages = saved.chatMessages
    const userTurns = messages.filter((m) => m.from === "user").length
    // 상대 답변을 기다리던 중 새로고침했다면 답변을 이어서 붙여 줍니다.
    if (stage === "chat" && messages.length && messages[messages.length - 1].from === "user")
      messages = [...messages, { from: "contact", text: createDemoReply(messages[messages.length - 1].text, userTurns - 1, saved.scenario) }]
    simRun.current += 1
    setSimStage(stage === "chat" && userTurns >= 5 ? "complete" : stage)
    setSimMode(saved.simMode)
    setEverydayCategory(saved.everydayCategory)
    setScenarioOptions(saved.scenarioOptions)
    setContext(saved.context)
    setScenario(saved.scenario)
    setChatMessages(messages)
    setChatTyping(false)
    setContextImages([])
    setRestoredContextImageCount(saved.contextImageCount)
  }, [account])
  // 진행 중인 훈련(상황 선택·대화·완료)을 바뀔 때마다 저장합니다. 사진은 장수만 남깁니다.
  useEffect(() => {
    if (!account || hydratedFor.current !== account.email) return
    if (simStage !== "summary" && simStage !== "chat" && simStage !== "complete") return
    const progress: SimProgress = {
      version: 1,
      updatedAt: Date.now(),
      simStage,
      simMode,
      everydayCategory,
      scenarioOptions,
      context,
      scenario,
      chatMessages: chatMessages.map((m) => ({ from: m.from, text: m.text, imageCount: (m.images?.length ?? m.imageCount ?? 0) || undefined })),
      contextImageCount: contextImages.length + restoredContextImageCount,
    }
    try { localStorage.setItem(simProgressKey(account.email), JSON.stringify(progress)) } catch { /* 저장 공간 부족 시 이어하기만 생략 */ }
  }, [account, simStage, simMode, everydayCategory, scenarioOptions, context, scenario, chatMessages, contextImages, restoredContextImageCount])

  const go = (next: Page) => {
    setPage(next)
    setMobileMenu(false)
    const paths: Record<Page, string> = {
      home: "/",
      simulation: "/simulation",
      emergency: "/emergency",
      emergencyChat: "/emergency/chat",
      report: "/report",
      login: "/login",
      signup: "/signup",
      mypage: "/mypage",
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
  // removeSaved=false는 로그아웃처럼 화면 상태만 비우고 저장된 이어하기 기록은 남길 때 씁니다.
  const clearSimulation = (removeSaved = true) => {
    simRun.current += 1 // 진행 중이던 답변 타이머가 초기화 이후에 끼어들지 않도록 합니다.
    setSimStage("input")
    setSimMode("choose")
    setEverydayCategory(null)
    setScenarioOptions([])
    setContext("")
    setSelectedSituation(null)
    setChatMessages([])
    setChatTyping(false)
    setContextImages([])
    setRestoredContextImageCount(0)
    if (removeSaved && account) removeSimProgress(account.email)
  }
  const usedSimImages = contextImages.length + restoredContextImageCount + countImages(chatMessages)
  const savedProgress = account && page === "home" ? readSimProgress(account.email) : null
  const resumeInfo = savedProgress
    ? {
        title: savedProgress.simStage === "summary" ? "추천받은 상황 선택 중" : savedProgress.scenario.title,
        label:
          savedProgress.simStage === "complete"
            ? "훈련 완료 · 결과 리포트 확인 전"
            : savedProgress.simStage === "chat"
              ? `대화 진행 중 · ${savedProgress.chatMessages.filter((m) => m.from === "user").length}/5턴`
              : "상황 선택 단계",
        time: new Date(savedProgress.updatedAt).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" }),
      }
    : null
  const resetSimulation = () => {
    clearSimulation()
    go("simulation")
  }
  const confirmEndSimulation = () => {
    setEndConfirm(false)
    clearSimulation()
    go("home")
  }
  const createScenario = (interviewContext?: string, images: UploadedImage[] = []) => {
    const effectiveContext = interviewContext ?? context
    if (interviewContext !== undefined) setContextImages(images)
    if (simMode === "mine" && !effectiveContext.trim()) return
    if (simMode === "discover" && !everydayCategory) return
    setSimStage("loading")
    const category = simMode === "discover" ? everydayCategory! : categoryFromContext(effectiveContext)
    if (interviewContext !== undefined) setContext(interviewContext)
    const options = simMode === "mine" ? createInterviewOptions(effectiveContext) : createEverydayOptions(category, "")
    window.setTimeout(() => {
      setScenarioOptions(options)
      setScenario(options[0])
      setSimStage("summary")
    }, 450)
  }
  const startChat = (chosen?: Scenario) => {
    const active = chosen ?? scenario
    setScenario(active)
    setChatMessages([])
    setChatTyping(true)
    setSimStage("chat")
    const run = ++simRun.current
    window.setTimeout(() => {
      if (run !== simRun.current) return
      setChatMessages([{ from: "contact", text: active.opening }])
      setChatTyping(false)
    }, 550)
  }
  // 반환값: 전송을 막은 이유(없으면 빈 문자열)
  const sendSimulationMessage = (rawMessage: string, images: UploadedImage[] = []): string => {
    const message = rawMessage.trim().slice(0, 500)
    if ((!message && !images.length) || simStage !== "chat" || chatTyping) return ""
    const sensitive = detectSensitive(message, true)
    if (sensitive.length)
      return `${sensitive.join(", ")}로 보이는 내용이 있어요. 해당 부분을 지운 뒤 다시 입력해 주세요. 시뮬레이션에서도 실제 정보는 입력하지 마세요.`
    if (usedSimImages + images.length > SIM_IMAGE_LIMITS.max)
      return `사진은 훈련 한 번에 최대 ${SIM_IMAGE_LIMITS.max}장까지 보낼 수 있어요.`
    const userTurns = chatMessages.filter((item) => item.from === "user").length
    setChatMessages((items) => [...items, { from: "user", text: message, images: images.length ? images : undefined }])
    setChatTyping(true)
    const run = simRun.current
    window.setTimeout(() => {
      if (run !== simRun.current) return
      const reply = message
        ? createDemoReply(message, userTurns, scenario)
        : `보내주신 사진을 확인했다며, ${scenario.subject} 처리를 위해 지금 이 대화에서 바로 진행하자고 재촉합니다.`
      setChatMessages((items) => [...items, { from: "contact", text: reply }])
      setChatTyping(false)
      if (hasSafeEnding(message) || userTurns + 1 >= 5) setSimStage("complete")
    }, 700)
    return ""
  }
  const MASK_NOTICE = "입력하신 내용 중 주민등록번호·카드번호·비밀번호 같은 민감정보는 가려서 처리했어요."
  const openEmergencyChat = (
    keys: EmergencyKey[],
    text = "",
    attachments: UploadedImage[] = [],
    masked = false,
  ) => {
    setEmergency(keys[0])
    setEmergencyKeys(keys)
    setSubmittedText(text)
    setEmergencyImages(attachments)
    const intro =
      keys.length > 1
        ? `여러 상황이 함께 확인됐어요: ${keys.map((key) => emergencyData[key].title).join(", ")}. 가장 급한 조치부터 순서대로 안내할게요.`
        : emergencyData[keys[0]].intro
    setEmergencyMessages([
      ...(text || attachments.length ? [{ from: "user" as const, text, images: attachments }] : []),
      { from: "assistant", text: masked ? `${MASK_NOTICE} ${intro}` : intro },
    ])
    go("emergencyChat")
  }
  const analyzeEmergency = () => {
    const raw = emergencyText.trim()
    if (!raw && emergencyImages.length === 0) return
    const value = maskSensitive(raw)
    const masked = value !== raw
    if (masked) setEmergencyText(value) // 원문이 화면 상태에 남지 않도록 가린 내용으로 바꿉니다.
    setEmergencyAnalyzing(true)
    const keys = detectEmergencyKeys(value)
    window.setTimeout(() => {
      setEmergencyAnalyzing(false)
      openEmergencyChat(keys, value, emergencyImages, masked)
    }, 750)
  }
  const sendEmergencyMessage = (message: string, images: UploadedImage[] = []) => {
    if ((!message.trim() && !images.length) || emergencyTyping || !emergency) return
    const raw = message.trim()
    const value = maskSensitive(raw)
    const masked = value !== raw
    const found = value ? detectEmergencyKeys(value).filter((key) => key !== "custom") : []
    const addedKeys = found.filter((key) => !emergencyKeys.includes(key))
    if (addedKeys.length) {
      const next = mergeEmergencyKeys(emergencyKeys, addedKeys)
      setEmergencyKeys(next)
      setEmergency(next[0])
    }
    setEmergencyMessages((items) => [...items, { from: "user", text: value, images }])
    if (images.length) setEmergencyImages((items) => [...items, ...images])
    setEmergencyTyping(true)
    window.setTimeout(() => {
      let response =
        "현재 안내된 조치를 우선 진행해 주세요. 판단이 어렵다면 관련 공식 기관에 직접 상담하는 것이 가장 안전합니다."
      if (addedKeys.length)
        response = `새로 확인된 상황(${addedKeys.map((key) => emergencyData[key].title).join(", ")})의 대응 방법을 위 카드에 추가했어요. ${emergencyData[addedKeys[0]].intro}`
      else if (/입력.*안|입력하지|안 했|안했/.test(value))
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
      if (masked) response = `${MASK_NOTICE} ${response}`
      setEmergencyMessages((items) => [
        ...items,
        { from: "assistant", text: response },
      ])
      setEmergencyTyping(false)
    }, 750)
  }

  return (
    <div className="app">
      {loginPopup && (
        <ConfirmModal
          title="로그인이 필요해요"
          message="금융사기 시뮬레이션은 로그인 이후 사용할 수 있습니다."
          confirmLabel="로그인하러 가기"
          cancelLabel="닫기"
          onConfirm={goLoginFromPopup}
          onCancel={closeLoginPopup}
        />
      )}
      {endConfirm && (
        <ConfirmModal
          title="시뮬레이션을 종료하시겠습니까?"
          message="지금 종료하면 진행한 대화와 결과 리포트가 저장되지 않고 홈 화면으로 이동해요."
          confirmLabel="예"
          cancelLabel="아니오"
          onConfirm={confirmEndSimulation}
          onCancel={() => setEndConfirm(false)}
        />
      )}
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
                onClick={() => openSimulation()}
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
              {account ? <button className={page === "mypage" ? "active" : ""} onClick={() => go("mypage")}>마이페이지</button> : <button className={page === "login" || page === "signup" ? "active" : ""} onClick={() => go("login")}>로그인</button>}
            </div>
          )}
          {page === "home" && <div className="nav-account-home">{account ? <button onClick={() => go("mypage")}>마이페이지</button> : <button onClick={() => go("login")}>로그인 / 회원가입</button>}</div>}
        </nav>
      </header>
      <main>
        {page === "home" && (
          <Home
            onSimulation={() => openSimulation(true)}
            onEmergency={() => go("emergency")}
            resume={resumeInfo}
            onResume={() => go("simulation")}
          />
        )}
        {page === "simulation" && !account && (
          <AuthGate
            message="금융사기 시뮬레이션은 로그인 이후 사용할 수 있습니다."
            onLogin={() => { setReturnAfterLogin("simulation"); go("login") }}
          />
        )}
        {page === "simulation" && account && (
          
          <Simulation
            stage={simStage}
            context={context}
            setContext={setContext}
            selectedSituation={selectedSituation}
            setSelectedSituation={setSelectedSituation}
            scenario={scenario}
            simMode={simMode}
            setSimMode={setSimMode}
            everydayCategory={everydayCategory}
            setEverydayCategory={setEverydayCategory}
            scenarioOptions={scenarioOptions}
            chatTyping={chatTyping}
            chatMessages={chatMessages}
            onCreate={() => createScenario()}
            onInterviewComplete={(value, images) => createScenario(value, images)}
            usedImages={usedSimImages}
            contextImages={contextImages}
            restoredContextImageCount={restoredContextImageCount}
            onReset={resetSimulation}
            onStart={startChat}
            onSend={sendSimulationMessage}
            onEnd={() => setEndConfirm(true)}
            onReport={() => go("report")}
          />
        )}
        {page === "emergency" && (
          <Emergency
            selected={emergency}
            text={emergencyText}
            setText={setEmergencyText}
            attachments={emergencyImages}
            setAttachments={setEmergencyImages}
            analyzing={emergencyAnalyzing}
            onSelect={(key) => openEmergencyChat([key])}
            onAnalyze={analyzeEmergency}
          />
        )}
        {page === "emergencyChat" && emergency && (
          <>
          <EmergencyChat
            categories={emergencyKeys.length ? emergencyKeys : [emergency]}
            submittedText={submittedText}
            attachments={emergencyImages}
            setAttachments={setEmergencyImages}
            messages={emergencyMessages}
            typing={emergencyTyping}
            onSend={sendEmergencyMessage}
            onBack={() => go("emergency")}
          />
          <div className="chat-save-dock"><button type="button" onClick={saveEmergencyChat}><Icon name="download" size={16} /> 이 대화 저장</button>{saveNotice && <span role="status">{saveNotice}</span>}</div>
          </>
        )}
        {page === "report" && (
          <Report
            analysis={analysis}
            scenario={scenario}
            onRetry={resetSimulation}
            onEmergency={() => go("emergency")}
            onSave={saveReport}
            saveNotice={saveNotice}
          />
        )}
        {page === "login" && <AuthPage mode="login" onSwitch={() => go("signup")} onLogin={(a) => { setAccount(a); sessionStorage.setItem(SESSION_KEY, a.email); go(returnAfterLogin) }} />}
        {page === "signup" && <AuthPage mode="signup" onSwitch={() => go("login")} onLogin={(a) => { setAccount(a); sessionStorage.setItem(SESSION_KEY, a.email); go(returnAfterLogin) }} />}
        {page === "mypage" && (account ? <MyPage account={account} reports={savedReports} conversations={savedChats} onLogout={logout} onRemoveReport={(id) => { const next = savedReports.filter(x => x.id !== id); setSavedReports(next); localStorage.setItem(`wsid-reports-${account.email}`, JSON.stringify(next)) }} onRemoveConversation={(id) => { const next = savedChats.filter(x => x.id !== id); setSavedChats(next); localStorage.setItem(`wsid-conversations-${account.email}`, JSON.stringify(next)) }} /> : <AuthGate onLogin={() => { setReturnAfterLogin("mypage"); go("login") }} />)}
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
  resume,
  onResume,
}: {
  onSimulation: () => void
  onEmergency: () => void
  resume: { title: string; label: string; time: string } | null
  onResume: () => void
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
          {resume && (
            <button
              type="button"
              className="home-resume"
              onClick={onResume}
              aria-label={`진행 중인 훈련 이어서 하기: ${resume.title}`}
              style={{ marginTop: 18, width: "100%", maxWidth: 720, display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderRadius: 18, border: "1px solid rgba(37,99,235,.25)", background: "#fff", color: "#0f172a", textAlign: "left", cursor: "pointer", boxShadow: "0 10px 30px rgba(15,23,42,.08)" }}
            >
              <span className="home-action-icon" style={{ flexShrink: 0 }}>
                <Icon name="refresh" size={26} />
              </span>
              <span style={{ display: "grid", gap: 3, flex: 1, minWidth: 0 }}>
                <strong>이어서 하기</strong>
                <small style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{resume.title}</small>
                <small style={{ opacity: 0.7 }}>{resume.label} · 마지막 진행 {resume.time}</small>
              </span>
              <Icon name="arrow" size={20} />
            </button>
          )}
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
  simMode: SimulationMode
  setSimMode: (value: SimulationMode) => void
  everydayCategory: EverydayCategory | null
  setEverydayCategory: (value: EverydayCategory | null) => void
  scenarioOptions: Scenario[]
  chatTyping: boolean
  chatMessages: SimulationMessage[]
  onCreate: () => void
  onInterviewComplete: (context: string, images: UploadedImage[]) => void
  usedImages: number
  contextImages: UploadedImage[]
  restoredContextImageCount: number
  onReset: () => void
  onStart: (scenario?: Scenario) => void
  onSend: (message: string, images: UploadedImage[]) => string
  onEnd: () => void
  onReport: () => void
}
type InterviewAnswer = { question: string; answer: string; images?: UploadedImage[] }
function interviewQuestion(answers: InterviewAnswer[]) {
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
const OCR_DEMO_NOTICE = "현재 데모에서는 사진 속 글자를 읽지 못해요. 사진에 담긴 핵심 내용(누가, 무엇을 요구했는지)을 글로도 적어 주세요."
function ExperienceInterview({ onComplete }: { onComplete: (context: string, images: UploadedImage[]) => void }) {
  const [answers, setAnswers] = useState<InterviewAnswer[]>([])
  const [draft, setDraft] = useState("")
  const [pendingImages, setPendingImages] = useState<UploadedImage[]>([])
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const current = interviewQuestion(answers)
  const usedImages = answers.reduce((sum, a) => sum + (a.images?.length ?? 0), 0) + pendingImages.length
  const finish = (items: InterviewAnswer[]) =>
    onComplete(items.map(v => `${v.question} ${v.answer}`).join(" / "), items.flatMap(v => v.images ?? []))
  const submit = (value: string) => {
    const v = value.trim()
    if (!v && !pendingImages.length) return
    const sensitive = detectSensitive(v, true)
    if (sensitive.length) {
      setError(`${sensitive.join(", ")}로 보이는 내용이 있어요. 해당 부분을 지운 뒤 다시 입력해 주세요.`)
      return
    }
    const answer = v || `(사진 ${pendingImages.length}장 첨부)`
    const next = [...answers, { question: current.text, answer, images: pendingImages.length ? pendingImages : undefined }]
    setAnswers(next)
    setDraft("")
    setPendingImages([])
    setError("")
    if (next.length === 3) finish(next)
  }
  const addImages = async (files: FileList | null) => {
    if (!files?.length) return
    const result = await loadEvidence(Array.from(files), usedImages, SIM_IMAGE_LIMITS)
    if (result.images.length) setPendingImages((items) => [...items, ...result.images])
    setError(result.error)
    if (fileRef.current) fileRef.current.value = ""
  }
  useEffect(() => { endRef.current?.scrollIntoView({block:"nearest", behavior:"smooth"}) }, [answers.length])
  return <div className="experience-interview">
    <div className="interview-topline"><strong>나의 일상 이야기하기</strong><span>최대 3개 질문 · {Math.min(answers.length+1,3)}/3</span></div>
    <p className="interview-help">길게 설명하지 않아도 괜찮아요. 답변은 선택하거나 직접 적을 수 있고, 받은 문자나 화면 사진을 첨부해도 돼요.</p>
    <div className="interview-thread" aria-live="polite">
      {answers.map((a,i) => <div className="interview-pair" key={i}>
        <div className="interview-assistant"><span className="interview-avatar"><Icon name="shield" size={17}/></span><div className="interview-bubble">{a.question}</div></div>
        <div className="interview-user"><span>{a.answer}</span></div>
        {a.images && <div className="sent-photo-gallery" style={{ display: "flex", justifyContent: "flex-end" }}><EvidenceGallery images={a.images} /></div>}
      </div>)}
      <div className="interview-assistant"><span className="interview-avatar"><Icon name="shield" size={17}/></span><div className="interview-bubble">{current.text}</div></div>
      <div ref={endRef}/>
    </div>
    <div className="interview-choices">{current.choices.map(choice => <button key={choice} type="button" onClick={() => submit(choice)}>{choice}</button>)}</div>
    {pendingImages.length > 0 && <div className="chat-attachments pending-photos">
      <span>함께 보낼 사진: {pendingImages.length}장</span>
      <EvidenceGallery images={pendingImages} max={SIM_IMAGE_LIMITS.max} onRemove={(id) => setPendingImages((items) => items.filter((item) => item.id !== id))} />
      <p className="upload-safety"><Icon name="spark" size={15}/> {OCR_DEMO_NOTICE}</p>
    </div>}
    {error && <p className="upload-error" role="alert">{error}</p>}
    <input ref={fileRef} className="visually-hidden-evidence" style={{ display: "none" }} type="file" multiple accept={SIM_IMAGE_ACCEPT} onChange={(e) => void addImages(e.target.files)} aria-label="상황 설명 사진 첨부" />
    <form className="interview-compose" onSubmit={e => {e.preventDefault(); submit(draft)}}>
      <button type="button" className="chat-attach-button" title={`사진 첨부 (PNG·JPEG, 최대 ${SIM_IMAGE_LIMITS.max}장, 장당 5MB)`} aria-label="사진 첨부" disabled={usedImages >= SIM_IMAGE_LIMITS.max} onClick={() => fileRef.current?.click()}><Icon name="image" size={18}/></button>
      <input aria-label="일상 경험 답변" placeholder="직접 답변하기..." maxLength={180} value={draft} onChange={e => { setDraft(e.target.value); if (error && !detectSensitive(e.target.value, true).length) setError("") }}/>
      <button type="submit" disabled={!draft.trim() && !pendingImages.length}><Icon name="arrow" size={17}/> 답변</button>
    </form>
    <small style={{ display: "block", marginTop: 6, opacity: 0.7 }}>사진 첨부: PNG·JPEG, 훈련 한 번에 최대 {SIM_IMAGE_LIMITS.max}장, 장당 5MB ({usedImages}/{SIM_IMAGE_LIMITS.max})</small>
    {answers.length >= 2 && <button type="button" className="interview-skip" onClick={() => finish(answers)}>충분히 이야기했어요 · 상황 추천받기 →</button>}
    <div className="privacy"><Icon name="lock" size={16}/><span>비밀번호·주민등록번호·계좌번호 등 민감한 정보는 입력하지 마세요. 사진 속 민감정보도 가린 뒤 첨부해 주세요.</span></div>
  </div>
}

function Simulation(p: SimulationProps) {
  if (p.stage === "chat" || p.stage === "complete") return <SimulationChat {...p} />
  const choosing = p.simMode === "choose"
  return <section className="subpage"><div className="container preparation-container">
    <PageIntro kicker="일상에서 시작하는 금융사기 대응 훈련" title="평범한 일상 속 위험 상황을 미리 경험해 보세요"
      subtitle="내가 겪은 일을 입력하거나 새로운 일상을 선택해, 실제처럼 대화하고 대응 방법을 연습해요." />
    {p.stage === "input" && <div className="input-card simulation-setup simulation-new-flow">
      {choosing ? <>
        <div className="step-label"><span>1</span> 훈련 방법 선택</div>
        <h2>어떤 방식으로 훈련해 볼까요?</h2>
        <p>나의 일상으로 훈련하거나, 처음 접하는 상황을 선택해 볼 수 있어요.</p>
        <div className="simulation-mode-grid">
          <button className="simulation-mode-card" onClick={() => p.setSimMode("mine")}><span className="sim-mode-icon"><Icon name="chat" size={26}/></span><strong>내 경험으로 훈련하기</strong><small>짧은 대화로 최근 경험을 알려주면 상황 3가지를 추천해요.</small><span className="sim-mode-arrow">시작하기 →</span></button>
          <button className="simulation-mode-card" onClick={() => p.setSimMode("discover")}><span className="sim-mode-icon"><Icon name="spark" size={26}/></span><strong>새로운 일상 경험하기</strong><small>일상 카테고리를 선택하면 발생할 수 있는 상황 3가지를 추천해요.</small><span className="sim-mode-arrow">선택하기 →</span></button>
        </div>
      </> : <>
        <button type="button" className="text-button sim-back" onClick={() => {p.setSimMode("choose");p.setEverydayCategory(null)}}>← 훈련 방법 다시 선택</button>
        <div className="step-label"><span>1</span> {p.simMode === "mine" ? "내 경험 입력" : "새로운 일상 선택"}</div>
        {p.simMode === "mine" ? <ExperienceInterview onComplete={p.onInterviewComplete} /> : <>
          <h2>어떤 일상을 경험해 볼까요?</h2><p>익숙한 일상에서 발생할 수 있는 위험 상황을 미리 경험해 보세요.</p>
          <div className="everyday-category-grid">{everydayCategories.map(c => <button key={c.key} aria-pressed={p.everydayCategory===c.key} className={`everyday-category ${p.everydayCategory===c.key ? "selected" : ""}`} onClick={() => p.setEverydayCategory(c.key)}><span><Icon name={c.icon} size={23}/></span><strong>{c.title}</strong><small>{c.description}</small></button>)}</div>
        </>}
        {p.simMode === "discover" && <button className="primary-button full" disabled={!p.everydayCategory} onClick={p.onCreate}>관련 상황 3가지 추천받기 <Icon name="spark" size={18}/></button>}
      </>}
    </div>}
    {p.stage === "loading" && <div className="loading-card" aria-live="polite"><div className="loader-visual"><Icon name="shield" size={34}/><span/></div><h2>관련 상황 3가지를 준비하고 있어요.</h2><p>교육용 시나리오를 일상 맥락에 맞게 추천하고 있습니다.</p><span className="demo-note">현재는 AI 서버가 연결되지 않은 규칙 기반 데모입니다.</span></div>}
    {p.stage === "summary" && <div className="input-card scenario-options-wrap">
      <button className="text-button sim-back" onClick={p.onReset}>← 처음으로</button>
      <div className="step-label"><span>2</span> 상황 선택</div>
      <h2>{p.simMode === "discover" ? `${everydayCategories.find(c=>c.key===p.everydayCategory)?.title ?? "선택한 일상"}에서 일어날 수 있는 상황` : "내 경험을 바탕으로 추천한 상황"}</h2>
      <p>세 가지 가상 상황 중 하나를 골라 실제 대화처럼 훈련해 보세요.</p>
      <div className="sim-scenario-list">{p.scenarioOptions.map((option, index) => <button key={`${option.title}-${index}`} className="sim-scenario-option" onClick={() => p.onStart(option)}><span className="sim-scenario-index">SCENARIO {String(index+1).padStart(2,"0")}</span><strong>{option.title}</strong><span className="sim-scenario-desc">{option.description}</span><span className="sim-scenario-enter">대화 훈련 시작 <Icon name="arrow" size={16}/></span></button>)}</div>
      <div className="demo-disclosure">현재 시나리오 추천 및 대화는 AI API가 연결되지 않은 교육용 데모입니다. 실제 금융기관이나 배송 업체에서 보낸 연락이 아닙니다. 위험 여부는 훈련 후 대응 리포트에서 확인하세요.</div>
      <div className="button-row"><button className="outline-button" onClick={p.onCreate}><Icon name="refresh" size={16}/> 다시 추천받기</button><button className="text-button" onClick={p.onReset}>훈련 방법 바꾸기</button></div>
    </div>}
  </div></section>
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
  const [sensitiveWarning, setSensitiveWarning] = useState("")
  const [pendingImages, setPendingImages] = useState<UploadedImage[]>([])
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const imageSlots = Math.max(0, SIM_IMAGE_LIMITS.max - p.usedImages - pendingImages.length)
  const addImages = async (files: FileList | null) => {
    if (!files?.length) return
    const result = await loadEvidence(Array.from(files), p.usedImages + pendingImages.length, SIM_IMAGE_LIMITS)
    if (result.images.length) setPendingImages((items) => [...items, ...result.images])
    setSensitiveWarning(result.error)
    if (fileRef.current) fileRef.current.value = ""
  }
  const userTurns = p.chatMessages.filter(
    (message) => message.from === "user",
  ).length
  const progress = p.stage === "complete" ? 5 : Math.min(5, userTurns + 1)
  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" })
  }, [p.chatMessages, p.chatTyping, p.stage])
  const submit = () => {
    if ((!input.trim() && !pendingImages.length) || p.chatTyping) return
    const blocked = p.onSend(input, pendingImages)
    if (blocked) {
      // 입력 내용은 그대로 두어 사용자가 민감정보만 지우고 다시 보낼 수 있게 합니다.
      setSensitiveWarning(blocked)
      return
    }
    setInput("")
    setPendingImages([])
    setSensitiveWarning("")
  }
  const contextImageTotal = p.contextImages.length + p.restoredContextImageCount
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
          {contextImageTotal > 0 && (
            <div style={{ margin: "12px 0" }}>
              <small>상황 설명에 첨부한 사진 {contextImageTotal}장</small>
              {p.contextImages.length > 0
                ? <EvidenceGallery images={p.contextImages} />
                : <small style={{ display: "block", opacity: 0.7 }}>새로고침 후에는 사진 미리보기가 표시되지 않아요.</small>}
            </div>
          )}
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
                  {m.text && <p>{m.text}</p>}
                  {m.images && m.images.length > 0 && (
                    <div className="sent-photo-gallery"><EvidenceGallery images={m.images} /></div>
                  )}
                  {!m.images && !!m.imageCount && (
                    <p style={{ opacity: 0.75 }}>사진 {m.imageCount}장을 보냈어요. (새로고침 후에는 미리보기가 표시되지 않아요)</p>
                  )}
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
            <div
              className="simulation-chat-input"
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={(e) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false) }}
              onDrop={(e) => { e.preventDefault(); setDragging(false); void addImages(e.dataTransfer.files) }}
            >
              <input ref={fileRef} className="visually-hidden-evidence" style={{ display: "none" }} type="file" multiple accept={SIM_IMAGE_ACCEPT} onChange={(e) => void addImages(e.target.files)} aria-label="사진 첨부" />
              {dragging && <div className="chat-drop-hint">여기에 사진을 놓아 첨부하세요 (PNG·JPEG)</div>}
              {pendingImages.length > 0 && (
                <div className="chat-attachments pending-photos">
                  <span>전송할 사진: {pendingImages.length}장</span>
                  <EvidenceGallery images={pendingImages} max={SIM_IMAGE_LIMITS.max} onRemove={(id) => setPendingImages((items) => items.filter((item) => item.id !== id))} />
                  <p className="upload-safety"><Icon name="spark" size={15} /> {OCR_DEMO_NOTICE}</p>
                </div>
              )}
              <div className="privacy">
                <Icon name="lock" size={15} />
                <span>
                  실제 비밀번호, 인증번호, 계좌번호는 입력하지 마세요. 사진 첨부는 PNG·JPEG, 훈련 한 번에 최대 {SIM_IMAGE_LIMITS.max}장(남은 {imageSlots}장), 장당 5MB예요.
                </span>
              </div>
              {sensitiveWarning && (
                <p className="upload-error" role="alert">
                  {sensitiveWarning}
                </p>
              )}
              <div className="chat-input-row">
                <button
                  type="button"
                  className="chat-attach-button"
                  title="사진 첨부"
                  aria-label="사진 첨부"
                  disabled={imageSlots === 0 || p.chatTyping}
                  onClick={() => fileRef.current?.click()}
                >
                  <Icon name="image" size={20} />
                </button>
                <textarea
                  rows={1}
                  maxLength={500}
                  value={input}
                  disabled={p.chatTyping}
                  aria-invalid={Boolean(sensitiveWarning)}
                  onChange={(event) => {
                    setInput(event.target.value)
                    if (sensitiveWarning && !detectSensitive(event.target.value, true).length) setSensitiveWarning("")
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault()
                      submit()
                    }
                  }}
                  placeholder="상대방에게 보낼 답변을 직접 입력해 주세요."
                />
                <button
                  disabled={(!input.trim() && !pendingImages.length) || p.chatTyping}
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
  attachments: UploadedImage[]
  setAttachments: (value: UploadedImage[]) => void
  analyzing: boolean
  onSelect: (key: EmergencyKey) => void
  onAnalyze: () => void
}
function Emergency(p: EmergencyProps) {
  const [uploadError, setUploadError] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const dragDepth = useRef(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const cards: [EmergencyKey, IconName][] = [
    ["transfer", "send"], ["link", "link"], ["app", "app"],
    ["privacy", "user"], ["call", "phone"], ["trade", "cart"],
  ]
  const selectImages = async (files: FileList | null) => {
    if (!files?.length) return
    const result = await loadEvidence(Array.from(files), p.attachments.length)
    if (result.images.length) p.setAttachments([...p.attachments, ...result.images])
    setUploadError(result.error)
    if (fileRef.current) fileRef.current.value = ""
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
          <div
            className={`upload-zone ${isDragging ? "is-dragging" : ""}`}
            onDragEnter={(event) => {
              event.preventDefault()
              dragDepth.current += 1
              setIsDragging(true)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = "copy"
            }}
            onDragLeave={(event) => {
              event.preventDefault()
              dragDepth.current = Math.max(0, dragDepth.current - 1)
              if (dragDepth.current === 0) setIsDragging(false)
            }}
            onDrop={(event) => {
              event.preventDefault()
              dragDepth.current = 0
              setIsDragging(false)
              void selectImages(event.dataTransfer.files)
            }}
          >
            <input
              ref={fileRef}
              id="evidence-image"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => void selectImages(event.target.files)}
            />
            <label htmlFor="evidence-image">
              <span><Icon name="image" size={23} /></span>
              <span>
                <strong>사진을 끌어다 놓거나 클릭해서 첨부하기</strong>
                <small>여러 장을 한꺼번에 선택하거나 추가할 수 있어요. (최대 12장, 장당 10MB)</small>
              </span>
              <Icon name="arrow" size={18} />
            </label>
            {p.attachments.length > 0 && <div className="attached-evidence">
              <strong>첨부한 사진: {p.attachments.length}장</strong>
              <EvidenceGallery images={p.attachments}
                onAdd={() => fileRef.current?.click()}
                onRemove={(id) => p.setAttachments(p.attachments.filter((item) => item.id !== id))} />
            </div>}
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
              disabled={(!p.text.trim() && p.attachments.length === 0) || p.analyzing}
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
  categories: EmergencyKey[]
  submittedText: string
  attachments: UploadedImage[]
  setAttachments: (value: UploadedImage[]) => void
  messages: AssistantMessage[]
  typing: boolean
  onSend: (message: string, images: UploadedImage[]) => void
  onBack: () => void
}
function EmergencyChat(p: EmergencyChatProps) {
  const [input, setInput] = useState("")
  const [uploadError, setUploadError] = useState("")
  const [draggingChat, setDraggingChat] = useState(false)
  const [pendingImages, setPendingImages] = useState<UploadedImage[]>([])
  const chatImageRef = useRef<HTMLInputElement>(null)
  const addChatImages = async (files: FileList | null) => {
    if (!files?.length) return
    const result = await loadEvidence(Array.from(files), p.attachments.length + pendingImages.length)
    if (result.images.length) setPendingImages((current) => [...current, ...result.images])
    setUploadError(result.error)
    if (chatImageRef.current) chatImageRef.current.value = ""
  }
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
  const activeSituations = p.categories.map((key) => ({ key, ...emergencyData[key] }))
  const multiple = activeSituations.length > 1
  // 여러 상황의 기관을 중복 없이 합칩니다(112는 항상 맨 앞).
  const organizations = Array.from(new Set(activeSituations.flatMap((s) => s.organizations))).sort(
    (a, b) => (a === "police" ? -1 : b === "police" ? 1 : 0),
  )
  const hasCategory = (key: EmergencyKey) => p.categories.includes(key)
  const firstResponseEnd = p.submittedText || (p.messages[0]?.from === "user") ? 2 : 1
  const isAnalysis = Boolean(p.submittedText || p.attachments.length)
  const similarCase =
    hasCategory("trade")
      ? {
          type: "중고거래 선입금 사기",
          summary:
            "판매자가 물품 발송 전 입금을 받은 뒤 연락을 끊는 사례가 있어요.",
          similarity:
            "개인 간 거래, 계좌이체 또는 판매자 연락 중단 여부를 함께 살펴봐야 해요.",
          signs:
            "시세보다 지나치게 낮은 가격, 안전결제 거부, 플랫폼 밖 연락 유도",
        }
      : hasCategory("link") || hasCategory("app")
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
  // 상황이 여러 개면 상황별로 묶어서 대응 카드를 모두 보여줍니다(우선순위 순서).
  const renderSteps = () =>
    activeSituations.map((situation, groupIndex) => (
      <div key={situation.key} style={multiple ? { marginTop: groupIndex ? 22 : 4 } : undefined}>
        {multiple && (
          <h4 style={{ margin: "0 0 10px", display: "flex", alignItems: "center", gap: 8 }}>
            <span className="badge">{groupIndex === 0 ? "가장 먼저" : `상황 ${groupIndex + 1}`}</span>
            {situation.title}
          </h4>
        )}
        <div className="action-steps">
          {situation.steps.map((step, index) => (
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
    ))
  const submit = () => {
    if ((!input.trim() && !pendingImages.length) || p.typing) return
    p.onSend(input, pendingImages)
    setInput("")
    setPendingImages([])
    setUploadError("")
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
                  {message.text && <p>{message.text}</p>}
                  {message.images && message.images.length > 0 && (
                    <div className="sent-photo-gallery"><EvidenceGallery images={message.images} /></div>
                  )}
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
                      ? `${activeSituations.map((s) => s.title).join(", ")} 상황과 관련된 표현이 확인되었어요. 상대의 신원과 요청 내용을 공식 경로에서 별도로 확인하는 것이 필요합니다.`
                      : "첨부한 사진이 확인되었어요. 현재 데모에서는 이미지 속 문자를 읽을 수 없으므로 아래 대화창에 핵심 내용을 추가해 주세요."}
                  </p>

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
                  {renderSteps()}
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
                {renderSteps()}
              </div>
            )}
            <div className="chat-organizations">
              <h3>관련 공식 기관</h3>
              <div className="organization-grid">
                {organizations.map((key) => {
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
                  {message.text && <p>{message.text}</p>}
                  {message.images && message.images.length > 0 && (
                    <div className="sent-photo-gallery"><EvidenceGallery images={message.images} /></div>
                  )}
                </div>
              </div>
            ))}
            {p.typing && <Typing />}
          </div>
          <div className="emergency-chat-input"
            onDragOver={(e) => { e.preventDefault(); setDraggingChat(true) }}
            onDragLeave={(e) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setDraggingChat(false) }}
            onDrop={(e) => { e.preventDefault(); setDraggingChat(false); void addChatImages(e.dataTransfer.files) }}>
            <input className="visually-hidden-evidence" ref={chatImageRef} type="file" multiple accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(e) => void addChatImages(e.target.files)} aria-label="사진 첨부" />
            {draggingChat && <div className="chat-drop-hint">여기에 사진을 놓아 첨부하세요</div>}
            {pendingImages.length > 0 && <div className="chat-attachments pending-photos">
              <span>전송할 사진: {pendingImages.length}장</span>
              <EvidenceGallery images={pendingImages} onRemove={(id) => setPendingImages((items) => items.filter((item) => item.id !== id))} />
            </div>}
            {uploadError && <p className="upload-error" role="alert">{uploadError}</p>}
            <div className="privacy">
              <Icon name="lock" size={15} />
              <span>민감한 개인정보는 입력하지 마세요.</span>
            </div>
            <div className="chat-input-row">
              <button type="button" className="chat-attach-button" title="사진 여러 장 첨부" aria-label="사진 첨부" onClick={() => chatImageRef.current?.click()}><Icon name="image" size={20} /></button>
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
              <button disabled={(!input.trim() && pendingImages.length === 0) || p.typing} onClick={submit}>
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
  onSave,
  saveNotice,
}: {
  analysis: ConversationAnalysis
  scenario: Scenario
  onRetry: () => void
  onEmergency: () => void
  onSave: () => void
  saveNotice: string
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
          <button className="primary-button" onClick={onSave}><Icon name="shield" size={18} /> 내 리포트에 저장</button>
          {saveNotice && <p role="status" className="report-save-notice">{saveNotice}</p>}
          <button className="outline-button" onClick={() => window.print()}>
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


// Front-end preview only: wire these screens to Spring AUTH-001/002/003/004 for production.
function AuthPage({ mode, onSwitch, onLogin }: { mode: "login" | "signup"; onSwitch: () => void; onLogin: (account: DemoAccount) => void }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [gender, setGender] = useState("")
  const [sentCode, setSentCode] = useState("")
  const [code, setCode] = useState("")
  const [expires, setExpires] = useState(0)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const signup = mode === "signup"
  const sendCode = () => {
    setError("")
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError("올바른 이메일 주소를 입력해 주세요."); return }
    const accounts = readStore<DemoAccount[]>(ACCOUNT_KEY, [])
    if (accounts.some(a => a.email === email.trim().toLowerCase() && a.verified)) { setError("이미 가입된 이메일입니다. 로그인해 주세요."); return }
    setSentCode(String(Math.floor(100000 + Math.random() * 900000)))
    setExpires(Date.now() + 5 * 60 * 1000)
    setCode("")
  }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("")
    const cleanEmail = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) { setError("올바른 이메일을 입력해 주세요."); return }
    if (!password) { setError("비밀번호를 입력해 주세요."); return }
    setBusy(true)
    try {
      const accounts = readStore<DemoAccount[]>(ACCOUNT_KEY, [])
      if (signup) {
        if (!name.trim()) throw Error("이름을 입력해 주세요.")
        if (!gender) throw Error("성별을 선택해 주세요.")
        if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) throw Error("비밀번호는 영문과 숫자를 포함한 8자 이상으로 설정해 주세요.")
        if (password !== confirm) throw Error("비밀번호가 일치하지 않습니다.")
        if (!sentCode) throw Error("이메일 인증 코드를 먼저 발급해 주세요.")
        if (Date.now() > expires) throw Error("인증 코드가 만료됐어요. 재발급해 주세요.")
        if (code !== sentCode) throw Error("인증 코드가 일치하지 않습니다.")
        if (accounts.some(a => a.email === cleanEmail)) throw Error("이미 가입된 이메일입니다. 로그인해 주세요.")
        const salt = crypto.randomUUID()
        const account: DemoAccount = { name: name.trim(), email: cleanEmail, gender, salt, passwordHash: await hashDemoPassword(password, salt), verified: true }
        localStorage.setItem(ACCOUNT_KEY, JSON.stringify([...accounts, account]))
        onLogin(account)
      } else {
        const account = accounts.find(a => a.email === cleanEmail)
        if (!account || account.passwordHash !== await hashDemoPassword(password, account.salt)) throw Error("이메일 또는 비밀번호를 확인해 주세요.")
        if (!account.verified) throw Error("이메일 인증을 완료한 뒤 로그인해 주세요.")
        onLogin(account)
      }
    } catch (err) { setError(err instanceof Error ? err.message : "처리 중 오류가 발생했습니다.") }
    finally { setBusy(false) }
  }
  return <section className="subpage account-page"><div className="account-shell">
    <div className="account-intro"><span className="account-kicker"><Icon name="shield" size={16}/> 안전한 금융생활의 시작</span><h1>{signup ? "회원가입" : "다시 만나 반가워요!"}</h1><p>{signup ? "어떡하지와 함께 사기 대응을 연습하고 나만의 기록을 관리해 보세요." : "로그인하고 저장한 리포트와 긴급대응 대화를 확인하세요."}</p></div>
    <form className="account-card" onSubmit={submit}>
      {signup && <label>이름<input value={name} onChange={e => setName(e.target.value)} placeholder="이름을 입력해 주세요" autoComplete="name" required /></label>}
      <label>이메일 주소<div className="auth-input-line"><input type="email" value={email} onChange={e => { setEmail(e.target.value); setSentCode("") }} placeholder="example@email.com" autoComplete="email" required />{signup && <button type="button" className="auth-code-button" onClick={sendCode}>{sentCode ? "재발급" : "인증하기"}</button>}</div></label>
      {signup && sentCode && <div className="auth-verification"><label>이메일 인증번호<input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" maxLength={6} placeholder="6자리 인증번호" required /></label><p className="demo-code-note">화면 시연용 인증번호: <strong>{sentCode}</strong> (5분 유효) — 실제 이메일은 발송되지 않습니다.</p></div>}
      <label>비밀번호<div className="auth-input-line"><input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder={signup ? "영문·숫자 포함 8자 이상" : "비밀번호 입력"} autoComplete={signup ? "new-password" : "current-password"} required /><button className="password-toggle" type="button" onClick={() => setShowPassword(x => !x)}>{showPassword ? "숨기기" : "보기"}</button></div></label>
      {signup && <><label>비밀번호 확인<input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" placeholder="비밀번호를 다시 입력해 주세요" required /></label><fieldset className="gender-set"><legend>성별</legend><div>{[["female", "여성"], ["male", "남성"], ["other", "기타 / 응답하지 않음"]].map(([v, t]) => <label key={v} className={gender === v ? "selected" : ""}><input type="radio" name="gender" value={v} checked={gender === v} onChange={() => setGender(v)} />{t}</label>)}</div></fieldset></>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? "처리 중..." : signup ? "가입 완료하기" : "로그인"} <Icon name="arrow" size={17}/></button>
      <p className="auth-switch">{signup ? "이미 계정이 있으신가요?" : "아직 회원이 아니신가요?"} <button type="button" onClick={onSwitch}>{signup ? "로그인" : "회원가입"}</button></p>
      <p className="auth-prototype">현재 화면은 프런트엔드 데모입니다. 계정은 이 브라우저에만 저장되며 실제 이메일 발송, 서버 인증, 안전한 계정 관리는 구현 전입니다. 실제 개인정보나 사용 중인 비밀번호를 입력하지 마세요.</p>
    </form>
  </div></section>
}
function AuthGate({ onLogin, message = "마이페이지와 저장한 기록은 로그인 후 확인할 수 있어요." }: { onLogin: () => void; message?: string }) { return <section className="subpage account-page"><div className="account-card gate-card"><div className="account-icon"><Icon name="lock" size={28} /></div><h1>로그인이 필요해요</h1><p>{message}</p><button className="primary-button" onClick={onLogin}>로그인하러 가기 <Icon name="arrow"/></button></div></section> }
function MyPage({ account, reports, conversations, onLogout, onRemoveReport, onRemoveConversation }: { account: DemoAccount; reports: SavedReport[]; conversations: SavedConversation[]; onLogout: () => void; onRemoveReport: (id: string) => void; onRemoveConversation: (id: string) => void }) {
  const [tab, setTab] = useState<"reports" | "chats">("reports")
  const [openReport, setOpenReport] = useState<SavedReport | null>(null)
  const [openChat, setOpenChat] = useState<SavedConversation | null>(null)
  const items = tab === "reports" ? reports : conversations
  return <section className="subpage mypage"><div className="container mypage-container">
    <div className="mypage-top"><div><span className="account-kicker"><Icon name="shield" size={16}/> MY PAGE</span><h1>나의 금융 안전 기록</h1><p>훈련 리포트와 저장한 긴급대응 대화를 한곳에서 확인해요.</p></div><button className="outline-button logout-button" onClick={onLogout}>로그아웃</button></div>
    <div className="profile-card"><div className="profile-avatar"><Icon name="user" size={26}/></div><div><strong>{account.name}님, 안녕하세요!</strong><p>{account.email}</p></div><span className="profile-status"><Icon name="check" size={15}/> 가입 완료</span></div>
    <div className="mypage-stats"><div><span>저장한 리포트</span><strong>{reports.length}<small>개</small></strong></div><div><span>긴급대응 대화</span><strong>{conversations.length}<small>개</small></strong></div></div>
    <div className="mypage-records"><div className="mypage-tabs"><button className={tab === "reports" ? "active" : ""} onClick={() => { setTab("reports"); setOpenReport(null); setOpenChat(null) }}>내 리포트 <span>{reports.length}</span></button><button className={tab === "chats" ? "active" : ""} onClick={() => { setTab("chats"); setOpenReport(null); setOpenChat(null) }}>긴급대응 대화 <span>{conversations.length}</span></button></div>
      {openReport ? <div className="record-detail"><button className="record-back" onClick={() => setOpenReport(null)}>← 목록으로</button><h2>{openReport.title}</h2><p>{openReport.date} · {openReport.type}</p><div className="record-score">대응 점수 <strong>{openReport.analysis.score}점</strong></div><h3>{openReport.analysis.summary}</h3><div className="record-detail-columns"><div><h4>잘한 대응</h4><ul>{openReport.analysis.safe.map((v,i) => <li key={i}>{v}</li>)}</ul></div><div><h4>주의할 대응</h4><ul>{openReport.analysis.risky.map((v,i) => <li key={i}>{v}</li>)}</ul></div><div><h4>놓친 위험 신호</h4><ul>{openReport.analysis.missed.map((v,i) => <li key={i}>{v}</li>)}</ul></div></div><button className="outline-button" onClick={() => window.print()}><Icon name="download" size={17}/> 인쇄 / PDF로 저장</button></div>
      : openChat ? <div className="record-detail"><button className="record-back" onClick={() => setOpenChat(null)}>← 목록으로</button><h2>{openChat.title}</h2><p>{openChat.date}</p><div className="saved-chat-messages">{openChat.messages.map((m, i) => <div className={`saved-chat-line ${m.from}`} key={i}><span>{m.from === "user" ? "나" : "어떡하지 도우미"}</span><div>{m.text || (m.imageCount ? "사진을 전송했어요." : "")}{!!m.imageCount && <small>첨부 사진 {m.imageCount}장 · 원본은 저장되지 않았습니다</small>}</div></div>)}</div></div>
      : items.length ? <div className="record-list">{tab === "reports" ? reports.map(r => <div className="record-row" key={r.id}><div className="record-icon"><Icon name="shield" size={22}/></div><div className="record-info"><strong>{r.title}</strong><p>{r.type} · {r.date}</p></div><span className="record-badge">{r.analysis.score}점</span><button className="record-view" onClick={() => setOpenReport(r)}>상세보기</button><button className="record-delete" onClick={() => { if (window.confirm("이 리포트를 삭제할까요?")) onRemoveReport(r.id) }}>삭제</button></div>) : conversations.map(c => <div className="record-row" key={c.id}><div className="record-icon"><Icon name="chat" size={22}/></div><div className="record-info"><strong>{c.title}</strong><p>{c.date} · 메시지 {c.messages.length}개</p></div><button className="record-view" onClick={() => setOpenChat(c)}>대화 보기</button><button className="record-delete" onClick={() => { if (window.confirm("이 대화를 삭제할까요?")) onRemoveConversation(c.id) }}>삭제</button></div>)}</div>
      : <div className="record-empty"><div className="record-empty-icon"><Icon name={tab === "reports" ? "shield" : "chat"} size={30}/></div><h3>{tab === "reports" ? "아직 저장한 리포트가 없어요" : "아직 저장한 대화가 없어요"}</h3><p>{tab === "reports" ? "시뮬레이션을 마치고 결과 화면에서 리포트를 저장해 보세요." : "긴급대응 채팅에서 ‘이 대화 저장’을 누르면 여기에 나타나요."}</p></div>}
    </div><p className="mypage-warning"><Icon name="lock" size={15}/> 현재 기록은 서버가 아닌 이 브라우저의 로컬 저장소에 보관되는 시연용 기능입니다. 개인정보와 실제 피해 증빙 자료를 저장하지 마세요.</p>
  </div></section>
}
