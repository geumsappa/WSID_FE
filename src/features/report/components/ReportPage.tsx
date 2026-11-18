import { Icon } from "@/components/Icon"
import { PageIntro } from "@/components/PageIntro"
import type { Simulation } from "@/features/simulation/hooks/useSimulation"
import { EvaluationView } from "./EvaluationView"
import { ReportSummary } from "./ReportSummary"

// 훈련 직후 결과 리포트(RPT-01). 저장(RPT-02)과 PDF(RPT-05)도 여기서.
export function ReportPage({ sim, onEmergency }: { sim: Simulation; onEmergency: () => void }) {
  const r = sim.report
  return (
    <section className="subpage report-page">
      <div className="container report-container">
        <PageIntro kicker="나의 예방 훈련 결과" title="나의 금융사기 대응 분석 리포트"
          subtitle="시뮬레이션에서 직접 나눈 대화를 바탕으로 대응을 분석하고, 더 안전한 대응 방법을 알려드립니다." />
        {!r && sim.reportState === "loading" && <div className="loading-card" aria-live="polite"><div className="loader-visual"><Icon name="shield" size={34}/><span/></div><h2>리포트를 불러오고 있어요.</h2></div>}
        {!r && sim.reportState === "missing" && <div className="loading-card" role="alert"><div className="loader-visual"><Icon name="alert" size={34}/></div><h2>표시할 리포트가 없어요.</h2><p>{sim.error || "훈련을 마친 뒤 결과를 볼 수 있어요. 저장한 리포트는 마이페이지에서 확인하세요."}</p><button className="primary-button" onClick={sim.startNew}>새 훈련 시작하기 <Icon name="arrow" size={17}/></button></div>}
        {r && <>
          <div className="report-date">{r.title} · 오늘 완료</div>
          <ReportSummary title={r.title} feedback={r.evaluation.overallFeedback}
            note="개인정보를 넘겼는지, 공식 채널로 확인했는지, 위험한 요청을 거절했는지를 중심으로 대화를 분석했어요." />
          <div style={{ marginTop: 24 }}><EvaluationView evaluation={r.evaluation} /></div>
          <div className="report-actions no-print">
            <button className="primary-button" disabled={sim.saving || r.saved} onClick={() => void sim.saveReport()}><Icon name="shield" size={18} /> {r.saved ? "내 리포트에 저장됨" : sim.saving ? "저장 중..." : "내 리포트에 저장"}</button>
            {sim.saveNotice && <p role="status" className="report-save-notice">{sim.saveNotice}</p>}
            <button className="outline-button" disabled={!r.saved} title={r.saved ? "" : "저장한 뒤 PDF로 받을 수 있어요"} onClick={() => void sim.downloadPdf()}><Icon name="download" size={18} /> PDF로 받기</button>
            <button className="outline-button" onClick={sim.startNew}><Icon name="refresh" size={17} /> 다시 시뮬레이션 하기</button>
            <button className="text-button" onClick={onEmergency}>긴급 대응 가이드 보기 <Icon name="arrow" size={17} /></button>
            <p>{r.saved ? "저장한 리포트는 마이페이지에서 다시 볼 수 있어요. 저장하면 훈련 대화 원문은 삭제돼요." : "리포트를 저장하면 마이페이지에서 다시 보고 PDF로 받을 수 있어요. 저장 시 훈련 대화 원문은 삭제돼요."}</p>
          </div>
        </>}
      </div>
    </section>
  )
}
