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
export function scrubPersonalInfo(input: string, askedForCode = false): { text: string; types: string[] } {
  const types = new Set<string>()
  let text = input
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
  if (askedForCode) text = text.replace(/(^|\D)(\d{4,8})(?!\d)/g, (_m, head: string) => { types.add("인증번호"); return `${head}[인증번호]` })
  return { text, types: Array.from(types) }
}
// 피해 대응에서는 본인 민감정보만 가립니다. 상대방 계좌·전화번호는 신고 이력 조회에 쓰이므로 남겨 둡니다.
export function maskSensitive(text: string) {
  return text
    .replace(RRN_PATTERN, "[주민등록번호 가림]")
    .replace(CARD_PATTERN, "[카드번호 가림]")
    .replace(SECRET_PATTERN, (_m, key: string, mid: string, digits: string) => `${key}${mid}${"*".repeat(digits.length)}`)
}
