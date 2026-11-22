import type { OrganizationKey } from "../types"

export const organizationData: Record<OrganizationKey, { name: string; desc: string; action: string; href: string; mark: string }> = {
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
    href: "https://www.fss.or.kr/fss/main/sub1.do?menuNo=201287",
    mark: "금융",
  },
  kisa: {
    name: "한국인터넷진흥원 118",
    desc: "스미싱, 악성앱 등 정보보호 상담",
    action: "공식 상담 안내 보기",
    href: "https://www.kisa.kr/118",
    mark: "118",
  },
  counterscam: {
    name: "보이스피싱 통합대응단 1394",
    desc: "보이스피싱 신고·상담·제보 한 번에",
    action: "1394 전화하기",
    href: "tel:1394",
    mark: "1394",
  },
  pd: {
    name: "개인정보노출자 사고예방시스템",
    desc: "노출된 내 명의로 계좌 개설·대출 차단",
    action: "공식 사이트 이동",
    href: "https://pd.fss.or.kr",
    mark: "노출",
  },
  payinfo: {
    name: "계좌정보통합관리서비스",
    desc: "모르는 계좌·대출 확인과 일괄 지급정지",
    action: "공식 사이트 이동",
    href: "https://www.payinfo.or.kr",
    mark: "계좌",
  },
  msafer: {
    name: "엠세이퍼 명의도용 방지",
    desc: "내 명의 휴대폰 개통 조회·차단",
    action: "공식 사이트 이동",
    href: "https://www.msafer.or.kr",
    mark: "명의",
  },
}
