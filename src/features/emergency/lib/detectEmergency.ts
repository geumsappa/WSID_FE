// ⚠️ mock 전용: 서버 없이 쓸 때 api/mock이 리포트를 만들려고 씁니다. 화면은 이 파일을 직접 쓰지 않아요.
// 규칙 기반 상황 분류. 백엔드 AI 분석 API 연결 시 교체 대상입니다.
import type { EmergencyKey } from "../types"

// 입력한 설명에서 해당하는 상황을 모두 찾습니다. 순서가 곧 우선순위입니다(송금이 가장 급함).
export const emergencyRules: [EmergencyKey, RegExp, RegExp?][] = [
  ["transfer", /송금|이체|(돈|계좌).{0,25}보냈|(\d|만 ?원|천 ?원).{0,10}(보냈|보냄|입금|줬)|입금했|입금을 했/, /(송금|이체|입금).{0,4}(안|않)/],
  ["privacy", /개인정보|신분증|비밀번호|인증번호|주민등록|OTP|보안카드|가림\]/i, /(알려|보내|입력|제공).{0,4}(안|않)/],
  ["app", /앱.{0,6}(설치|깔)|설치했|설치를 했|apk|원격.{0,4}(앱|프로그램)/i, /설치.{0,4}(안|않)/],
  ["link", /링크|url|주소.{0,4}(눌|클릭|접속)|눌렀|클릭했/i, /(누르|눌|클릭).{0,4}(안|않)/],
  ["call", /전화|사칭|검찰|경찰|은행 직원|금감원|수사관/],
  ["trade", /중고|판매자|물품|당근|번개장터|중고나라|직거래/],
]
export function detectEmergencyKeys(text: string): EmergencyKey[] {
  const keys = emergencyRules
    .filter(([, match, negated]) => match.test(text) && !(negated && negated.test(text) && !match.test(text.replace(negated, ""))))
    .map(([key]) => key)
  return keys.length ? keys : ["custom"]
}
export function mergeEmergencyKeys(current: EmergencyKey[], added: EmergencyKey[]): EmergencyKey[] {
  const base = current.filter((key) => key !== "custom")
  const next = [...base, ...added.filter((key) => key !== "custom" && !base.includes(key))]
  return next.length ? next : current
}
