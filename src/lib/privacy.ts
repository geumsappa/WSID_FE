// 민감정보 감지·가림 (프런트 데모용 규칙)
export const SECRET_PATTERN = /(비밀번호|인증번호|보안카드|OTP|otp|PIN|pin)(.{0,12}?)(\d{4,})/g
export const RRN_PATTERN = /\d{6}\s?-\s?[1-4]\d{6}/g
export const CARD_PATTERN = /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g
export const ACCOUNT_PATTERN = /\d{2,6}-\d{2,6}-\d{2,7}/g
export const PHONE_PATTERN = /01[016789][-\s]?\d{3,4}[-\s]?\d{4}/g
export const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.]+/g
// 시뮬레이션용 개인정보 처리
// - 입력은 막지 않습니다(사용자가 실제로 정보를 내주는지가 훈련 평가 대상이기 때문).
// - 어떤 "종류"의 정보를 입력했는지만 남기고, 실제 값은 전송하는 순간 [주민등록번호]처럼 바꿔 버립니다.
//   그래서 화면 상태·이어하기 저장·리포트 어디에도 원래 값이 남지 않습니다.
// - askedForCode=true: 상대가 직전에 인증번호·비밀번호를 요구했다면 숫자만 보낸 답장도 인증번호로 봅니다.
// ── 1차 가림 보강 (AI 서버 app/guard/pii_masker.py · training_turn._mask_last 와 같은 규칙) ──
const KO_DIGIT: Record<string, string> = { 공: "0", 영: "0", 빵: "0", 일: "1", 이: "2", 삼: "3", 사: "4", 오: "5", 육: "6", 륙: "6", 칠: "7", 팔: "8", 구: "9" }
const KO_RUN = /(?<![가-힣])[공영빵일이삼사오육륙칠팔구](?:[\s\-.]?[공영빵일이삼사오육륙칠팔구]){6,}/g
/** "공일공 일이삼사 오육칠팔" → "010 1234 5678" (숫자 글자가 7개 이상 이어질 때만) */
export function koreanDigitsToArabic(text: string): string {
  return text.replace(KO_RUN, (match: string, offset: number, whole: string) => {
    let run = match
    const next = whole.charAt(offset + match.length)
    if (run.endsWith("이") && next && "요에고랑야".includes(next)) run = run.slice(0, -1) // "…팔이요"의 '이'는 조사
    if ([...run].filter((ch) => ch in KO_DIGIT).length < 7) return match
    return [...run].map((ch) => KO_DIGIT[ch] ?? ch).join("") + match.slice(run.length)
  })
}
const LANDLINE_PATTERN = /(?<!\d)0(?:2|[3-6][1-5]|70)[-\s.]?\d{3,4}[-\s.]?\d{4}(?!\d)/g
const BIRTH_PATTERN = /(?<!\d)(?:19|20)\d{2}\s?[.\-/년]\s?\d{1,2}\s?[.\-/월]\s?\d{1,2}\s?일?(?!\d)/g
const ADDRESS_PATTERNS = [
  /[가-힣]{2,}(?:로|길)\s?\d{1,4}(?:-\d{1,4})?(?!\s*(?:일|개|시|분|원|만|천|명|번째|살|%))/g,
  /\d{1,4}\s?동\s?\d{1,4}\s?호/g,
  /[가-힣]+(?:동|읍|면|리)\s?\d{1,4}(?:-\d{1,4})?\s?번지/g,
]
const SURNAMES = "김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허유남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용"
const COMMON_WORDS = new Set(["지금", "이거", "이건", "이게", "이제", "정말", "진짜", "조금", "오늘", "고객", "주소", "문자", "성함", "이름",
  "계좌", "송금", "우리", "제가", "저는", "전화", "번호", "은행", "확인", "하나", "한번", "안녕", "감사", "고마워", "연락", "인증", "카드",
  "주민", "장난", "정도", "이상", "조심", "임시", "신한", "국민", "농협", "기업", "구매", "판매", "거래", "배송", "택배", "문의", "전에",
  "이미", "이번", "오후", "오전", "남편", "아내", "엄마", "아빠", "친구", "동생", "형님", "누나", "언니", "오빠", "선생", "사장", "기사",
  "직원", "아니요", "아니오", "정말요", "이상해", "안돼", "알겠어", "괜찮아", "모르겠어", "잠시만", "글쎄", "그래", "네네", "고민"])
const NAME_ASK = /성함|이름|예금주|본명|실명/
const REFUSAL = /\?|왜|싫|안\s?돼|안\s?할|안\s?드|못\s|못해|아니|사기|누구|뭐|무슨|어디|의심|그만/
const MARKER_TYPES = ["주민등록번호", "카드번호", "전화번호", "계좌번호", "이메일", "비밀번호", "인증번호", "인증정보", "이름", "주소", "생년월일"]

/** 번호를 두 메시지로 나눠 보낸 경우("010-1234" 다음 "5678"): 이어 붙여 번호가 되면 이번 조각을 가려요 */
function maskSplitNumber(text: string, prevUser: string): { text: string; kind: string | null } {
  const tail = /(\d[\d\s-]*\d|\d)\s*$/.exec(prevUser)
  const head = /^\s*(\d[\d\s-]*\d|\d)/.exec(text)
  if (!tail || !head) return { text, kind: null }
  const digits = (tail[1] + head[1]).replace(/\D/g, "")
  if (digits.length < 9) return { text, kind: null }
  const kind = digits.startsWith("01") && (digits.length === 10 || digits.length === 11) ? "전화번호"
    : digits.length === 15 || digits.length === 16 ? "카드번호" : "계좌번호"
  const start = head.index + head[0].indexOf(head[1])
  return { text: text.slice(0, start) + `[${kind}]` + text.slice(start + head[1].length), kind }
}

/** 사기범이 방금 성함·예금주를 물었으면, 답에 섞인 이름("박선홍 국민은행 …")을 가려요. 거절·질문은 그대로 */
function maskNames(text: string, lastAi: string, types: Set<string>): string {
  text = text.replace(/(제\s?이름은|이름은|성함은)\s*([가-힣]{2,4}?)(?=\s|$|입니다|이에요|예요|요|이고|고|,|\.)/g,
    (m: string, head: string, name: string) => {
      if (!SURNAMES.includes(name[0]) || COMMON_WORDS.has(name)) return m
      types.add("이름")
      return `${head} [이름]`
    })
  if (!NAME_ASK.test(lastAi) || REFUSAL.test(text)) return text
  const tokens = text.match(/[가-힣]+/g) ?? []
  return text.replace(/(?<![가-힣[])([가-힣]{2,3})(입니다|이에요|예요|이요|요|이고|고)?(?![가-힣\]])/g,
    (m: string, word: string, tail?: string) => {
      if (!SURNAMES.includes(word[0]) || COMMON_WORDS.has(word) || (word.length === 2 && tokens.length > 3)) return m
      types.add("이름")
      return "[이름]" + (tail ?? "")
    })
}

export function scrubPersonalInfo(input: string, askedForCode = false,
  context: { lastAi?: string; prevUser?: string } = {}): { text: string; types: string[] } {
  const types = new Set<string>()
  // 이미 가려진 표시가 있으면 그 종류도 셈 (서버·mock 모두 같은 표시를 씀)
  for (const kind of MARKER_TYPES) if (input.includes(`[${kind}]`)) types.add(kind)
  let text = koreanDigitsToArabic(input.normalize("NFKC"))
  const split = maskSplitNumber(text, context.prevUser ?? "")
  text = split.text
  if (split.kind) types.add(split.kind)
  text = text.replace(RRN_PATTERN, () => { types.add("주민등록번호"); return "[주민등록번호]" })
  text = text.replace(CARD_PATTERN, () => { types.add("카드번호"); return "[카드번호]" })
  text = text.replace(SECRET_PATTERN, (_m, key: string, mid: string) => {
    const label = /비밀번호|PIN|pin/.test(key) ? "비밀번호" : "인증번호"
    types.add(label)
    return `${key}${mid}[${label}]`
  })
  text = text.replace(PHONE_PATTERN, () => { types.add("전화번호"); return "[전화번호]" })
  text = text.replace(ACCOUNT_PATTERN, () => { types.add("계좌번호"); return "[계좌번호]" })
  text = text.replace(/(계좌.{0,8}?)(\d{10,14})/g, (_m, head: string) => { types.add("계좌번호"); return `${head}[계좌번호]` })
  text = text.replace(EMAIL_PATTERN, () => { types.add("이메일"); return "[이메일]" })
  text = text.replace(LANDLINE_PATTERN, () => { types.add("전화번호"); return "[전화번호]" })
  text = text.replace(BIRTH_PATTERN, () => { types.add("생년월일"); return "[생년월일]" })
  for (const pattern of ADDRESS_PATTERNS) text = text.replace(pattern, () => { types.add("주소"); return "[주소]" })
  if (types.has("주소")) {
    // "서울시 강남구 [주소] [주소]" → "[주소]"
    text = text.replace(/(?:[가-힣]+(?:특별시|광역시|특별자치시|특별자치도|시|도|구|군)\s*)+(?=\[주소\])/g, "")
      .replace(/(?:\[주소\]\s*){2,}/g, "[주소] ")
  }
  text = maskNames(text, context.lastAi ?? "", types)
  if (askedForCode) text = text.replace(/(^|\D)(\d{4,8})(?!\d)/g, (_m, head: string) => { types.add("인증번호"); return `${head}[인증번호]` })
  // 안전망: 남은 6자리 이상 숫자 (금액 "300000원"은 제외)
  text = text.replace(/(?<!\d)\d(?:[-\s]?\d){5,}(?!\d)(?!\s*원)/g, () => { types.add("숫자정보"); return "[숫자정보]" })
  return { text: text.trim(), types: Array.from(types) }
}
// 피해 대응에서는 본인 민감정보만 가립니다. 상대방 계좌·전화번호는 신고 이력 조회에 쓰이므로 남겨 둡니다.
export function maskSensitive(text: string) {
  return text
    .replace(RRN_PATTERN, "[주민등록번호 가림]")
    .replace(CARD_PATTERN, "[카드번호 가림]")
    .replace(SECRET_PATTERN, (_m, key: string, mid: string, digits: string) => `${key}${mid}${"*".repeat(digits.length)}`)
}
