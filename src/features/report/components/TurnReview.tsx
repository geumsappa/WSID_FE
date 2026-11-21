import type React from "react"
import type { TurnFeedback } from "@/api"
import { toTextItems } from "@/lib/normalize"

/** AI가 준 타임라인 항목 중 모양이 맞는 것만 답변 순서대로 골라요 */
export function timelineOf(list: unknown): TurnFeedback[] {
  if (!Array.isArray(list)) return []
  return list
    .filter((x): x is TurnFeedback => {
      const t = x as Partial<TurnFeedback> | null
      return !!t && typeof t.turn === "number" && (t.outcome === "safe" || t.outcome === "risky")
        && typeof t.userAction === "string" && typeof t.feedback === "string"
    })
    .sort((a, b) => a.turn - b.turn)
}

/**
 * 대화 되짚어 보기(턴별 피드백). 결과 화면·마이페이지 상세·평가 화면이 같이 써요.
 * AI가 준 순간별 판정(turn·위험/잘 막음·행동·피드백)을 보여 주고, 예전 형식이면 글만 보여 줘요.
 * A4 리포트 종이(ReportSheet)가 잘리지 않게 종이 밖에 따로 두고, 인쇄에서는 빠져요.
 */
export function TurnReview({ turnFeedback, className = "", style }: {
  turnFeedback: unknown
  className?: string
  style?: React.CSSProperties
}) {
  const timeline = timelineOf(turnFeedback)
  const legacy = timeline.length ? [] : toTextItems(turnFeedback)
  if (!timeline.length && !legacy.length) return null
  return (
    <div className={`guide-card ${className}`.trim()} style={style}>
      <div className="section-heading left"><span>대화 되짚어 보기</span><h2>턴별 피드백</h2></div>
      {timeline.length > 0 ? (
        <ol className="turn-review">
          {timeline.map((t) => (
            <li key={t.turn} className={t.outcome}>
              <span className="turn-review-no">{t.turn}번째 답변</span>
              <div>
                <h4><em>{t.outcome === "risky" ? "위험" : "잘 막음"}</em>{t.userAction}</h4>
                <p>{t.feedback}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="action-steps">{legacy.map((t, i) => <div key={i}><span>{i + 1}</span><div>{t.title && <h4>{t.title}</h4>}<p>{t.body}</p></div></div>)}</div>
      )}
    </div>
  )
}
