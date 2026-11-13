import type React from "react"
import type { IconName } from "@/types/common"
import { Icon } from "@/components/Icon"
import { PageIntro } from "@/components/PageIntro"
import type { Scenario } from "@/features/simulation/types"
import type { ConversationAnalysis } from "../types"

export function ReportPage({
  analysis,
  scenario,
  onRetry,
  onEmergency,
  onSave,
  saveNotice,
}: {
  analysis: ConversationAnalysis
  scenario: Scenario
  onRetry: () => void
  onEmergency: () => void
  onSave: () => void
  saveNotice: string
}) {
  const displayScore = analysis.score
  const status = analysis.summary
  return (
    <section className="subpage report-page">
      <div className="container report-container">
        <PageIntro
          kicker="나의 예방 훈련 결과"
          title="나의 금융사기 대응 분석 리포트"
          subtitle="시뮬레이션에서 직접 나눈 대화를 일관된 안전 대응 기준으로 분석하고, 더 안전한 대응 방법을 알려드립니다."
        />
        <div className="report-date">{scenario.title} · 오늘 완료</div>
        <div className="score-card">
          <div className="score-copy">
            <span>종합 분석</span>
            <h2>나의 대응 점수</h2>
            <div className="score-mobile">
              {displayScore}
              <small> / 100점</small>
            </div>
            <h3>{status}</h3>
            <p>
              의심 인식, 민감정보 보호, 공식 경로 확인, 위험 요청 거절, 대화
              종료의 다섯 항목을 각각 20점 기준으로 평가했어요.
            </p>
          </div>
          <div
            className="score-ring"
            style={
              { "--score": `${displayScore * 3.6}deg` } as React.CSSProperties
            }
          >
            <div>
              <strong>{displayScore}</strong>
              <span>/ 100점</span>
            </div>
          </div>
        </div>
        {analysis.leaked && analysis.leaked.length > 0 && (
          <div className="analysis-card caution" role="note" style={{ marginBottom: 20 }}>
            <span className="analysis-icon">
              <Icon name="lock" size={23} />
            </span>
            <h3>훈련 중 입력한 개인정보</h3>
            <p style={{ margin: "8px 0" }}>{analysis.leaked.join(", ")}</p>
            <small style={{ opacity: 0.75 }}>
              입력한 종류만 기록했고, 실제 값은 입력 즉시 삭제되어 어디에도 저장되지 않았어요.
            </small>
          </div>
        )}
        <div className="analysis-grid">
          <article className="analysis-card good">
            <span className="analysis-icon">
              <Icon name="check" size={23} />
            </span>
            <h3>잘한 대응</h3>
            <ul>
              {analysis.safe.slice(0, 3).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </article>
          <article className="analysis-card caution">
            <span className="analysis-icon">
              <Icon name="alert" size={23} />
            </span>
            <h3>주의가 필요한 대응</h3>
            <ul>
              {analysis.risky.slice(0, 3).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </article>
          <article className="analysis-card signal">
            <span className="analysis-icon">
              <Icon name="search" size={23} />
            </span>
            <h3>놓치기 쉬운 사기 신호</h3>
            <ul>
              {analysis.missed.slice(0, 3).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </article>
        </div>
        <div className="guide-card">
          <div className="section-heading left">
            <span>맞춤 예방 안내</span>
            <h2>다음에는 이렇게 대응해 보세요.</h2>
          </div>
          <div className="guide-grid">
            {([
              [
                "building",
                "공식 채널에서 직접 확인하기",
                "메시지 속 연락처 대신 공식 앱과 대표번호를 이용하세요.",
              ],
              [
                "lock",
                "민감한 정보 입력하지 않기",
                "비밀번호와 인증번호는 누구에게도 알려주지 마세요.",
              ],
              [
                "phone",
                "피해가 의심되면 즉시 신고하기",
                "금전 피해가 생겼다면 112와 금융회사에 바로 연락하세요.",
              ],
            ] as [IconName, string, string][]).map(([icon, title, body], i) => (
              <div key={title}>
                <span>
                  <Icon name={icon} />
                </span>
                <small>0{i + 1}</small>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="report-actions no-print">
          <button className="primary-button" onClick={onSave}><Icon name="shield" size={18} /> 내 리포트에 저장</button>
          {saveNotice && <p role="status" className="report-save-notice">{saveNotice}</p>}
          <button className="outline-button" onClick={() => window.print()}>
            <Icon name="download" size={18} /> 인쇄 또는 문서로 저장
          </button>
          <button className="outline-button" onClick={onRetry}>
            <Icon name="refresh" size={17} /> 다시 시뮬레이션 하기
          </button>
          <button className="text-button" onClick={onEmergency}>
            긴급 대응 가이드 보기 <Icon name="arrow" size={17} />
          </button>
          <p>
            인쇄 창에서 문서 저장 기능을 선택하면 한글 리포트를 파일로 보관할 수
            있습니다.
          </p>
        </div>
      </div>
    </section>
  )
}
