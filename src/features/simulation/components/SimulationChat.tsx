import { useEffect, useRef, useState } from "react"
import { USE_MOCK } from "@/api"
import { Icon } from "@/components/Icon"
import { DuoIcon, type DuoIconName } from "@/components/DuoIcon"
import { Stepper } from "@/components/Stepper"
import type { Simulation } from "../hooks/useSimulation"
import { MockPhotoPreview } from "./MockPhotoPreview"
import { TrainingCheckPage } from "./TrainingCheckPage"
import { containsMockLink, splitSpeaker, TrainingMessageContent } from "./TrainingMessageContent"

const MAX_TURNS = 15 // 명세 초안: 전체 최대 15턴
// 채널에 따라 대화창 머리글에 보여 줄 말 (실제 앱 이름·로고는 쓰지 않아요)
const CHANNEL_LABEL: Record<string, string> = {
  SMS: "문자 메시지", MESSENGER: "메신저", MARKET: "중고거래 채팅", EMAIL: "이메일", SNS: "SNS 메시지",
}

const CHANNEL_ICON: Record<string, DuoIconName> = { SMS: "smishing", MESSENGER: "acquaintance", MARKET: "trade", EMAIL: "chat", SNS: "chat" }

// 가상 훈련 대화(TRN-07~11): 가상 사기범과 대화하며 대응을 연습하는 단계.
export function SimulationChat({ sim }: { sim: Simulation }) {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const lines = sim.chatLines
  const last = lines[lines.length - 1]
  const finished = sim.stage === "done" || sim.stage === "finishing"
  const progress = Math.min(MAX_TURNS, sim.turnCount)
  const senderName = sim.scenario?.senderName || "상대방"
  const channel = sim.scenario?.channel ?? "MESSENGER"
  // 사기범 쪽 담당자가 중간에 바뀌면([화자: ...]) 그 뒤 말풍선의 보낸 사람 이름도 바꿔요
  let speaker = senderName
  const rows = lines.map((m) => {
    if (m.from !== "ai") return { m, name: "나", text: m.text }
    const split = splitSpeaker(m.text)
    if (split.speaker) speaker = split.speaker
    return { m, name: speaker, text: split.body }
  })
  const currentSpeaker = speaker
  const disclaimer = sim.scenario?.organizationName
    ? `${sim.scenario.organizationName} 측이 운영하거나 승인한 서비스가 아닙니다. 실제 해당 기관과 무관한 훈련 대화입니다.`
    : "실제 기관이나 인물이 운영하거나 승인한 서비스가 아닌 교육용 훈련 대화입니다."

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
      {sim.checkOpen && sim.trainingId !== null && (
        <div className="training-check-modal" role="dialog" aria-modal="true" aria-label="훈련용 확인 화면"
          onClick={sim.closeMockPage}>
          <div className="training-check-modal-body" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="training-check-modal-close" aria-label="닫기" onClick={sim.closeMockPage}>
              <Icon name="close" size={18} />
            </button>
            <TrainingCheckPage trainingId={sim.trainingId} onClose={sim.closeMockPage} />
          </div>
        </div>
      )}
      <div className="container v2-stepper-wrap"><Stepper current={3} /></div>
      <div className="container chat-layout">
        <aside className="scenario-sidebar">
          <span className="sidebar-kicker">지금 연습 중인 상황</span>
          <div className="sidebar-icon"><DuoIcon name={CHANNEL_ICON[channel] ?? "chat"} size={52} /></div>
          <h1>{sim.scenario?.title ?? "맞춤 훈련 시나리오"}</h1>
          <p>{sim.scenario?.description ?? "오늘 알려 주신 상황을 바탕으로 만든 훈련 대화예요."}</p>
          <div className="progress-head"><strong>진행</strong><span>{progress} / {MAX_TURNS}번째 대화</span></div>
          <div className="progress-bar"><span style={{ width: `${(progress / MAX_TURNS) * 100}%` }} /></div>
          <div className="education-notice">
            <Icon name="lock" size={18} />
            <p>이 대화는 금융사기 예방을 위한 훈련용 시뮬레이션입니다. 실제 금융기관이나 개인과 연결되지 않으며, 입력한 개인정보 값은 저장하지 않고 종류만 기록해요.</p>
          </div>
          {!finished && <button className="outline-button" disabled={sim.typing} onClick={() => sim.setEndConfirm(true)}>훈련 마치고 결과 보기</button>}
        </aside>
        <div className={`messenger channel-${channel.toLowerCase()}`}>
          <div className="messenger-header">
            <div>
              <h2>{senderName}</h2>
              {/* 초록불: AI 서버 연결 상태(테스트 확인용). mock 모드면 주황불 */}
              <p><span className={USE_MOCK ? "mock" : undefined} title={USE_MOCK ? "mock 모드 (서버 없음)" : "AI 연결됨"}
                aria-label={USE_MOCK ? "mock 모드" : "AI 연결됨"} /> {CHANNEL_LABEL[channel] ?? "메신저"}</p>
            </div>
            <span className="header-shield v2-badge">훈련용</span>
          </div>
          <div className="training-disclaimer" role="note">
            <Icon name="shield" size={18} />
            <div><strong>사기 예방을 위한 훈련입니다.</strong><p>{disclaimer}</p></div>
          </div>
          <div className="messages" ref={scrollRef} aria-live="polite">
            {rows.map(({ m, name, text }) => (
              <div className={`message-row ${m.from === "ai" ? "contact" : "user"}`} key={m.key}>
                {m.from === "ai" && <span className="avatar"><DuoIcon name={CHANNEL_ICON[channel] ?? "chat"} size={26} tone="gray" /></span>}
                <div>
                  <span className="sender">{name}</span>
                  {text && (m.from === "ai"
                    ? <TrainingMessageContent text={text} page={m.mockPage} disabled={finished || sim.typing}
                        onOpen={(page) => void sim.showMockPage(page)}
                        appClicked={m.appClicked} onAppClick={() => void sim.clickMockApp(m.key)}
                        transferDone={m.transferDone} onTransfer={() => void sim.clickMockTransfer(m.key)} holder={name} />
                    : <p>{text}</p>)}
                  {m.mockAttachment && <MockPhotoPreview attachment={m.mockAttachment} />}
                  {m.mockPage && !containsMockLink(m.text) && (
                    <button type="button" className="outline-button" style={{ marginTop: 8, padding: "9px 13px", fontSize: 12 }} disabled={finished || sim.typing} onClick={() => void sim.showMockPage(m.mockPage!)}>
                      <Icon name="link" size={15} /> 안내 페이지 열기 ({m.mockPage.institutionName})
                    </button>
                  )}
                  {m.note && <small style={{ display: "block", opacity: 0.7 }}>{m.note}</small>}
                </div>
              </div>
            ))}
            {/* 답장 기다리는 중: 상대방 말풍선과 같은 자리·모양(아바타, 이름, 말풍선)으로 점 세 개를 보여 줘요 */}
            {sim.typing && (
              <div className="message-row contact" role="status" aria-label={`${currentSpeaker}이(가) 답장을 쓰고 있어요`}>
                <span className="avatar"><DuoIcon name={CHANNEL_ICON[channel] ?? "chat"} size={26} tone="gray" /></span>
                <div>
                  <span className="sender">{currentSpeaker}</span>
                  <div className="typing-dots"><i /><i /><i /></div>
                </div>
              </div>
            )}
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
              {/* 서버가 주는 빠른 답변 버튼(availableOptions)은 보여 주지 않아요: 사용자가 직접 판단해 입력하게 */}
              {sim.error && <p className="upload-error" role="alert">{sim.error}</p>}
              <div className="chat-input-row">
                <textarea rows={1} maxLength={500} value={input} disabled={sim.typing}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit() } }}
                  placeholder="상대방에게 보낼 답변을 입력해 주세요. 실제 정보 대신 지어낸 정보로 답해도 돼요." />
                <button disabled={!input.trim() || sim.typing} onClick={() => void submit()}><Icon name="send" size={17} /> 전송</button>
              </div>
              <p className="chat-input-hint"><Icon name="lock" size={13} /> 지어낸 정보를 입력해도 훈련 결과는 같아요. 개인정보는 가린 뒤 AI로 보내요.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
