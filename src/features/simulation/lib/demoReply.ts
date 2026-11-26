// ⚠️ mock 전용: 서버 없이 쓸 때 api/mock이 리포트를 만들려고 씁니다. 화면은 이 파일을 직접 쓰지 않아요.
// 규칙 기반 데모 답변. 백엔드 AI 대화 API 연결 시 교체 대상입니다.
import type { Scenario } from "../types"

export const hasSafeEnding = (text: string) =>
  /차단|신고|대화.{0,3}(중단|종료)|연락.{0,3}(그만|중단)|응하지 않|거절|끊겠습니다|공식.{0,12}(확인|문의)|고객센터.{0,8}(확인|문의)|앱.{0,8}확인/.test(
    text,
  )

export const createDemoReply = (message: string, turn: number, scenario: Scenario) => {
  if (hasSafeEnding(message))
    return "알겠습니다. 공식 경로로 확인하거나 대화를 중단하겠다는 뜻을 확인했습니다. 대화는 여기서 종료됩니다."
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
