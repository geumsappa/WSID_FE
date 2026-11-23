import { Icon } from "@/components/Icon"
import { PageIntro } from "@/components/PageIntro"
import type { Simulation } from "../hooks/useSimulation"
import { DiscoveryChat } from "./DiscoveryChat"
import { SimulationChat } from "./SimulationChat"


// 시뮬레이션 화면 전체. 단계(stage)에 따라 상황 대화 → 시나리오 생성 → 가상 훈련 대화를 보여 줘요.
export function SimulationPage({ sim }: { sim: Simulation }) {
  if (sim.stage === "chat" || sim.stage === "finishing" || sim.stage === "done") return <SimulationChat sim={sim} />
  return <section className="subpage"><div className="container preparation-container">
    <PageIntro kicker="일상에서 시작하는 금융사기 대응 훈련" title={"오늘 겪은 상황을 알려 주시면\n맞춤 훈련을 만들어 드려요"}
      subtitle="짧은 대화로 상황을 파악한 뒤, 그 상황에 맞는 가상 사기범과 실제처럼 대화하며 대응 방법을 연습해요." />
    {(sim.stage === "idle" || sim.stage === "loading") && <div className="loading-card" aria-live="polite"><div className="loader-visual"><Icon name="shield" size={34}/><span/></div><h2>훈련을 준비하고 있어요.</h2><p>진행 중인 훈련이 있으면 이어서 보여 드려요.</p></div>}
    {sim.stage === "failed" && <div className="loading-card" role="alert"><div className="loader-visual"><Icon name="alert" size={34}/></div><h2>훈련을 불러오지 못했어요.</h2><p>{sim.error || "서버에 연결할 수 없어요."}</p><div className="button-row" style={{ justifyContent: "center" }}><button className="primary-button" onClick={sim.retry}><Icon name="refresh" size={16}/> 다시 시도</button><button className="text-button" onClick={sim.leave}>홈으로</button></div></div>}
    {sim.stage === "discovery" && <div className="input-card simulation-setup simulation-new-flow">
      <div className="step-label"><span>1</span> 상황 파악</div>
      <DiscoveryChat sim={sim} />
      <button className="outline-button sim-later-button" onClick={sim.leave}>나중에 이어서 하기</button>
    </div>}
    {sim.stage === "generating" && <div className="loading-card" aria-live="polite"><div className="loader-visual"><Icon name="shield" size={34}/><span/></div><h2>맞춤 시나리오를 만들고 있어요.</h2><p>알려 주신 상황을 분석해 훈련 시나리오를 준비하고 있습니다. 최대 1분 정도 걸릴 수 있어요.</p></div>}
    {sim.stage === "ready" && sim.scenario && <div className="input-card scenario-options-wrap">
      <div className="step-label"><span>2</span> 훈련 시나리오</div>
      <h2>{sim.scenario.title}</h2>
      <p>{sim.scenario.description}</p>
      <div className="demo-disclosure" role="note">
        <span className="demo-disclosure-icon"><Icon name="alert" size={20}/></span>
        <div>
          <strong>훈련 시작 전에 꼭 확인하세요</strong>
          <ul>
            <li>이 시나리오는 <b>교육용 가상 상황</b>이에요. 실제 금융기관이나 업체에서 보낸 연락이 아니에요.</li>
          </ul>
        </div>
      </div>
      {sim.error && <p className="upload-error" role="alert">{sim.error}</p>}
      <button className="primary-button full" disabled={sim.typing} onClick={() => void sim.startTraining()}>{sim.typing ? "훈련을 시작하는 중..." : "대화 훈련 시작"} <Icon name="arrow" size={18}/></button>
      <button className="outline-button sim-later-button" onClick={sim.leave}>나중에 이어서 하기</button>
    </div>}
  </div></section>
}
