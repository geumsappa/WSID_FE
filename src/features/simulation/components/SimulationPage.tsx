import { useEffect, useState } from "react"
import { authApi, errorMessage } from "@/api"
import { Icon } from "@/components/Icon"
import { Stepper } from "@/components/Stepper"
import { DuoIcon } from "@/components/DuoIcon"
import type { Simulation } from "../hooks/useSimulation"
import { DiscoveryChat } from "./DiscoveryChat"
import { SimulationChat } from "./SimulationChat"


// AI 처리(해외 전송) 동의는 계정에 기록해요(서버 users.ai_consent_version·ai_consent_at).
// 안내 문구를 바꾸면 이 버전을 올려요. 그러면 모든 사용자에게 새 문구로 다시 동의를 받아요.
const CONSENT_VERSION = "v1"
type ConsentState = "checking" | "needed" | "ok"

/** 상황 대화를 시작하기 전에 받는 AI 처리 안내·동의. 입력 내용이 외부 AI로 가기 전에 보여 줘요 */
const CONSENT_ITEMS: { icon: "send" | "lock" | "shield" | "user"; title: string; body: string }[] = [
  { icon: "send", title: "외부 AI로 처리돼요", body: "답변과 훈련 시나리오를 만들기 위해 입력 내용이 OpenAI(해외 서버)로 전송돼요." },
  { icon: "lock", title: "개인정보는 가려서 보내요", body: "주민번호·계좌·카드·전화번호·이메일, 이름·주소는 가린 뒤 보내요." },
  { icon: "shield", title: "원문은 남기지 않아요", body: "서버에는 가린 내용만 저장하고, 리포트를 저장하면 대화 원문은 삭제해요." },
  { icon: "user", title: "지어낸 정보로 해도 괜찮아요", body: "개인정보를 넘기는지 보는 훈련이라, 지어낸 값을 입력해도 결과는 같아요." },
]

function AiConsent({ onAgree }: { onAgree: () => void }) {
  const [checked, setChecked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  // 서버에 동의 기록이 남아야 시작해요 (기록 없이 진행하지 않음)
  const agree = async () => {
    setSaving(true); setError("")
    try {
      await authApi.agreeAiConsent(CONSENT_VERSION)
      onAgree()
    } catch (cause) {
      setError(`동의 기록을 저장하지 못했어요. 다시 눌러 주세요. (${errorMessage(cause)})`)
    } finally { setSaving(false) }
  }
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
      {/* 기본 체크박스는 전역 입력창 스타일이 섞여 어색해서, 숨기고 직접 그린 상자로 보여 줘요 (키보드·화면낭독은 그대로) */}
      <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
      <span className="ai-consent-box" aria-hidden="true"><Icon name="check" size={14} /></span>
      <span>위 내용을 확인했고, 입력 내용의 AI 처리(해외 전송)에 동의해요.</span>
    </label>
    {error && <p className="upload-error" role="alert">{error}</p>}
    <button className="primary-button full" disabled={!checked || saving} onClick={() => void agree()}>
      {saving ? "저장하는 중..." : "동의하고 시작하기"} <Icon name="arrow" size={17} />
    </button>
  </div>
}

// 시뮬레이션 화면 전체. 단계(stage)에 따라 상황 대화 → 시나리오 생성 → 가상 훈련 대화를 보여 줘요.
export function SimulationPage({ sim }: { sim: Simulation }) {
  const [consent, setConsent] = useState<ConsentState>("checking")
  // 계정에 지금 문구 버전으로 동의한 기록이 있는지 확인해요 (계정·기기가 바뀌어도 기준은 계정)
  useEffect(() => {
    let alive = true
    authApi.me()
      .then((me) => { if (alive) setConsent(me.aiConsentVersion === CONSENT_VERSION ? "ok" : "needed") })
      .catch(() => { if (alive) setConsent("needed") })
    return () => { alive = false }
  }, [])
  if (sim.stage === "chat" || sim.stage === "finishing" || sim.stage === "done") return <SimulationChat sim={sim} />
  return <section className="subpage"><div className="container preparation-container">
    <Stepper current={sim.stage === "ready" ? 2 : 1} />
    {sim.stage !== "ready" && <div className="v2-intro">
      <h1>오늘 겪은 일을 알려 주세요</h1>
      <p>짧게 이야기하면, 그 상황에 맞춘 대화 훈련을 만들어 드려요.</p>
    </div>}
    {(sim.stage === "idle" || sim.stage === "loading") && <div className="loading-card" aria-live="polite"><div className="loader-visual"><Icon name="shield" size={34}/><span/></div><h2>훈련을 준비하고 있어요.</h2><p>진행 중인 훈련이 있으면 이어서 보여 드려요.</p></div>}
    {sim.stage === "failed" && <div className="loading-card" role="alert"><div className="loader-visual"><Icon name="alert" size={34}/></div><h2>훈련을 불러오지 못했어요.</h2><p>{sim.error || "서버에 연결할 수 없어요."}</p><div className="button-row" style={{ justifyContent: "center" }}><button className="primary-button" onClick={sim.retry}><Icon name="refresh" size={16}/> 다시 시도</button><button className="text-button" onClick={sim.leave}>홈으로</button></div></div>}
    {sim.stage === "discovery" && <div className="input-card simulation-setup simulation-new-flow">
      {consent === "ok" ? <DiscoveryChat sim={sim} />
        : consent === "needed" ? <AiConsent onAgree={() => setConsent("ok")} />
        : <p className="interview-help" aria-live="polite">확인 중이에요...</p>}
      <button className="outline-button sim-later-button" onClick={sim.leave}>나중에 이어서 하기</button>
    </div>}
    {sim.stage === "generating" && <div className="loading-card" aria-live="polite"><div className="loader-visual"><Icon name="shield" size={34}/><span/></div><h2>맞춤 시나리오를 만들고 있어요.</h2><p>알려 주신 상황을 분석해 훈련 시나리오를 준비하고 있습니다. 최대 1분 정도 걸릴 수 있어요.</p></div>}
    {sim.stage === "ready" && sim.scenario && <div className="input-card scenario-options-wrap">
      <DuoIcon name="shield" size={60} />
      <span className="v2-kicker">맞춤 훈련 시나리오</span>
      <h2>{sim.scenario.title}</h2>
      <p>{sim.scenario.description}</p>
      <div className="demo-disclosure" role="note">
        <div>
          <strong>시작하기 전에 확인해 주세요</strong>
          <ul>
            <li><Icon name="check" size={18}/><span><b>교육용 훈련 상황이에요.</b> 실제 금융기관이나 업체가 보낸 연락이 아니에요.</span></li>
            <li><Icon name="check" size={18}/><span><b>입력한 내용은 개인정보를 가린 뒤 처리돼요.</b> 외부 AI(해외 서버)가 대화를 만들어요.</span></li>
          </ul>
        </div>
      </div>
      {sim.error && <p className="upload-error" role="alert">{sim.error}</p>}
      <button className="primary-button full" disabled={sim.typing} onClick={() => void sim.startTraining()}>{sim.typing ? "훈련을 시작하는 중..." : "대화 훈련 시작하기"} <Icon name="arrow" size={18}/></button>
      <button className="outline-button sim-later-button" onClick={sim.leave}>나중에 이어서 하기</button>
    </div>}
  </div></section>
}
