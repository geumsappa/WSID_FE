import { Icon } from "@/components/Icon"
import { DuoIcon } from "@/components/DuoIcon"

// 진행 중인 훈련은 '금융사기 시뮬레이션'을 누르면 이어서 할지 묻는 창이 떠서, 홈에 따로 '이어서 하기' 버튼은 두지 않아요
export function HomePage({
  onSimulation,
  onEmergency,
}: {
  onSimulation: () => void
  onEmergency: () => void
  resume: { title: string; label: string; time: string } | null
  onResume: () => void
  /** 유행 수법 카드의 "이 수법으로 훈련하기"용 (홈에서 카드 뉴스는 뺐어요. 다시 쓰면 trendingScams의 latestScams로) */
  onTrend?: (preset: string) => void
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
                <DuoIcon name="chat" size={46} />
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
                <DuoIcon name="report" size={46} tone="red" />
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
        </div>
      </section>
    </div>
  )
}
