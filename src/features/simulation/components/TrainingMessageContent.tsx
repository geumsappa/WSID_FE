import { Fragment } from "react"
import type { MockPage } from "@/api"

export const containsMockLink = (text: string) => /\[모의\s*링크\]/.test(text)

/** Internal link markers become local buttons; never render an external URL. */
export function TrainingMessageContent({ text, page, disabled, onOpen }: {
  text: string
  page?: MockPage
  disabled: boolean
  onOpen: (page: MockPage) => void
}) {
  const parts = text.split(/\[모의\s*링크\]/g)
  return <p>{parts.map((part, index) => <Fragment key={index}>
    {part}
    {index < parts.length - 1 && <button type="button" className="simulation-inline-link"
      disabled={disabled || !page} onClick={() => { if (page) onOpen(page) }}>
      {page?.title || "본인 확인하기"}
    </button>}
  </Fragment>)}</p>
}
