import { useEffect, useRef, useState } from "react"
import type { UploadedImage } from "@/types/common"
import { Icon } from "@/components/Icon"
import { EvidenceGallery } from "@/components/EvidenceGallery"
import { Typing } from "@/components/Typing"
import { loadEvidence, SIM_IMAGE_ACCEPT, SIM_IMAGE_LIMITS } from "@/lib/image"
import { OCR_DEMO_NOTICE } from "../lib/constants"
import type { SimulationProps } from "../types"

export function SimulationChat(p: SimulationProps) {
  const [input, setInput] = useState("")
  const [sensitiveWarning, setSensitiveWarning] = useState("")
  const [pendingImages, setPendingImages] = useState<UploadedImage[]>([])
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const imageSlots = Math.max(0, SIM_IMAGE_LIMITS.max - p.usedImages - pendingImages.length)
  const addImages = async (files: FileList | null) => {
    if (!files?.length) return
    const result = await loadEvidence(Array.from(files), p.usedImages + pendingImages.length, SIM_IMAGE_LIMITS)
    if (result.images.length) setPendingImages((items) => [...items, ...result.images])
    setSensitiveWarning(result.error)
    if (fileRef.current) fileRef.current.value = ""
  }
  const userTurns = p.chatMessages.filter(
    (message) => message.from === "user",
  ).length
  const progress = p.stage === "complete" ? 5 : Math.min(5, userTurns + 1)
  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" })
  }, [p.chatMessages, p.chatTyping, p.stage])
  const submit = () => {
    if ((!input.trim() && !pendingImages.length) || p.chatTyping) return
    const blocked = p.onSend(input, pendingImages)
    if (blocked) {
      // 사진 장수 초과처럼 보낼 수 없을 때만 안내합니다.
      setSensitiveWarning(blocked)
      return
    }
    setInput("")
    setPendingImages([])
    setSensitiveWarning("")
  }
  const contextImageTotal = p.contextImages.length + p.restoredContextImageCount
  return (
    <section className="chat-page">
      <div className="container chat-layout">
        <aside className="scenario-sidebar">
          <span className="sidebar-kicker">현재 체험 중인 상황</span>
          <div className="sidebar-icon">
            <Icon name="shield" size={26} />
          </div>
          <h1>{p.scenario.title}</h1>
          <p>{p.scenario.description}</p>
          {contextImageTotal > 0 && (
            <div style={{ margin: "12px 0" }}>
              <small>상황 설명에 첨부한 사진 {contextImageTotal}장</small>
              {p.contextImages.length > 0
                ? <EvidenceGallery images={p.contextImages} />
                : <small style={{ display: "block", opacity: 0.7 }}>새로고침 후에는 사진 미리보기가 표시되지 않아요.</small>}
            </div>
          )}
          <div className="progress-head">
            <strong>진행 단계</strong>
            <span>{progress} / 5</span>
          </div>
          <div className="progress-bar">
            <span style={{ width: `${progress * 20}%` }} />
          </div>
          <div className="education-notice">
            <Icon name="lock" size={18} />
            <p>
              이 대화는 금융사기 예방을 위한 가상 시뮬레이션입니다. 실제
              금융기관이나 개인과 연결되지 않습니다.
            </p>
          </div>
          <button className="outline-button" onClick={p.onEnd}>
            <Icon name="close" size={17} /> 시뮬레이션 종료하기
          </button>
        </aside>
        <div className="messenger">
          <div className="messenger-header">
            <div>
              <h2>가상 대화 시뮬레이션</h2>
              <p>
                <span /> 규칙 기반 데모 모드
              </p>
            </div>
            <span className="header-shield">
              <Icon name="shield" size={22} />
            </span>
          </div>
          <div className="messages" ref={scrollRef} aria-live="polite">
            <div className="time-divider">오늘 오후 2:18</div>
            {p.chatMessages.map((m, i) => (
              <div className={`message-row ${m.from}`} key={`${m.text}-${i}`}>
                {m.from === "contact" && (
                  <span className="avatar">
                    <Icon name="chat" size={18} />
                  </span>
                )}
                <div>
                  <span className="sender">
                    {m.from === "contact" ? "의심스러운 연락" : "나"}
                  </span>
                  {m.text && <p>{m.text}</p>}
                  {m.images && m.images.length > 0 && (
                    <div className="sent-photo-gallery"><EvidenceGallery images={m.images} /></div>
                  )}
                  {m.leaked && m.leaked.length > 0 && (
                    <small style={{ display: "block", opacity: 0.7 }}>입력한 {m.leaked.join(", ")}은(는) 저장하지 않고 지웠어요.</small>
                  )}
                  {!m.images && !!m.imageCount && (
                    <p style={{ opacity: 0.75 }}>사진 {m.imageCount}장을 보냈어요. (새로고침 후에는 미리보기가 표시되지 않아요)</p>
                  )}
                </div>
              </div>
            ))}
            {p.chatTyping && <Typing />}
            {p.stage === "complete" && (
              <div className="complete-card">
                <span>
                  <Icon name="check" size={26} />
                </span>
                <h3>시뮬레이션이 종료되었습니다.</h3>
                <p>대화 내용을 바탕으로 대응 결과를 분석해 드릴게요.</p>
                <button className="primary-button" onClick={p.onReport}>
                  결과 분석 리포트 보기 <Icon name="arrow" size={18} />
                </button>
              </div>
            )}
          </div>
          {p.stage === "chat" && (
            <div
              className="simulation-chat-input"
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={(e) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false) }}
              onDrop={(e) => { e.preventDefault(); setDragging(false); void addImages(e.dataTransfer.files) }}
            >
              <input ref={fileRef} className="visually-hidden-evidence" style={{ display: "none" }} type="file" multiple accept={SIM_IMAGE_ACCEPT} onChange={(e) => void addImages(e.target.files)} aria-label="사진 첨부" />
              {dragging && <div className="chat-drop-hint">여기에 사진을 놓아 첨부하세요 (PNG·JPEG)</div>}
              {pendingImages.length > 0 && (
                <div className="chat-attachments pending-photos">
                  <span>전송할 사진: {pendingImages.length}장</span>
                  <EvidenceGallery images={pendingImages} max={SIM_IMAGE_LIMITS.max} onRemove={(id) => setPendingImages((items) => items.filter((item) => item.id !== id))} />
                  <p className="upload-safety"><Icon name="spark" size={15} /> {OCR_DEMO_NOTICE}</p>
                </div>
              )}
              <div className="privacy">
                <Icon name="lock" size={15} />
                <span>
                  입력한 번호·계좌 등 개인정보는 저장하지 않고 바로 지워요. 사진 첨부는 PNG·JPEG, 훈련 한 번에 최대 {SIM_IMAGE_LIMITS.max}장(남은 {imageSlots}장), 장당 5MB예요.
                </span>
              </div>
              {sensitiveWarning && (
                <p className="upload-error" role="alert">
                  {sensitiveWarning}
                </p>
              )}
              <div className="chat-input-row">
                <button
                  type="button"
                  className="chat-attach-button"
                  title="사진 첨부"
                  aria-label="사진 첨부"
                  disabled={imageSlots === 0 || p.chatTyping}
                  onClick={() => fileRef.current?.click()}
                >
                  <Icon name="image" size={20} />
                </button>
                <textarea
                  rows={1}
                  maxLength={500}
                  value={input}
                  disabled={p.chatTyping}
                  aria-invalid={Boolean(sensitiveWarning)}
                  onChange={(event) => {
                    setInput(event.target.value)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault()
                      submit()
                    }
                  }}
                  placeholder="상대방에게 보낼 답변을 직접 입력해 주세요."
                />
                <button
                  disabled={(!input.trim() && !pendingImages.length) || p.chatTyping}
                  onClick={submit}
                >
                  <Icon name="send" size={17} /> 전송
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
