// 규칙 기반 데모 분석. 백엔드 AI 분석 API 연결 시 교체 대상입니다.
import type { SimulationMessage } from "@/features/simulation/types"
import { hasSafeEnding } from "@/features/simulation/lib/demoReply"
import type { ConversationAnalysis } from "../types"

export const analyzeConversation = (
  messages: SimulationMessage[],
): ConversationAnalysis => {
  const text = messages
    .filter((m) => m.from === "user")
    .map((m) => m.text)
    .join(" ")
  // 훈련 중 입력한 개인정보 종류(실제 값은 이미 지워진 상태)
  const leaked = Array.from(new Set(messages.flatMap((m) => m.leaked ?? [])))
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
  const risky = [
    ...(leaked.length
      ? [`대화 중 ${leaked.join(", ")}을(를) 상대에게 보냈어요. 실제 상황이었다면 바로 피해로 이어질 수 있어요.`]
      : []),
    ...riskyPatterns.filter(([pattern]) => pattern.test(text)).map(([, label]) => label),
  ]
  if (leaked.length) checks.protected = false
  const safe = [
    checks.recognized && "연락의 수상한 점을 인식하고 의심을 표현했어요.",
    checks.protected && "민감한 개인정보를 제공하지 않겠다고 밝혔어요.",
    checks.verified && "공식 앱이나 고객센터 등 독립된 경로로 확인하려 했어요.",
    checks.refused && "안전하지 않은 요청을 분명하게 거절했어요.",
    checks.ended && "의심스러운 대화를 중단하거나 신고·차단하려 했어요.",
  ].filter(Boolean) as string[]
  const missed = [
    leaked.length > 0 &&
      "금융기관·택배사·회사는 대화나 메시지로 주민등록번호, 계좌·카드번호, 비밀번호, 인증번호를 요구하지 않아요.",
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
    leaked,
  }
}
