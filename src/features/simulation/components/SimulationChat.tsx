import { Fragment, useEffect, useRef, useState } from "react"
import { USE_MOCK } from "@/api"
import { Icon } from "@/components/Icon"
import { DuoIcon, type DuoIconName } from "@/components/DuoIcon"
import { Stepper } from "@/components/Stepper"
import type { Simulation } from "../hooks/useSimulation"
import { MockPhotoPreview } from "./MockPhotoPreview"
import { TrainingCheckPage } from "./TrainingCheckPage"
import { containsMockLink, firstItem, splitSpeaker, TrainingMessageContent } from "./TrainingMessageContent"
import { ItemThumb } from "./ScamImageCard"

// 사기범이 대화방을 나갈 때 AI 서버가 마지막 대사 끝에 붙이는 표시 (돈을 받았거나 사용자가 끊었을 때)
const LEFT_MARK = /\s*\[퇴장\]\s*/g
// 채널에 따라 대화창 머리글에 보여 줄 말 (실제 앱 이름·로고는 쓰지 않아요)
const CHANNEL_LABEL: Record<string, string> = {
  SMS: "문자 메시지", MESSENGER: "메신저", MARKET: "중고거래 채팅", EMAIL: "이메일", SNS: "SNS 메시지",
}

const CHANNEL_ICON: Record<string, DuoIconName> = { SMS: "smishing", MESSENGER: "acquaintance", MARKET: "trade", EMAIL: "chat", SNS: "chat" }
// 가족·지인 사칭인지 (낯선 번호 안내, 반말 재촉에 써요)
const FAMILY = /엄마|아빠|어머니|아버지|딸|아들|자녀|언니|오빠|누나|형님|동생|이모|삼촌|고모|며느리|사위|손주|손녀|손자|지인|친구|가족/
// 답이 없을 때 상대가 재촉하는 말 (실제 사기범은 답이 없으면 바로 다시 연락해요)
const NUDGE_AFTER_MS = 60_000
function nudgeLines(channel: string, family: boolean): string[] {
  if (family) return ["바빠? 급해서 그래 ㅠㅠ", "답장 좀 해 줘. 지금 꼭 해야 돼"]
  if (channel === "MARKET") return ["혹시 거래 안 하실 건가요? 다른 분도 연락 와서요", "확인하시면 답 주세요! 오늘 안에 정리하려고요"]
  return ["고객님, 확인되셨을까요?", "오늘 중 처리되지 않으면 진행이 어려워서요. 답변 부탁드립니다."]
}
// 대사에서 처음 나온 금액 (중고거래 상품 카드의 가격으로 써요)
const PRICE = /(\d{1,3}(?:,\d{3})+\s?원|\d+\s?만\s?원|\d+\s?천\s?원)/

// 가상 훈련 대화(TRN-07~11): 가상 사기범과 대화하며 대응을 연습하는 단계.
export function SimulationChat({ sim }: { sim: Simulation }) {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const lines = sim.chatLines
  const last = lines[lines.length - 1]
  const finished = sim.stage === "done" || sim.stage === "finishing"
  const senderName = sim.scenario?.senderName || "상대방"
  const channel = sim.scenario?.channel ?? "MESSENGER"
  // 사기범 쪽 담당자가 중간에 바뀌면([화자: ...]) 그 뒤 말풍선의 보낸 사람 이름도 바꾸고, "○○님이 대화에 참여했어요"를 보여 줘요
  let speaker = senderName
  const rows = lines.map((m) => {
    // 사진 보내기 선택지는 서버에 "[가상 신분증 사진 제공]"처럼 기록돼요 → 대화창에는 자연스럽게 보여 줘요
    if (m.from !== "ai") return { m, name: "나", text: m.text.replace(/^\[가상\s*(.+?)\s*제공\]$/, "$1을 보냈어요"), left: false, joined: null as string | null }
    const split = splitSpeaker(m.text)
    const joined = split.speaker && split.speaker !== speaker ? split.speaker : null
    if (split.speaker) speaker = split.speaker
    const left = /\[퇴장\]/.test(split.body)
    return { m, name: speaker, text: split.body.replace(LEFT_MARK, " ").trim(), left, joined }
  })
  const family = FAMILY.test(`${senderName} ${sim.scenario?.title ?? ""} ${sim.scenario?.description ?? ""}`)
  // 중고거래: 사기범이 보낸 물건 사진에서 물건 이름을, 대사에서 가격을 찾아 화면 위 상품 카드로 보여 줘요
  const aiTexts = lines.filter((l) => l.from === "ai").map((l) => l.text)
  const item = channel === "MARKET" ? firstItem(aiTexts) : null
  const price = channel === "MARKET" ? aiTexts.map((t) => t.match(PRICE)?.[1]).find(Boolean) ?? null : null
  // 상대가 사진을 달라고 하면 보낼 수 있는 자료 (서버가 준 선택지 중 사진만. 빠른 답변 버튼은 보여 주지 않아요)
  const lastAiLine = [...lines].reverse().find((l) => l.from === "ai" && !l.local)
  const photoOptions = (last?.from === "ai" ? lastAiLine?.options ?? [] : []).filter((o) => o.mockAttachment)
  // 대화를 연 시각 (메신저 맨 위 날짜 줄)
  const [openedAt] = useState(() => {
    const d = new Date()
    return `오늘 ${d.getHours() < 12 ? "오전" : "오후"} ${((d.getHours() + 11) % 12) + 1}:${String(d.getMinutes()).padStart(2, "0")}`
  })
  // 상대방이 나갔으면 더 보낼 수 없어요 (입력창을 닫고 결과 보기로 안내)
  const hasLeft = rows.some((r) => r.left)
  const currentSpeaker = speaker
  // 상황 설명·훈련 안내는 시작 전 화면(시나리오 확인)에서 이미 보여 줘서, 여기서는 대화창만 크게 보여 줘요
  const pageRef = useRef<HTMLElement>(null)
  // 화면 전체는 스크롤되지 않게 하고, 대화창이 남은 높이를 꽉 채워요 (대화 안에서만 스크롤)
  useEffect(() => {
    const root = document.documentElement
    const prev = root.style.overflow
    root.style.overflow = "hidden"
    const fit = () => {
      const el = pageRef.current
      if (!el) return
      // 글자 크게(가가) 모드는 .app에 zoom이 걸려 있어서, 화면 픽셀을 CSS 픽셀로 바꿔요
      const zoom = parseFloat(getComputedStyle(el.closest(".app") ?? el).zoom || "1") || 1
      const top = el.getBoundingClientRect().top
      el.style.height = `${Math.max(420, (window.innerHeight - top) / zoom)}px`
    }
    fit()
    window.addEventListener("resize", fit)
    const watch = new MutationObserver(fit) // 글자 크기 바꾸기(html class) 반영
    watch.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => { root.style.overflow = prev; window.removeEventListener("resize", fit); watch.disconnect() }
  }, [])

  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" })
  }, [lines, sim.typing, sim.stage])

  // 사용자가 1분 동안 답이 없으면 상대가 한 번 재촉해요 (입력 중이면 기다려요)
  const nudgeCount = lines.filter((l) => l.local).length
  useEffect(() => {
    if (sim.stage !== "chat" || sim.typing || hasLeft || sim.shouldFinish || input.trim()) return
    if (!last || last.from !== "ai" || last.local || nudgeCount >= 2) return
    const text = nudgeLines(channel, family)[nudgeCount]
    const timer = window.setTimeout(() => sim.nudge(text), NUDGE_AFTER_MS)
    return () => window.clearTimeout(timer)
  }, [sim.stage, sim.typing, hasLeft, sim.shouldFinish, input, last, nudgeCount, channel, family]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!input.trim() || sim.typing) return
    const value = input
    setInput("")
    const ok = await sim.sendTraining({ text: value })
    if (!ok) setInput(value)
  }

  return (
    <section className="chat-page v2-sim-fixed" ref={pageRef}>
      {sim.checkOpen && sim.trainingId !== null && (
        <div className="training-check-modal" role="dialog" aria-modal="true" aria-label="확인 화면"
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
        <div className={`messenger channel-${channel.toLowerCase()}`}>
          <div className="messenger-header">
            <div>
              <h2>{senderName}</h2>
              {/* 초록불: AI 서버 연결 상태(테스트 확인용). mock 모드면 주황불 */}
              <p><span className={USE_MOCK ? "mock" : undefined} title={USE_MOCK ? "mock 모드 (서버 없음)" : "AI 연결됨"}
                aria-label={USE_MOCK ? "mock 모드" : "AI 연결됨"} /> {CHANNEL_LABEL[channel] ?? "메신저"}</p>
            </div>
            {!finished && <button type="button" className="v2-sim-end" disabled={sim.typing} onClick={() => sim.setEndConfirm(true)}>훈련 마치고 결과 보기</button>}
          </div>
          {item && (
            <div className="market-item-bar">
              <span className="market-item-thumb" aria-hidden="true">
                <ItemThumb item={item} />
              </span>
              <div><strong>{item}</strong><span>{price ?? "가격 협의"}</span></div>
              <em>거래 중</em>
            </div>
          )}
          <div className="messages" ref={scrollRef} aria-live="polite">
            <div className="chat-date-chip">{openedAt}</div>
            {family && (channel === "SMS" || channel === "MESSENGER") && (
              <div className="chat-unknown-banner" role="note">
                <Icon name="user" size={16} />
                {channel === "SMS" ? "저장되지 않은 번호에서 온 메시지예요" : "친구 목록에 없는 사용자예요. 프로필 사진이 없어요."}
              </div>
            )}
            {rows.map(({ m, name, text, left, joined }) => (
              <Fragment key={m.key}>
              {joined && <div className="chat-left-notice chat-join-notice" role="status">{joined}님이 대화에 참여했어요</div>}
              <div className={`message-row ${m.from === "ai" ? "contact" : "user"}`}>
                {m.from === "ai" && <span className="avatar"><DuoIcon name={CHANNEL_ICON[channel] ?? "chat"} size={26} tone="gray" /></span>}
                <div>
                  <span className="sender">{name}</span>
                  {text && (m.from === "ai"
                    ? <TrainingMessageContent text={text} page={m.mockPage} disabled={finished || sim.typing} limit={m.reveal}
                        onOpen={(page) => void sim.showMockPage(page)}
                        appClicked={m.appClicked} onAppClick={() => void sim.clickMockApp(m.key)}
                        transferDone={m.transferDone} onTransfer={() => void sim.clickMockTransfer(m.key)} holder={name} />
                    : <p>{text}</p>)}
                  {/* 말풍선을 하나씩 보여 주는 중이면 같은 자리 아래에 '입력 중…' 점을 보여 줘요 */}
                  {m.reveal !== undefined && sim.typing && <div className="typing-dots" style={{ marginTop: 6 }}><i /><i /><i /></div>}
                  {m.mockAttachment && <MockPhotoPreview attachment={m.mockAttachment} />}
                  {m.mockPage && !containsMockLink(m.text) && (
                    <button type="button" className="outline-button" style={{ marginTop: 8, padding: "9px 13px", fontSize: 12 }} disabled={finished || sim.typing} onClick={() => void sim.showMockPage(m.mockPage!)}>
                      <Icon name="link" size={15} /> 안내 페이지 열기 ({m.mockPage.institutionName})
                    </button>
                  )}
                  {m.note && <small style={{ display: "block", opacity: 0.7 }}>{m.note}</small>}
                </div>
              </div>
              {left && m.reveal === undefined && <div className="chat-left-notice" role="status">{name}님이 대화방을 나갔어요</div>}
              </Fragment>
            ))}
            {/* 답장 기다리는 중: 상대방 말풍선과 같은 자리·모양(아바타, 이름, 말풍선)으로 점 세 개를 보여 줘요 */}
            {sim.typing && last?.reveal === undefined && (
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
            {sim.stage === "chat" && (sim.shouldFinish || hasLeft) && !sim.typing && (
              <div className="complete-card"><span><Icon name="check" size={26} /></span>
                {hasLeft
                  ? <><h3>대화가 끝났어요.</h3><p>상대방이 대화방을 나갔어요. 어떻게 대응했는지 결과를 확인해 보세요.</p></>
                  : <><h3>여기서 훈련을 마칠 수 있어요.</h3><p>대응을 충분히 보여 주셨어요. 계속 대화하거나 지금 결과를 확인하세요.</p></>}<button className="primary-button" onClick={() => void sim.finish()}>결과 분석 리포트 보기 <Icon name="arrow" size={18} /></button></div>
            )}
          </div>
          {/* 오류는 입력창과 따로 보여 줘요 (상대가 나가 입력창이 닫혀도, 종료 후에도 보이게) */}
          {sim.error && sim.stage !== "finishing" && <p className="upload-error" role="alert" style={{ margin: "8px 16px" }}>{sim.error}</p>}
          {sim.stage === "chat" && !hasLeft && (
            <div className="simulation-chat-input">
              {/* 서버가 주는 빠른 답변 버튼(availableOptions)은 보여 주지 않아요: 사용자가 직접 판단해 입력하게.
                  다만 상대가 사진을 달라고 하면 '사진 보내기'만 첨부 버튼처럼 보여 줘요 (실제 사진은 쓰지 않아요) */}
              {photoOptions.length > 0 && !sim.typing && (
                <div className="photo-tray">
                  <span><Icon name="image" size={16} /> 사진 보내기</span>
                  {photoOptions.map((option) => (
                    <button key={option.code} type="button" onClick={() => void sim.sendTraining({ option })}>
                      {option.mockAttachment?.title ?? option.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="chat-input-row">
                <textarea rows={1} maxLength={500} value={input} disabled={sim.typing}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit() } }}
                  placeholder="메시지를 입력하세요" />
                <button disabled={!input.trim() || sim.typing} onClick={() => void submit()}><Icon name="send" size={17} /> 전송</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
