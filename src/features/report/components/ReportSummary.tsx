import { Icon } from "@/components/Icon"

/** 종합 평가 글을 첫 문장(핵심)과 나머지로 나눠요. 첫 문장만 굵게 강조하려고 */
function splitLead(text: string): [string, string] {
  const t = text.trim()
  const m = t.match(/^(.+?[.!?](?=\s|$))\s*([\s\S]*)$/)
  return m ? [m[1], m[2]] : [t, ""]
}

// 리포트 맨 위 "종합 평가" 카드. 아래 분석 카드들과 같은 흰 카드·아이콘 스타일로 맞췄어요.
export function ReportSummary({ title, feedback, note }: { title: string; feedback: string; note?: string }) {
  const [lead, rest] = splitLead(feedback)
  return (
    <section className="summary-card">
      <div className="summary-head">
        <span className="summary-icon"><Icon name="shield" size={24} /></span>
        <div>
          <small>종합 평가</small>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="summary-body">
        <p className="summary-lead">{lead}</p>
        {rest && <p className="summary-rest">{rest}</p>}
      </div>
      {note && <p className="summary-note"><Icon name="search" size={14} /> {note}</p>}
    </section>
  )
}
