/**
 * 요즘 유행하는 수법 (홈 카드). 공공기관이 최근 발령한 소비자경보·보도자료를 팀이 직접 확인해 요약한 목록이에요.
 *
 * 모으는 방법 (지금은 수동, 월 1회 갱신 권장):
 *  1) 금융위원회 보도자료·금융감독원 소비자경보, KISA 보호나라 보안공지, 경찰청 안내에서 새 경보 확인
 *  2) 수법을 우리 말로 1~2문장 요약 (원문 문장을 그대로 옮기지 않음), 출처 주소·날짜 기록
 *  3) preset: 이 수법으로 훈련할 때 첫 답변으로 보낼 상황 문장 (사용자가 겪었을 법한 일반적인 상황)
 *  4) 같은 수법을 AI 사례 DB(WSID_AI/app/data/fraud_cases.yaml)에도 넣으면 시나리오 근거로 쓰여요
 * 나중에는 위 기관 목록을 주기적으로 읽어 AI가 요약 초안을 만들고, 팀이 검토한 뒤 반영하는 방식으로 넓힐 수 있어요.
 */
export type TrendingScam = {
  id: string
  date: string // 경보·보도 날짜 (최신순 정렬에 사용)
  issuer: string
  title: string
  summary: string
  sourceUrl: string
  sourceLabel: string
  preset: string
}

export const TRENDING_SCAMS: TrendingScam[] = [
  {
    id: "2026-10-leak-loan",
    date: "2026-10-06",
    issuer: "금융위원회·금융감독원 소비자경보(주의)",
    title: "개인정보 유출을 틈탄 피해보상·대출 안내 사기",
    summary: "금융권 유출 사고를 미끼로 피해보상이나 대출 상담을 해 준다며 연락해, 선입금·앱 설치·기존 대출 상환을 요구해요.",
    sourceUrl: "https://eiec.kdi.re.kr/policy/materialView.do?num=287844",
    sourceLabel: "금융위원회 보도자료 (KDI 경제정보센터 게시)",
    preset: "최근 금융권 개인정보 유출 뉴스를 봤어요. 피해보상이나 대출 상담을 해 주겠다는 연락을 받은 적이 있어요.",
  },
  {
    id: "2026-09-delivery-fine",
    date: "2026-09-20",
    issuer: "금융위원회·금융감독원 소비자경보",
    title: "명절 택배 배송 오류·교통 범칙금 사칭 문자",
    summary: "배송 오류나 범칙금 미납을 알리는 문자 속 링크를 누르면 원격제어 앱이 깔리고, 모르는 사이 대출·계좌 개설이 이뤄져요.",
    sourceUrl: "https://www.imaeil.com/page/view/2026092115165949797",
    sourceLabel: "매일신문 보도 (금융당국 경보 내용)",
    preset: "택배를 자주 받아요. 배송 오류나 범칙금 미납을 알리는 문자를 받은 적이 있어요.",
  },
  {
    id: "2026-02-exchange-reward",
    date: "2026-02-12",
    issuer: "금융위원회 소비자경보 2026-7호",
    title: "가상자산 거래소 오지급 보상 안내 사칭 문자",
    summary: "거래소 사고 보상금을 준다며 링크로 악성 앱을 깔게 하고, 고객센터 번호로 위장해 전화까지 걸어요.",
    sourceUrl: "https://www.fsc.go.kr/no010101/86271",
    sourceLabel: "금융위원회 보도참고자료",
    preset: "가상자산 거래소를 써요. 사고 보상금을 지급한다는 문자를 받은 적이 있어요.",
  },
]

/** 최신순으로 n개 */
export const latestScams = (n = 2) => [...TRENDING_SCAMS].sort((a, b) => b.date.localeCompare(a.date)).slice(0, n)
