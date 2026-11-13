import { Icon } from "@/components/Icon"
import { PageIntro } from "@/components/PageIntro"
import { everydayCategories } from "../data/scenarios"
import type { SimulationProps } from "../types"
import { ExperienceInterview } from "./ExperienceInterview"
import { SimulationChat } from "./SimulationChat"

export function SimulationPage(p: SimulationProps) {
  if (p.stage === "chat" || p.stage === "complete") return <SimulationChat {...p} />
  const choosing = p.simMode === "choose"
  return <section className="subpage"><div className="container preparation-container">
    <PageIntro kicker="일상에서 시작하는 금융사기 대응 훈련" title="평범한 일상 속 위험 상황을 미리 경험해 보세요"
      subtitle="내가 겪은 일을 입력하거나 새로운 일상을 선택해, 실제처럼 대화하고 대응 방법을 연습해요." />
    {p.stage === "input" && <div className="input-card simulation-setup simulation-new-flow">
      {choosing ? <>
        <div className="step-label"><span>1</span> 훈련 방법 선택</div>
        <h2>어떤 방식으로 훈련해 볼까요?</h2>
        <p>나의 일상으로 훈련하거나, 처음 접하는 상황을 선택해 볼 수 있어요.</p>
        <div className="simulation-mode-grid">
          <button className="simulation-mode-card" onClick={() => p.setSimMode("mine")}><span className="sim-mode-icon"><Icon name="chat" size={26}/></span><strong>내 경험으로 훈련하기</strong><small>짧은 대화로 최근 경험을 알려주면 상황 3가지를 추천해요.</small><span className="sim-mode-arrow">시작하기 →</span></button>
          <button className="simulation-mode-card" onClick={() => p.setSimMode("discover")}><span className="sim-mode-icon"><Icon name="spark" size={26}/></span><strong>새로운 일상 경험하기</strong><small>일상 카테고리를 선택하면 발생할 수 있는 상황 3가지를 추천해요.</small><span className="sim-mode-arrow">선택하기 →</span></button>
        </div>
      </> : <>
        <button type="button" className="text-button sim-back" onClick={() => {p.setSimMode("choose");p.setEverydayCategory(null)}}>← 훈련 방법 다시 선택</button>
        <div className="step-label"><span>1</span> {p.simMode === "mine" ? "내 경험 입력" : "새로운 일상 선택"}</div>
        {p.simMode === "mine" ? <ExperienceInterview onComplete={p.onInterviewComplete} /> : <>
          <h2>어떤 일상을 경험해 볼까요?</h2><p>익숙한 일상에서 발생할 수 있는 위험 상황을 미리 경험해 보세요.</p>
          <div className="everyday-category-grid">{everydayCategories.map(c => <button key={c.key} aria-pressed={p.everydayCategory===c.key} className={`everyday-category ${p.everydayCategory===c.key ? "selected" : ""}`} onClick={() => p.setEverydayCategory(c.key)}><span><Icon name={c.icon} size={23}/></span><strong>{c.title}</strong><small>{c.description}</small></button>)}</div>
        </>}
        {p.simMode === "discover" && <button className="primary-button full" disabled={!p.everydayCategory} onClick={p.onCreate}>관련 상황 3가지 추천받기 <Icon name="spark" size={18}/></button>}
      </>}
    </div>}
    {p.stage === "loading" && <div className="loading-card" aria-live="polite"><div className="loader-visual"><Icon name="shield" size={34}/><span/></div><h2>관련 상황 3가지를 준비하고 있어요.</h2><p>교육용 시나리오를 일상 맥락에 맞게 추천하고 있습니다.</p><span className="demo-note">현재는 AI 서버가 연결되지 않은 규칙 기반 데모입니다.</span></div>}
    {p.stage === "summary" && <div className="input-card scenario-options-wrap">
      <button className="text-button sim-back" onClick={p.onReset}>← 처음으로</button>
      <div className="step-label"><span>2</span> 상황 선택</div>
      <h2>{p.simMode === "discover" ? `${everydayCategories.find(c=>c.key===p.everydayCategory)?.title ?? "선택한 일상"}에서 일어날 수 있는 상황` : "내 경험을 바탕으로 추천한 상황"}</h2>
      <p>세 가지 가상 상황 중 하나를 골라 실제 대화처럼 훈련해 보세요.</p>
      <div className="sim-scenario-list">{p.scenarioOptions.map((option, index) => <button key={`${option.title}-${index}`} className="sim-scenario-option" onClick={() => p.onStart(option)}><span className="sim-scenario-index">SCENARIO {String(index+1).padStart(2,"0")}</span><strong>{option.title}</strong><span className="sim-scenario-desc">{option.description}</span><span className="sim-scenario-enter">대화 훈련 시작 <Icon name="arrow" size={16}/></span></button>)}</div>
      <div className="demo-disclosure">현재 시나리오 추천 및 대화는 AI API가 연결되지 않은 교육용 데모입니다. 실제 금융기관이나 배송 업체에서 보낸 연락이 아닙니다. 위험 여부는 훈련 후 대응 리포트에서 확인하세요.</div>
      <div className="button-row"><button className="outline-button" onClick={p.onCreate}><Icon name="refresh" size={16}/> 다시 추천받기</button><button className="text-button" onClick={p.onReset}>훈련 방법 바꾸기</button></div>
    </div>}
  </div></section>
}
