import { Icon } from "@/components/Icon"

export function HomePage({
  onSimulation,
  onEmergency,
  resume,
  onResume,
}: {
  onSimulation: () => void
  onEmergency: () => void
  resume: { title: string; label: string; time: string } | null
  onResume: () => void
}) {
  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-orb one" />
        <div className="hero-orb two" />
        <div className="container hero-inner">
          <h1>
            금융사기,
            <br />
            미리 경험하고 <em>빠르게 대응하세요.</em>
          </h1>
          <p>필요한 서비스를 선택해 바로 시작하세요.</p>
          <div className="home-actions" aria-label="주요 서비스">
            <button onClick={onSimulation}>
              <span className="home-action-icon">
                <Icon name="chat" size={34} />
              </span>
              <span className="home-action-copy">
                <strong>금융사기 시뮬레이션</strong>
                <small>
                  실제처럼 체험하고, 금융사기 대응 능력을 키워보세요.
                </small>
              </span>
              <span className="home-action-arrow">
                <Icon name="arrow" size={22} />
              </span>
            </button>
            <button className="emergency-action" onClick={onEmergency}>
              <span className="home-action-icon">
                <Icon name="alert" size={34} />
              </span>
              <span className="home-action-copy">
                <strong>긴급 대응</strong>
                <small>
                  사기가 의심된다면 지금 필요한 대응 방법을 확인하세요.
                </small>
              </span>
              <span className="home-action-arrow">
                <Icon name="arrow" size={22} />
              </span>
            </button>
          </div>
          {resume && (
            <button
              type="button"
              className="home-resume"
              onClick={onResume}
              aria-label={`진행 중인 훈련 이어서 하기: ${resume.title}`}
              style={{ margin: "24px auto 0", alignSelf: "center", width: "100%", maxWidth: 560, display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 18, border: "1px solid rgba(37,99,235,.25)", background: "#fff", color: "#0f172a", textAlign: "left", cursor: "pointer", boxShadow: "0 10px 30px rgba(15,23,42,.08)" }}
            >
              <span className="home-action-icon" style={{ flexShrink: 0 }}>
                <Icon name="refresh" size={26} />
              </span>
              <span style={{ display: "grid", gap: 3, flex: 1, minWidth: 0 }}>
                <strong>이어서 하기</strong>
                <small style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{resume.title}</small>
                <small style={{ opacity: 0.7 }}>{resume.label} · 마지막 진행 {resume.time}</small>
              </span>
              <Icon name="arrow" size={20} />
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
