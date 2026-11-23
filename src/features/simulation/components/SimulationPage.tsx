import { useState } from "react"
import { Icon } from "@/components/Icon"
import { PageIntro } from "@/components/PageIntro"
import type { Simulation } from "../hooks/useSimulation"
import { DiscoveryChat } from "./DiscoveryChat"
import { SimulationChat } from "./SimulationChat"


// AI 처리(해외 전송) 동의는 이 브라우저에 한 번 기억해요. 문구를 바꾸면 키 뒤 버전을 올려 다시 묻게 해요
const CONSENT_KEY = "wsid-ai-consent-v1"
const readConsent = () => { try { return localStorage.getItem(CONSENT_KEY) === "yes" } catch { return false } }
const saveConsent = () => { try { localStorage.setItem(CONSENT_KEY, "yes") } catch { /* 저장이 안 돼도 이번엔 진행 */ } }

/** 상황 대화를 시작하기 전에 받는 AI 처리 안내·동의. 입력 내용이 외부 AI로 가기 전에 보여 줘요 */
const CONSENT_ITEMS: { icon: "send" | "lock" | "shield" | "user"; title: string; body: string }[] = [
  { icon: "send", title: "외부 AI로 처리돼요", body: "답변과 훈련 시나리오를 만들기 위해 입력 내용이 OpenAI(해외 서버)로 전송돼요." },
  { icon: "lock", title: "개인정보는 가려서 보내요", body: "주민번호·계좌·카드·전화번호·이메일, 이름·주소는 가린 뒤 보내요." },
  { icon: "shield", title: "원문은 남기지 않아요", body: "서버에는 가린 내용만 저장하고, 리포트를 저장하면 대화 원문은 삭제해요." },
  { icon: "user", title: "가상 정보로 해도 괜찮아요", body: "개인정보를 넘기는지 보는 훈련이라, 지어낸 값을 입력해도 결과는 같아요." },
]

function AiConsent({ onAgree }: { onAgree: () => void }) {
  const [checked, setChecked] = useState(false)
  return <div className="ai-consent" role="region" aria-label="AI 처리 안내">
    <div className="ai-consent-head">
      <strong>시작 전에 확인해 주세요</strong>
      <p>입력한 내용이 어떻게 처리되는지 안내해 드려요.</p>
    </div>
    <ul className="ai-consent-items">
      {CONSENT_ITEMS.map((item) => (
        <li key={item.title}>
          <span className="ai-consent-icon"><Icon name={item.icon} size={17} /></span>
          <div><strong>{item.title}</strong><p>{item.body}</p></div>
        </li>
      ))}
    </ul>
    <label className={`ai-consent-check${checked ? " checked" : ""}`}>
      <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
      <span>위 내용을 확인했고, 입력 내용의 AI 처리(해외 전송)에 동의해요.</span>
    </label>
    <button className="primary-button full" disabled={!checked} onClick={() => { saveConsent(); onAgree() }}>
      동의하고 시작하기 <Icon name="arrow" size={17} />
    </button>
  </div>
}

// 시뮬레이션 화면 전체. 단계(stage)에 따라 상황 대화 → 시나리오 생성 → 가상 훈련 대화를 보여 줘요.
export function SimulationPage({ sim }: { sim: Simulation }) {
  const [consented, setConsented] = useState(readConsent)
  if (sim.stage === "chat" || sim.stage === "finishing" || sim.stage === "done") return <SimulationChat sim={sim} />
  return <section className="subpage"><div className="container preparation-container">
    <PageIntro kicker="일상에서 시작하는 금융사기 대응 훈련" title={"오늘 겪은 상황을 알려 주시면\n맞춤 훈련을 만들어 드려요"}
      subtitle="짧은 대화로 상황을 파악한 뒤, 그 상황에 맞는 가상 사기범과 실제처럼 대화하며 대응 방법을 연습해요." />
    {(sim.stage === "idle" || sim.stage === "loading") && <div className="loading-card" aria-live="polite"><div className="loader-visual"><Icon name="shield" size={34}/><span/></div><h2>훈련을 준비하고 있어요.</h2><p>진행 중인 훈련이 있으면 이어서 보여 드려요.</p></div>}
    {sim.stage === "failed" && <div className="loading-card" role="alert"><div className="loader-visual"><Icon name="alert" size={34}/></div><h2>훈련을 불러오지 못했어요.</h2><p>{sim.error || "서버에 연결할 수 없어요."}</p><div className="button-row" style={{ justifyContent: "center" }}><button className="primary-button" onClick={sim.retry}><Icon name="refresh" size={16}/> 다시 시도</button><button className="text-button" onClick={sim.leave}>홈으로</button></div></div>}
    {sim.stage === "discovery" && <div className="input-card simulation-setup simulation-new-flow">
      <div className="step-label"><span>1</span> 상황 파악</div>
      {consented ? <DiscoveryChat sim={sim} /> : <AiConsent onAgree={() => setConsented(true)} />}
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
            <li>대화 중 상대가 <b>개인정보를 요구할 수 있어요.</b></li>
            <li><b>실제 값은 입력하지 마세요.</b> 가상 정보를 입력해도 훈련 결과는 같아요. "모르겠어요"로 답해도 충분해요.</li>
            <li>입력 내용은 개인정보를 가린 뒤 외부 AI(해외 서버)로 처리돼요.</li>
          </ul>
        </div>
      </div>
      {sim.error && <p className="upload-error" role="alert">{sim.error}</p>}
      <button className="primary-button full" disabled={sim.typing} onClick={() => void sim.startTraining()}>{sim.typing ? "훈련을 시작하는 중..." : "대화 훈련 시작"} <Icon name="arrow" size={18}/></button>
      <button className="outline-button sim-later-button" onClick={sim.leave}>나중에 이어서 하기</button>
    </div>}
  </div></section>
}
