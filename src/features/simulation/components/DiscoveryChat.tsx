import { useEffect, useRef, useState } from "react"
import { Icon } from "@/components/Icon"
import { Typing } from "@/components/Typing"
import type { Simulation } from "../hooks/useSimulation"

// 첫 답변 고르기: 흔한 상황을 고르면 그 문장이 첫 답변으로 보내져요. 이후 대화는 평소처럼 이어가요.
const QUICK_STARTS = [
  { label: "택배 문자", text: "택배를 자주 시키고 배송 문자를 자주 받아요. 주소를 확인하라는 문자를 받은 적이 있어요." },
  { label: "중고거래", text: "중고거래 앱으로 물건을 팔고 있어요. 구매자가 앱 밖에서 결제하자고 한 적이 있어요." },
  { label: "가족·지인 사칭", text: "가족과 메신저로 자주 연락해요. 휴대폰이 고장 났다며 모르는 번호로 연락이 온 적이 있어요." },
  { label: "대출 안내", text: "생활비 때문에 대출을 알아보고 있어요. 저금리 대출 안내 문자를 자주 받아요." },
  { label: "보상금·환급 문자", text: "최근 개인정보 유출 뉴스를 봤어요. 피해보상금을 신청하라는 문자를 받은 적이 있어요." },
  { label: "아르바이트 구인", text: "아르바이트를 구하고 있어요. 면접 없이 바로 일할 수 있다는 연락을 받았어요." },
]

// 상황 대화(TRN-04): AI가 묻고 사용자가 답하며 오늘 겪은 상황을 알려 주는 단계.
// 팀 결정: 시뮬레이션에서는 사진 첨부·글자 읽기(OCR, TRN-05)를 쓰지 않아요.
export function DiscoveryChat({ sim }: { sim: Simulation }) {
  const [draft, setDraft] = useState("")
  const endRef = useRef<HTMLDivElement>(null)
  const lines = sim.discoveryLines
  const current = lines[lines.length - 1]
  const options = current?.from === "ai" ? current.options ?? [] : []
  const answered = lines.filter((l) => l.from === "user").length

  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }) }, [lines.length, sim.typing])

  const send = async (value: string) => {
    if (!value.trim() || sim.typing) return
    setDraft("")
    const ok = await sim.sendDiscovery(value)
    if (!ok) setDraft(value) // 실패하면 입력을 되돌려 다시 보낼 수 있게
  }

  return <div className="experience-interview">
    <div className="interview-topline"><strong>오늘 겪은 상황 이야기하기</strong><span>{answered}번 답변{sim.canGenerate ? " · 훈련 준비 가능" : ""}</span></div>
    <p className="interview-help">길게 설명하지 않아도 괜찮아요. 선택지를 고르거나 직접 적어 주세요.</p>
    <div className="interview-thread" aria-live="polite">
      {lines.map((l) => l.from === "ai"
        ? <div className="interview-assistant" key={l.key}><span className="interview-avatar"><Icon name="shield" size={17}/></span><div className="interview-bubble">{l.text}</div></div>
        : <div key={l.key}><div className="interview-user"><span>{l.text}</span></div>{l.note && <small style={{ display: "block", textAlign: "right", opacity: 0.7, marginTop: 4 }}>{l.note}</small>}</div>)}
      {sim.typing && <Typing />}
      <div ref={endRef}/>
    </div>
    {answered === 0 && !sim.typing && (
      <div className="quick-start">
        <strong>비슷한 상황 고르기</strong>
        <span>직접 적기 어렵다면 가까운 상황을 골라 시작해 보세요.</span>
        <div className="interview-choices">
          {QUICK_STARTS.map((q) => <button key={q.label} type="button" onClick={() => void send(q.text)}>{q.label}</button>)}
        </div>
      </div>
    )}
    {options.length > 0 && !sim.typing && <div className="interview-choices">{options.map((o) => <button key={o.code} type="button" onClick={() => void send(o.label)}>{o.label}</button>)}</div>}
    {sim.error && <p className="upload-error" role="alert">{sim.error}</p>}
    <form className="interview-compose" onSubmit={(e) => { e.preventDefault(); void send(draft) }}>
      <input aria-label="상황 답변" placeholder="직접 답변하기..." maxLength={500} value={draft} disabled={sim.typing} onChange={(e) => setDraft(e.target.value)}/>
      <button type="submit" disabled={!draft.trim() || sim.typing}><Icon name="arrow" size={17}/> 답변</button>
    </form>
    {sim.canGenerate && <button type="button" className="primary-button full" disabled={sim.typing} onClick={() => void sim.generateScenario()}>이 상황으로 훈련 시나리오 만들기 <Icon name="spark" size={18}/></button>}
    <div className="privacy"><Icon name="lock" size={16}/><span>입력한 번호·계좌 등 개인정보는 값을 가리고 종류만 남겨요.</span></div>
  </div>
}
