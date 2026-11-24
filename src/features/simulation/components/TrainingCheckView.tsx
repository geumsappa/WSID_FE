import type { MockPage } from "@/api"
import { Icon } from "@/components/Icon"
import type { MockTemplate } from "../data/mockPageTemplates"

type Result = "" | "submitted" | "official" | "closed"
// 모의 페이지 화면 틀 하나. 제목·입력칸·버튼 문구는 template(설정표 data/mockPageTemplates.ts)에서 와요.
export function TrainingCheckView({ page, template: t, loading, busy, error, result, onAction }: {
  page: MockPage | null
  template: MockTemplate
  loading: boolean
  busy: boolean
  error: string
  result: Result
  onAction: (kind: Exclude<Result, "">) => void
}) {
  return <div className="training-check-page">
    <header className="training-check-header"><div className="training-check-container training-check-header-inner">
      <div><strong className="training-check-brand">{page?.institutionName || t.title}</strong><span>{t.service}</span></div>
      <span className="training-check-nav">{t.nav}</span>
    </div></header>
    <main className="training-check-container training-check-main">
      <div className="training-check-heading"><span>{t.kicker}</span><h1>{t.title}</h1><p>{t.lead}</p></div>
      {loading ? <div className="training-check-card" role="status">확인 화면을 준비하고 있습니다.</div>
      : !page ? <div className="training-check-card"><p role="alert">{error || "화면을 열 수 없습니다."}</p><p>원래 대화 탭에서 로그인과 진행 상태를 확인해 주세요.</p></div>
      : <div className="training-check-layout">
        <section className="training-check-card">
          <div className="training-check-section-head"><span>01</span><h2>{t.section}</h2></div>
          <p className="training-check-description">{t.sectionDesc}</p>
          {result === "" ? <form autoComplete="off" onSubmit={(event) => {
            event.preventDefault()
            event.currentTarget.reset()
            onAction("submitted")
          }}>
            {t.fields.map((f) => <label key={f.label}>{f.label}<input type={f.type === "password" ? "password" : "text"} inputMode={f.type === "tel" ? "numeric" : undefined}
              placeholder={f.placeholder} required maxLength={f.maxLength ?? 50} disabled={busy} autoComplete="off" /></label>)}
            <div className="training-check-data-note"><Icon name="lock" size={16} /><span>입력한 값은 어디에도 보내지 않고, 제출했는지만 기록해요.</span></div>
            <button className="training-check-submit" type="submit" disabled={busy}>{busy ? "처리 중..." : t.submit}<Icon name="arrow" size={17} /></button>
            <button className="training-check-verify" type="button" disabled={busy} onClick={() => onAction("official")}>이 요청을 공식 경로로 다시 확인하기</button>
          </form> : <div className="training-check-result" role="status"><Icon name="check" size={26} />
            <h3>{result === "submitted" ? t.submitted : result === "official" ? "공식 경로로 확인하는 선택을 기록했습니다." : "대화 탭으로 돌아가 주세요."}</h3>
            <p>원래 대화 탭으로 돌아가 이어서 대화해 주세요.</p>
          </div>}
          {error && <p className="training-check-error" role="alert">{error}</p>}
          <button className="training-check-return" type="button" disabled={busy} onClick={() => onAction("closed")}>대화로 돌아가기</button>
        </section>
        <aside className="training-check-aside"><h2>진행 안내</h2><ol><li className="active"><span>1</span><div><strong>{t.steps[0].title}</strong><p>{t.steps[0].desc}</p></div></li><li><span>2</span><div><strong>{t.steps[1].title}</strong><p>{t.steps[1].desc}</p></div></li></ol>
          <div className="training-check-aside-note"><Icon name="alert" size={18} /><p>별도 앱 설치, 실제 결제 또는 외부 사이트 이동은 진행하지 않습니다.</p></div>
        </aside>
      </div>}
    </main>
    <footer className="training-check-footer">어떡하지 · {page?.institutionName || "표시된 기관"} 측이 운영하거나 승인한 화면이 아니에요</footer>
  </div>
}
