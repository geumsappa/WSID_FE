import { Icon } from "@/components/Icon"
import { PageIntro } from "@/components/PageIntro"
import { Stepper } from "@/components/Stepper"
import type { Simulation } from "@/features/simulation/hooks/useSimulation"
import { printAsPdf } from "@/lib/print"
import { ReportSheet } from "./ReportSheet"
import { TurnReview } from "./TurnReview"

// 훈련 직후 결과 리포트(RPT-01). 저장(RPT-02)도 여기서.
// 리포트는 A4 한 장 크기 종이(ReportSheet)로 보여 주고, "PDF로 저장"은 그 종이만 인쇄해요(서버 PDF RPT-05 대신).
export function ReportPage({ sim, onEmergency }: { sim: Simulation; onEmergency: () => void }) {
  const r = sim.report
  return (
    <section className="subpage report-page">
      <div className="container report-container">
        <div className="no-print">
          <Stepper current={4} />
          <PageIntro kicker="나의 예방 훈련 결과" title="나의 금융사기 대응 분석 리포트"
            subtitle="직접 나눈 대화를 바탕으로 대응을 분석하고, 더 안전한 대응 방법을 알려드립니다." />
        </div>
        {!r && sim.reportState === "loading" && <div className="loading-card" aria-live="polite"><div className="loader-visual"><Icon name="shield" size={34}/><span/></div><h2>리포트를 불러오고 있어요.</h2></div>}
        {!r && sim.reportState === "missing" && <div className="loading-card" role="alert"><div className="loader-visual"><Icon name="alert" size={34}/></div><h2>표시할 리포트가 없어요.</h2><p>{sim.error || "훈련을 마친 뒤 결과를 볼 수 있어요. 저장한 리포트는 마이페이지에서 확인하세요."}</p><button className="primary-button" onClick={sim.startNew}>새 훈련 시작하기 <Icon name="arrow" size={17}/></button></div>}
        {r && <div className="report-sheet-wrap">
          <ReportSheet title={r.title} fraudTypeCode={r.fraudTypeCode} evaluation={r.evaluation} />
          <TurnReview turnFeedback={r.evaluation.turnFeedback} className="no-print" style={{ maxWidth: 794, margin: "22px auto 0" }} />
          <div className="report-actions no-print">
            <button className="primary-button" disabled={sim.saving || r.saved} onClick={() => void sim.saveReport()}><Icon name="shield" size={18} /> {r.saved ? "내 리포트에 저장됨" : sim.saving ? "저장 중..." : "내 리포트에 저장"}</button>
            {sim.saveNotice && <p role="status" className="report-save-notice">{sim.saveNotice}</p>}
            <button className="outline-button" title="인쇄 창에서 대상을 'PDF로 저장'으로 고르세요" onClick={() => printAsPdf(`어떡하지 리포트 - ${r.title}`)}><Icon name="download" size={18} /> PDF로 저장</button>
            <button className="outline-button" onClick={sim.startNew}><Icon name="refresh" size={17} /> 다시 훈련하기</button>
            <button className="text-button" onClick={onEmergency}>긴급 대응 가이드 보기 <Icon name="arrow" size={17} /></button>
            <p>{r.saved ? "저장한 리포트는 마이페이지에서 다시 볼 수 있어요. 저장하면 훈련 대화 원문은 삭제돼요." : "리포트를 저장하면 마이페이지에서 다시 볼 수 있어요. 저장 시 훈련 대화 원문은 삭제돼요."} PDF는 인쇄 창에서 'PDF로 저장'을 고르면 A4 한 장으로 받을 수 있어요.</p>
          </div>
        </div>}
      </div>
    </section>
  )
}
