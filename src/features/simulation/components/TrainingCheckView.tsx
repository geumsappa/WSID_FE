import type { MockPage } from "@/api"
import { Icon } from "@/components/Icon"

type Result = "" | "submitted" | "official" | "closed"
export function TrainingCheckView({ page, loading, busy, error, result, onAction }: {
  page: MockPage | null
  loading: boolean
  busy: boolean
  error: string
  result: Result
  onAction: (kind: Exclude<Result, "">) => void
}) {
  const title = "지원자 확인"
  return <div className="training-check-page">
    <div className="training-check-banner" role="note"><Icon name="shield" size={19} />
      <div><strong>어떡하지 · 사기 예방을 위한 가상 훈련 화면</strong>
        <p>{page?.institutionName || "화면에 표시되는 기관"} 측이 운영하거나 승인한 서비스가 아닙니다. 실제 기관과 무관합니다.</p>
      </div>
    </div>
    <header className="training-check-header"><div className="training-check-container training-check-header-inner">
      <div><strong className="training-check-brand">{page?.institutionName || "지원자 서비스"}</strong><span>RECRUITMENT SERVICE</span></div>
      <span className="training-check-nav">{title}</span>
    </div></header>
    <main className="training-check-container training-check-main">
      <div className="training-check-heading"><span>APPLICANT VERIFICATION</span><h1>{title}</h1><p>원활한 전형 안내를 위해 지원자 정보를 확인해 주세요.</p></div>
      {loading ? <div className="training-check-card" role="status">확인 화면을 준비하고 있습니다.</div>
      : !page ? <div className="training-check-card"><p role="alert">{error || "화면을 열 수 없습니다."}</p><p>원래 훈련 탭에서 로그인과 진행 상태를 확인해 주세요.</p></div>
      : <div className="training-check-layout">
        <section className="training-check-card">
          <div className="training-check-section-head"><span>01</span><h2>지원자 정보 확인</h2></div>
          <p className="training-check-description">아래 내용을 확인하고 본인 확인 절차를 진행해 주세요.</p>
          {result === "" ? <form autoComplete="off" onSubmit={(event) => {
            event.preventDefault()
            event.currentTarget.reset()
            onAction("submitted")
          }}>
            <label>지원자 이름<input type="text" placeholder="이름을 입력해 주세요" required maxLength={50} disabled={busy} autoComplete="off" /></label>
            <label>지원자 번호<input type="text" placeholder="지원자 번호를 입력해 주세요" required maxLength={100} disabled={busy} autoComplete="off" /></label>
            <label>확인 비밀번호<input type="password" placeholder="확인 비밀번호를 입력해 주세요" required maxLength={128} disabled={busy} autoComplete="off" /></label>
            <div className="training-check-data-note"><Icon name="lock" size={16} /><span>연습용 이름·번호·비밀번호를 입력하세요. 입력값은 서버나 AI로 보내지 않고, 제출 행동만 기록합니다.</span></div>
            <button className="training-check-submit" type="submit" disabled={busy}>{busy ? "처리 중..." : "본인 확인 진행"}<Icon name="arrow" size={17} /></button>
            <button className="training-check-verify" type="button" disabled={busy} onClick={() => onAction("official")}>이 요청을 공식 경로로 다시 확인하기</button>
          </form> : <div className="training-check-result" role="status"><Icon name="check" size={26} />
            <h3>{result === "submitted" ? "확인 요청이 접수되었습니다." : result === "official" ? "공식 경로로 확인하는 선택을 기록했습니다." : "훈련 대화 탭으로 돌아가 주세요."}</h3>
            <p>원래 훈련 대화 탭으로 돌아가 다음 안내를 확인해 주세요. 선택한 행동은 훈련 리포트에 반영됩니다.</p>
          </div>}
          {error && <p className="training-check-error" role="alert">{error}</p>}
          <button className="training-check-return" type="button" disabled={busy} onClick={() => onAction("closed")}>훈련 대화로 돌아가기</button>
        </section>
        <aside className="training-check-aside"><h2>진행 안내</h2><ol><li className="active"><span>1</span><div><strong>지원자 확인</strong><p>확인 정보 검토 및 요청</p></div></li><li><span>2</span><div><strong>다음 절차 안내</strong><p>훈련 대화에서 이어서 진행</p></div></li></ol>
          <div className="training-check-aside-note"><Icon name="alert" size={18} /><p>별도 앱 설치, 실제 결제 또는 외부 사이트 이동은 진행하지 않습니다.</p></div>
        </aside>
      </div>}
    </main>
    <footer className="training-check-footer">어떡하지 · 금융사기 예방 교육용 가상 페이지</footer>
  </div>
}
