import { Fragment } from "react"
import type { MockPage } from "@/api"
import { Icon } from "@/components/Icon"

export const containsMockLink = (text: string) => /\[모의\s*링크\]/.test(text)

const SPEAKER = /^\s*\[화자\s*[:：]\s*([^\]\n]{1,40})\]\s*/
const MARKER = /(\[모의\s*링크\]|\[모의\s*앱\])/g

/**
 * 사기범 쪽 담당자가 바뀌면 AI가 대사 앞에 [화자: 이름/역할]을 붙여요.
 * 그 표시는 떼어 내고, 보낸 사람 이름으로 보여 줘요. (예: "박서연/보안관리팀" → "박서연 · 보안관리팀")
 */
export function splitSpeaker(text: string): { speaker?: string; body: string } {
  const match = text.match(SPEAKER)
  if (!match) return { body: text }
  const speaker = match[1].split("/").map((part) => part.trim()).filter(Boolean).join(" · ")
  return { speaker: speaker || undefined, body: text.slice(match[0].length) }
}

/**
 * Internal link markers become local buttons; never render an external URL.
 * 서버가 이 메시지에 mockPage 정보를 안 붙여 줘도 버튼은 눌려야 해요.
 * 확인 페이지(TrainingCheckPage)가 훈련 번호로 모의 페이지 정보를 직접 불러오기 때문이에요.
 * [모의앱]은 앱 설치 카드로 보여 줘요. 누르면 눌렀다는 사실만 기록하고 실제로 아무것도 설치하지 않아요.
 */
export function TrainingMessageContent({ text, page, disabled, onOpen, appClicked, onAppClick }: {
  text: string
  page?: MockPage
  disabled: boolean
  onOpen: (page?: MockPage) => void
  appClicked?: boolean
  onAppClick?: () => void
}) {
  const parts = text.split(MARKER)
  return <p>{parts.map((part, index) => {
    if (/^\[모의\s*링크\]$/.test(part)) {
      return <button key={index} type="button" className="simulation-inline-link"
        disabled={disabled} onClick={() => onOpen(page)}>
        {page?.title || "본인 확인하기"}
      </button>
    }
    if (/^\[모의\s*앱\]$/.test(part)) {
      return <button key={index} type="button" className="simulation-app-card"
        disabled={disabled || appClicked || !onAppClick} onClick={() => onAppClick?.()}>
        <span className="simulation-app-icon"><Icon name="app" size={20} /></span>
        <span className="simulation-app-text">
          <strong>설치 파일 받기</strong>
          <small>{appClicked ? "눌렀어요 · 훈련용 가상 앱이라 설치되지 않았어요" : "앱 설치 링크"}</small>
        </span>
        <Icon name="download" size={17} />
      </button>
    }
    return <Fragment key={index}>{part}</Fragment>
  })}</p>
}
