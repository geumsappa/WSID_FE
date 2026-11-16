import { useEffect, useRef, useState } from "react"
import { USE_MOCK } from "@/api"
import { Icon } from "@/components/Icon"
import { Typing } from "@/components/Typing"
import type { Simulation } from "../hooks/useSimulation"
import { MockPageModal } from "./MockPageModal"

const MAX_TURNS = 15 // 명세 초안: 전체 최대 15턴

// 가상 훈련 대화(TRN-07~11): 가상 사기범과 대화하며 대응을 연습하는 단계.
export function SimulationChat({ sim }: { sim: Simulation }) {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const lines = sim.chatLines
  const last = lines[lines.length - 1]
  const options = last?.from === "ai" ? last.options ?? [] : []
  const finished = sim.stage === "done" || sim.stage === "finishing"
  const progress = Math.min(MAX_TURNS, sim.turnCount)

  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" })
  }, [lines, sim.typing, sim.stage])

  const submit = async () => {
    if (!input.trim() || sim.typing) return
    const value = input
    setInput("")
    const ok = await sim.sendTraining({ text: value })
    if (!ok) setInput(value)
  }

  return (
    <section className="chat-page">
      {sim.openMockPage && <MockPageModal page={sim.openMockPage} onAction={(code) => sim.recordAction(code, sim.openMockPage!)} onClose={sim.closeMockPage} />}
      <div className="container chat-layout">
        <aside className="scenario-sidebar">
          <span className="sidebar-kicker">현재 체험 중인 상황</span>
          <div className="sidebar-icon"><Icon name="shield" size={26} /></div>
          <h1>{sim.scenario?.title ?? "맞춤 훈련 시나리오"}</h1>
          <p>{sim.scenario?.description ?? "오늘 알려 주신 상황을 바탕으로 만든 가상 대화예요."}</p>
          <div className="progress-head"><strong>진행 턴</strong><span>{progress} / {MAX_TURNS}</span></div>
          <div className="progress-bar"><span style={{ width: `${(progress / MAX_TURNS) * 100}%` }} /></div>
          <div className="education-notice">
            <Icon name="lock" size={18} />
            <p>이 대화는 금융사기 예방을 위한 가상 시뮬레이션입니다. 실제 금융기관이나 개인과 연결되지 않으며, 입력한 개인정보 값은 저장하지 않고 종류만 기록해요.</p>
          </div>
          {!finished && <button className="outline-button" disabled={sim.typing} onClick={() => sim.setEndConfirm(true)}><Icon name="close" size={17} /> 훈련 종료하고 결과 보기</button>}
        </aside>
        <div className="messenger">
          <div className="messenger-header">
            <div>
              <h2>가상 대화 시뮬레이션</h2>
              <p><span /> {USE_MOCK ? "mock 모드 (서버 없음)" : "AI 훈련 연결됨"}</p>
            </div>
            <span className="header-shield"><Icon name="shield" size={22} /></span>
          </div>
          <div className="messages" ref={scrollRef} aria-live="polite">
            {lines.map((m) => (
              <div className={`message-row ${m.from === "ai" ? "contact" : "user"}`} key={m.key}>
                {m.from === "ai" && <span className="avatar"><Icon name="chat" size={18} /></span>}
                <div>
                  <span className="sender">{m.from === "ai" ? "의심스러운 연락" : "나"}</span>
                  {m.text && <p>{m.text}</p>}
                  {m.mockPage && (
                    <button type="button" className="outline-button" style={{ marginTop: 8, padding: "9px 13px", fontSize: 12 }} onClick={() => void sim.showMockPage(m.mockPage!)}>
                      <Icon name="link" size={15} /> 안내 페이지 열기 ({m.mockPage.institutionName})
                    </button>
                  )}
                  {m.note && <small style={{ display: "block", opacity: 0.7 }}>{m.note}</small>}
                </div>
              </div>
            ))}
            {sim.typing && <Typing />}
            {sim.stage === "finishing" && (
              <div className="complete-card"><span><Icon name="refresh" size={26} /></span><h3>결과를 분석하고 있어요.</h3><p>대화 내용을 바탕으로 리포트를 만드는 중이에요. 잠시만 기다려 주세요.</p></div>
            )}
            {sim.stage === "done" && (
              <div className="complete-card"><span><Icon name="check" size={26} /></span><h3>훈련이 종료되었습니다.</h3><p>대화 내용을 바탕으로 대응 결과를 분석했어요.</p><button className="primary-button" onClick={() => void sim.finish()}>결과 분석 리포트 보기 <Icon name="arrow" size={18} /></button></div>
            )}
            {sim.stage === "chat" && sim.shouldFinish && !sim.typing && (
              <div className="complete-card"><span><Icon name="check" size={26} /></span><h3>여기서 훈련을 마칠 수 있어요.</h3><p>대응을 충분히 보여 주셨어요. 계속 대화하거나 지금 결과를 확인하세요.</p><button className="primary-button" onClick={() => void sim.finish()}>결과 분석 리포트 보기 <Icon name="arrow" size={18} /></button></div>
            )}
          </div>
          {sim.stage === "chat" && (
            <div className="simulation-chat-input">
              {options.length > 0 && !sim.typing && <div className="interview-choices" style={{ margin: "0 0 10px" }}>{options.map((o) => <button key={o.code} type="button" onClick={() => void sim.sendTraining({ option: o })}>{o.label}</button>)}</div>}
              <div className="privacy"><Icon name="lock" size={15} /><span>상대가 요구해도 실제 개인정보를 적을 필요는 없어요. 넘겼는지 여부만 리포트에 반영되고 값은 저장하지 않아요.</span></div>
              {sim.error && <p className="upload-error" role="alert">{sim.error}</p>}
              <div className="chat-input-row">
                <textarea rows={1} maxLength={500} value={input} disabled={sim.typing}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit() } }}
                  placeholder="상대방에게 보낼 답변을 직접 입력해 주세요." />
                <button disabled={!input.trim() || sim.typing} onClick={() => void submit()}><Icon name="send" size={17} /> 전송</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
