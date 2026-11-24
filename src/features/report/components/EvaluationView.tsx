import type { Evaluation } from "@/api"
import { ReportSources } from "./ReportSources"
import { Icon } from "@/components/Icon"
import { TurnReview } from "./TurnReview"

// 리포트 본문. 결과 화면(RPT-01)과 마이페이지 상세(RPT-04)가 같이 써요.
export function EvaluationView({ evaluation, compact = false }: { evaluation: Evaluation; compact?: boolean }) {
  const info = evaluation.infoDisclosure
  const mock = evaluation.mockPageEvaluation
  const strengths = evaluation.strengths ?? []
  const improvements = evaluation.improvements ?? []
  return <>
    {info && (info.requested.length > 0 || info.provided.length > 0) && (
      <div className={`analysis-card ${info.provided.length ? "caution" : "good"}`} role="note" style={{ marginBottom: 20 }}>
        <span className="analysis-icon"><Icon name="lock" size={23} /></span>
        <h3>개인정보 제공 여부</h3>
        <p style={{ margin: "8px 0" }}>
          {info.requested.length > 0 && <>상대가 요구한 정보: <strong>{info.requested.join(", ")}</strong><br /></>}
          {info.provided.length > 0 ? <>실제로 넘긴 정보: <strong>{info.provided.join(", ")}</strong></> : <strong>요구받은 정보를 넘기지 않았어요.</strong>}
        </p>
        <small style={{ opacity: 0.75 }}>어떤 종류를 넘겼는지만 기록했고, 실제 값은 저장하지 않았어요.</small>
      </div>
    )}
    {(strengths.length > 0 || improvements.length > 0) && (
      <div className="analysis-grid">
        {strengths.length > 0 && <article className="analysis-card good"><span className="analysis-icon"><Icon name="check" size={23} /></span><h3>잘한 대응</h3><ul>{strengths.map((x, i) => <li key={i}>{x}</li>)}</ul></article>}
        {improvements.length > 0 && <article className="analysis-card caution"><span className="analysis-icon"><Icon name="alert" size={23} /></span><h3>보완할 점</h3><ul>{improvements.map((x, i) => <li key={i}>{x}</li>)}</ul></article>}
      </div>
    )}
    {mock && (mock.openedPage || mock.attemptedMockLogin || mock.checkedOfficialChannel || mock.clickedAppLink || mock.attemptedTransfer) && (
      <div className="analysis-card signal" style={{ marginTop: 20 }}>
        <span className="analysis-icon"><Icon name="link" size={23} /></span>
        <h3>링크·앱·송금 행동</h3>
        <ul>
          <li>{mock.openedPage ? "링크를 눌러 안내 페이지를 열었어요." : "링크를 열지 않았어요."}</li>
          <li>{mock.attemptedMockLogin ? "링크로 연 화면에 로그인 정보를 입력했어요. 계정이 넘어갈 수 있는 행동이에요." : "로그인 정보를 입력하지 않았어요."}</li>
          <li>{mock.checkedOfficialChannel ? "공식 채널로 확인했어요. 가장 안전한 대응이에요." : "공식 채널 확인은 하지 않았어요."}</li>
          {mock.attemptedTransfer && <li>대화에서 안내받은 계좌로 송금하려 했어요. 돈은 공식 앱의 안전결제로만 보내세요.</li>}
          {mock.clickedAppLink && <li>대화에서 받은 앱 설치 링크를 눌렀어요. 앱은 공식 앱 마켓에서 직접 찾아 설치하세요.</li>}
        </ul>
      </div>
    )}
    {!compact && <TurnReview turnFeedback={evaluation.turnFeedback} style={{ marginTop: 20 }} />}
    {evaluation.recommendations.length > 0 && (
      <div className="guide-card" style={{ marginTop: 20 }}>
        <div className="section-heading left"><span>맞춤 예방 안내</span><h2>다음에는 이렇게 대응해 보세요.</h2></div>
        <div className="guide-grid">{evaluation.recommendations.map((r, i) => <div key={i}><span><Icon name="shield" /></span><small>0{i + 1}</small><p>{r}</p></div>)}</div>
      </div>
    )}
    <ReportSources sources={evaluation.sources} />
  </>
}
