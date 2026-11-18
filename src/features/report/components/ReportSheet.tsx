import type { Evaluation } from "@/api"
import { Icon } from "@/components/Icon"

const FRAUD_LABEL: Record<string, string> = {
  SECONDHAND_TRADE: "중고거래",
  SMISHING: "스미싱",
  LOAN_FRAUD: "대출 사기",
  JOB_SCAM: "취업 사기",
  INSTITUTION_IMPERSONATION: "기관 사칭",
}

/** 종합 평가 글을 첫 문장(핵심)과 나머지로 나눠요. 첫 문장만 굵게 보여 주려고 */
function splitLead(text: string): [string, string] {
  const t = (text ?? "").trim()
  const m = t.match(/^(.+?[.!?](?=\s|$))\s*([\s\S]*)$/)
  return m ? [m[1], m[2]] : [t, ""]
}
const formatDay = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`
const toDay = (iso?: string) => {
  if (!iso) return formatDay(new Date())
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : formatDay(d)
}

type Tone = "good" | "warn" | "risk"
type Fact = { label: string; value: string; tone: Tone }

/** 핵심 3칸: 모의 페이지 행동(mockPageEvaluation)과 개인정보 제공 여부(infoDisclosure)로 만들어요 */
function keyFacts(e: Evaluation): Fact[] {
  const m = e.mockPageEvaluation
  const info = e.infoDisclosure
  const facts: Fact[] = []
  if (m) {
    facts.push(m.openedPage ? { label: "외부 링크", value: "링크를 열었어요", tone: "warn" } : { label: "외부 링크", value: "열지 않았어요", tone: "good" })
    facts.push(m.checkedOfficialChannel ? { label: "공식 채널 확인", value: "확인했어요", tone: "good" } : { label: "공식 채널 확인", value: "확인하지 않았어요", tone: "warn" })
  }
  const given = [...(info?.provided ?? []), ...(m?.attemptedMockLogin ? ["로그인 정보"] : [])]
  if (info || m) facts.push(given.length ? { label: "넘긴 개인정보", value: given.join(" · "), tone: "risk" } : { label: "넘긴 개인정보", value: "없어요", tone: "good" })
  return facts
}

/**
 * 훈련 결과 리포트 한 장 (A4 크기). 결과 화면(RPT-01)과 마이페이지 상세(RPT-04)가 같이 써요.
 * 인쇄(PDF로 저장)하면 이 종이 부분만 A4 한 장으로 나와요. 스타일은 index.css의 .rs- 클래스.
 */
export function ReportSheet({ title, fraudTypeCode, completedAt, evaluation }: { title: string; fraudTypeCode?: string; completedAt?: string; evaluation: Evaluation }) {
  const [lead, rest] = splitLead(evaluation.overallFeedback)
  const facts = keyFacts(evaluation)
  const strengths = evaluation.strengths ?? []
  const improvements = evaluation.improvements ?? []
  const recs = evaluation.recommendations ?? []
  const day = toDay(completedAt)
  const type = fraudTypeCode ? FRAUD_LABEL[fraudTypeCode] : undefined
  return (
    <article className="report-sheet">
      <header className="rs-top">
        <span className="rs-brand">어떡하지</span>
        <span className="rs-meta">금융사기 예방 훈련 리포트 · {day}</span>
      </header>

      <div className="rs-title">
        <small>TRAINING REPORT</small>
        <h1>{title}</h1>
        <div className="rs-chips">
          {type && <span className="rs-chip blue">유형 · {type}</span>}
          <span className="rs-chip">완료 · {day}</span>
        </div>
      </div>

      <section className="rs-summary">
        <h2><Icon name="shield" size={18} /> 종합 평가</h2>
        <p className="rs-lead">{lead}</p>
        {rest && <p className="rs-rest">{rest}</p>}
      </section>

      {facts.length > 0 && (
        <div className="rs-facts">
          {facts.map((f) => <div key={f.label}><span>{f.label}</span><strong className={f.tone}>{f.value}</strong></div>)}
        </div>
      )}

      {(strengths.length > 0 || improvements.length > 0) && (
        <div className="rs-two">
          {strengths.length > 0 && (
            <section className="rs-box">
              <h2><span className="rs-icon good"><Icon name="check" size={17} /></span>잘한 점</h2>
              <ul>{strengths.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </section>
          )}
          {improvements.length > 0 && (
            <section className="rs-box">
              <h2><span className="rs-icon warn"><Icon name="alert" size={17} /></span>개선할 점</h2>
              <ul>{improvements.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </section>
          )}
        </div>
      )}

      {recs.length > 0 && (
        <section className="rs-recs">
          <h2>다음에는 이렇게 대응해 보세요</h2>
          {recs.map((x, i) => <div key={i}><span>{i + 1}</span><p>{x}</p></div>)}
        </section>
      )}

      <footer className="rs-foot">
        <span>가상 훈련 대화를 바탕으로 한 분석이며, 실제 피해가 있다면 112 · 1332에 신고하세요.</span>
        <strong>어떡하지</strong>
      </footer>
    </article>
  )
}
