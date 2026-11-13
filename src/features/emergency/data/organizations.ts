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
