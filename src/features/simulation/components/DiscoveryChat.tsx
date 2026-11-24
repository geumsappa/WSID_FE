import { useEffect, useRef, useState } from "react"
import { Icon } from "@/components/Icon"
import { Typing } from "@/components/Typing"
import { DuoIcon, type DuoIconName } from "@/components/DuoIcon"
import { HelperAvatar } from "@/components/HelperAvatar"
import type { Simulation } from "../hooks/useSimulation"

// 선택지는 대화 주제만 전달해요. 실제 역할·경험·연락 내용은 이어지는 대화에서 확인해요.
const QUICK_STARTS: { label: string; icon: DuoIconName; text: string }[] = [
  { label: "택배·배송", icon: "smishing", text: "택배나 배송 이야기를 하고 싶어요." },
  { label: "중고거래", icon: "trade", text: "중고거래 이야기를 하고 싶어요." },
  { label: "가족·지인 연락", icon: "acquaintance", text: "가족이나 지인과의 연락 이야기를 하고 싶어요." },
  { label: "대출", icon: "loan", text: "대출 이야기를 하고 싶어요." },
  { label: "보상금·환급", icon: "institution", text: "보상금이나 환급 이야기를 하고 싶어요." },
  { label: "아르바이트", icon: "idcheck", text: "아르바이트 이야기를 하고 싶어요." },
]

// 상황 대화(TRN-04): AI가 묻고 사용자가 답하며 오늘 겪은 상황을 알려 주는 단계.
// 팀 결정: 시뮬레이션에서는 사진 첨부·글자 읽기(OCR, TRN-05)를 쓰지 않아요.
export function DiscoveryChat({ sim }: { sim: Simulation }) {
  const [draft, setDraft] = useState("")
  const endRef = useRef<HTMLDivElement>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const lines = sim.discoveryLines
  const current = lines[lines.length - 1]
  const options = current?.from === "ai" ? current.options ?? [] : []
  const answered = lines.filter((l) => l.from === "user").length

  // 대화는 채팅 상자 안에서만 스크롤돼요 (페이지 전체가 움직이지 않게)
  useEffect(() => { const t = threadRef.current; if (t) t.scrollTo({ top: t.scrollHeight, behavior: "smooth" }) }, [lines.length, sim.typing])

  // 홈의 유행 수법 카드로 들어왔으면, 그 상황 문장을 첫 답변으로 한 번 보내요 (이후는 평소 대화)
  useEffect(() => {
    if (!sim.pendingPreset || answered > 0 || sim.typing || sim.stage !== "discovery") return
    const preset = sim.pendingPreset
    sim.clearPreset()
    void send(preset)
  }, [sim.pendingPreset, answered, sim.typing, sim.stage]) // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (value: string) => {
    if (!value.trim() || sim.typing) return
    setDraft("")
    const ok = await sim.sendDiscovery(value)
    if (!ok) setDraft(value) // 실패하면 입력을 되돌려 다시 보낼 수 있게
  }

  return <div className="experience-interview">
    {/* v2: 위 페이지 제목과 겹치는 머리글·안내 문구는 뺐어요 (글을 줄여 어르신이 읽기 쉽게) */}
    <div className="interview-thread" ref={threadRef} aria-live="polite">
      {lines.map((l) => l.from === "ai"
        ? <div className="interview-assistant" key={l.key}><span className="interview-avatar v2-avatar"><HelperAvatar size={36}/></span><div className="interview-bubble">{l.text}</div></div>
        : <div key={l.key}><div className="interview-user"><span>{l.text}</span></div>{l.note && <small style={{ display: "block", textAlign: "right", opacity: 0.7, marginTop: 4 }}>{l.note}</small>}</div>)}
      {sim.typing && <Typing />}
      <div ref={endRef}/>
    </div>
    {answered === 0 && !sim.typing && (
      <div className="quick-start">
        <strong>비슷한 상황 고르기</strong>
        <div className="interview-choices">
          {QUICK_STARTS.map((q) => <button key={q.label} type="button" onClick={() => void send(q.text)}><DuoIcon name={q.icon} size={32}/><span>{q.label}</span></button>)}
        </div>
      </div>
    )}
    {/* 첫 질문은 위 '비슷한 상황 고르기'와 겹쳐서 서버·mock이 주는 선택지를 숨겨요. 두 번째 질문부터 보여요 */}
    {answered > 0 && options.length > 0 && !sim.typing && <div className="interview-choices">{options.map((o) => <button key={o.code} type="button" onClick={() => void send(o.label)}>{o.label}</button>)}</div>}
    {sim.error && <p className="upload-error" role="alert">{sim.error}</p>}
    <form className="interview-compose" onSubmit={(e) => { e.preventDefault(); void send(draft) }}>
      <input aria-label="상황 답변" placeholder="직접 답변하기..." maxLength={500} value={draft} disabled={sim.typing} onChange={(e) => setDraft(e.target.value)}/>
      <button type="submit" disabled={!draft.trim() || sim.typing}><Icon name="arrow" size={17}/> 답변</button>
    </form>
    {sim.canGenerate && <button type="button" className="primary-button full" disabled={sim.typing} onClick={() => void sim.generateScenario()}>훈련 시나리오 만들기 <Icon name="arrow" size={18}/></button>}
  </div>
}
