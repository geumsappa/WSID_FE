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
    <div className="training-check-banner" role="note"><Icon name="shield" size={19} />
      <div><strong>어떡하지 · 사기 예방을 위한 훈련용 화면</strong>
        <p>{page?.institutionName || "화면에 표시되는 기관"} 측이 운영하거나 승인한 서비스가 아닙니다. 실제 기관과 무관합니다.</p>
      </div>
    </div>
    <header className="training-check-header"><div className="training-check-container training-check-header-inner">
      <div><strong className="training-check-brand">{page?.institutionName || t.title}</strong><span>{t.service}</span></div>
      <span className="training-check-nav">{t.nav}</span>
    </div></header>
    <main className="training-check-container training-check-main">
      <div className="training-check-heading"><span>{t.kicker}</span><h1>{t.title}</h1><p>{t.lead}</p></div>
      {loading ? <div className="training-check-card" role="status">확인 화면을 준비하고 있습니다.</div>
      : !page ? <div className="training-check-card"><p role="alert">{error || "화면을 열 수 없습니다."}</p><p>원래 훈련 탭에서 로그인과 진행 상태를 확인해 주세요.</p></div>
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
            <div className="training-check-data-note"><Icon name="lock" size={16} /><span>실제 정보 대신 연습용 값을 입력하세요. 입력값은 서버나 AI로 보내지 않고, 제출 행동만 기록합니다.</span></div>
            <button className="training-check-submit" type="submit" disabled={busy}>{busy ? "처리 중..." : t.submit}<Icon name="arrow" size={17} /></button>
            <button className="training-check-verify" type="button" disabled={busy} onClick={() => onAction("official")}>이 요청을 공식 경로로 다시 확인하기</button>
          </form> : <div className="training-check-result" role="status"><Icon name="check" size={26} />
            <h3>{result === "submitted" ? t.submitted : result === "official" ? "공식 경로로 확인하는 선택을 기록했습니다." : "훈련 대화 탭으로 돌아가 주세요."}</h3>
            <p>원래 훈련 대화 탭으로 돌아가 다음 안내를 확인해 주세요. 선택한 행동은 훈련 리포트에 반영됩니다.</p>
          </div>}
          {error && <p className="training-check-error" role="alert">{error}</p>}
          <button className="training-check-return" type="button" disabled={busy} onClick={() => onAction("closed")}>훈련 대화로 돌아가기</button>
        </section>
        <aside className="training-check-aside"><h2>진행 안내</h2><ol><li className="active"><span>1</span><div><strong>{t.steps[0].title}</strong><p>{t.steps[0].desc}</p></div></li><li><span>2</span><div><strong>{t.steps[1].title}</strong><p>{t.steps[1].desc}</p></div></li></ol>
          <div className="training-check-aside-note"><Icon name="alert" size={18} /><p>별도 앱 설치, 실제 결제 또는 외부 사이트 이동은 진행하지 않습니다.</p></div>
        </aside>
      </div>}
    </main>
    <footer className="training-check-footer">어떡하지 · 금융사기 예방 교육용 훈련 페이지</footer>
  </div>
}
