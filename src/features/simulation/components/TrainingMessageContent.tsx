import { Fragment } from "react"
import type { MockPage } from "@/api"

export const containsMockLink = (text: string) => /\[모의\s*링크\]/.test(text)

/**
 * Internal link markers become local buttons; never render an external URL.
 * 서버가 이 메시지에 mockPage 정보를 안 붙여 줘도 버튼은 눌려야 해요.
 * 확인 페이지(TrainingCheckPage)가 훈련 번호로 모의 페이지 정보를 직접 불러오기 때문이에요.
 */
export function TrainingMessageContent({ text, page, disabled, onOpen }: {
  text: string
  page?: MockPage
  disabled: boolean
  onOpen: (page?: MockPage) => void
}) {
  const parts = text.split(/\[모의\s*링크\]/g)
  return <p>{parts.map((part, index) => <Fragment key={index}>
    {part}
    {index < parts.length - 1 && <button type="button" className="simulation-inline-link"
      disabled={disabled} onClick={() => onOpen(page)}>
      {page?.title || "본인 확인하기"}
    </button>}
  </Fragment>)}</p>
}
