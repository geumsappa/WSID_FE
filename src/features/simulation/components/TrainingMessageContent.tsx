import { Fragment } from "react"
import type { MockPage } from "@/api"
import { Icon } from "@/components/Icon"

export const containsMockLink = (text: string) => /\[모의\s*링크\]/.test(text)

const SPEAKER = /^\s*\[화자\s*[:：]\s*([^\]\n]{1,40})\]\s*/
const MARKER = /(\[모의\s*링크\]|\[모의\s*앱\]|\[모의\s*계좌\])/g

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
export function TrainingMessageContent({ text, page, disabled, onOpen, appClicked, onAppClick, transferDone, onTransfer, holder }: {
  text: string
  page?: MockPage
  disabled: boolean
  onOpen: (page?: MockPage) => void
  appClicked?: boolean
  onAppClick?: () => void
  /** [모의계좌] 카드: 송금 버튼을 눌렀는지, 누를 때, 예금주로 보여 줄 이름 */
  transferDone?: boolean
  onTransfer?: () => void
  holder?: string
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
          <small>{appClicked ? "다운로드를 눌렀어요" : "앱 설치 링크"}</small>
        </span>
        <Icon name="download" size={17} />
      </button>
    }
    if (/^\[모의\s*계좌\]$/.test(part)) {
      // 실제 사기범이 보내는 입금 계좌 안내처럼 보이게. 번호는 가려서 실제로 쓸 수 없어요
      // 카드 전체가 버튼이에요. 한 번 누르면 송금한 것으로 기록돼요 (실제 돈은 나가지 않음)
      return <button key={index} type="button" className={`simulation-account-card${transferDone ? " done" : ""}`}
        disabled={disabled || transferDone || !onTransfer} onClick={() => onTransfer?.()}>
        <span className="simulation-account-head"><Icon name="building" size={16} /> 입금 계좌 안내</span>
        <strong>한빛은행 ●●●-●●●●-●●●●</strong>
        <small>예금주 {holder || "상대방"}</small>
        <span className="simulation-account-action">
          {transferDone ? "송금했어요" : "눌러서 송금하기"}
        </span>
      </button>
    }
    return <Fragment key={index}>{part}</Fragment>
  })}</p>
}
