import { useEffect, useRef, useState } from "react"
import type { UploadedImage } from "@/types/common"
import { Icon } from "@/components/Icon"
import { EvidenceGallery } from "@/components/EvidenceGallery"
import { Typing } from "@/components/Typing"
import { loadEvidence } from "@/lib/image"
import { emergencyData } from "../data/emergencyData"
import { organizationData } from "../data/organizations"
import type { AssistantMessage, EmergencyKey } from "../types"

export type EmergencyChatProps = {
  categories: EmergencyKey[]
  submittedText: string
  attachments: UploadedImage[]
  setAttachments: (value: UploadedImage[]) => void
  messages: AssistantMessage[]
  typing: boolean
  onSend: (message: string, images: UploadedImage[]) => void
  onBack: () => void
}
export function EmergencyChat(p: EmergencyChatProps) {
  const [input, setInput] = useState("")
  const [uploadError, setUploadError] = useState("")
  const [draggingChat, setDraggingChat] = useState(false)
  const [pendingImages, setPendingImages] = useState<UploadedImage[]>([])
  const chatImageRef = useRef<HTMLInputElement>(null)
  const addChatImages = async (files: FileList | null) => {
    if (!files?.length) return
    const result = await loadEvidence(Array.from(files), p.attachments.length + pendingImages.length)
    if (result.images.length) setPendingImages((current) => [...current, ...result.images])
    setUploadError(result.error)
    if (chatImageRef.current) chatImageRef.current.value = ""
  }
  const extractedPhone =
    p.submittedText.match(/01[016789][-\s]?\d{3,4}[-\s]?\d{4}/)?.[0] || ""
  const extractedAccount =
    p.submittedText
      .match(/\d[\d-\s]{8,18}\d/g)
      ?.find(
        (value) =>
          value.replace(/\D/g, "").length >= 10 &&
          !value.includes(extractedPhone),
      ) || ""
  const [phoneNumber, setPhoneNumber] = useState(extractedPhone)
  const [accountNumber, setAccountNumber] = useState(extractedAccount)
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "done">(
    "idle",
  )
  const scrollRef = useRef<HTMLDivElement>(null)
  const initialScrollSet = useRef(false)
  const previousMessageCount = useRef(p.messages.length)
  const activeSituations = p.categories.map((key) => ({ key, ...emergencyData[key] }))
  const multiple = activeSituations.length > 1
  // 여러 상황의 기관을 중복 없이 합칩니다(112는 항상 맨 앞).
  const organizations = Array.from(new Set(activeSituations.flatMap((s) => s.organizations))).sort(
    (a, b) => (a === "police" ? -1 : b === "police" ? 1 : 0),
  )
  const hasCategory = (key: EmergencyKey) => p.categories.includes(key)
  const firstResponseEnd = p.submittedText || (p.messages[0]?.from === "user") ? 2 : 1
  const isAnalysis = Boolean(p.submittedText || p.attachments.length)
  const similarCase =
    hasCategory("trade")
      ? {
          type: "중고거래 선입금 사기",
          summary:
            "판매자가 물품 발송 전 입금을 받은 뒤 연락을 끊는 사례가 있어요.",
          similarity:
            "개인 간 거래, 계좌이체 또는 판매자 연락 중단 여부를 함께 살펴봐야 해요.",
          signs:
            "시세보다 지나치게 낮은 가격, 안전결제 거부, 플랫폼 밖 연락 유도",
        }
      : hasCategory("link") || hasCategory("app")
        ? {
            type: "문자 링크를 이용한 피싱",
            summary:
              "기관이나 배송 안내를 사칭해 링크 접속 또는 앱 설치를 유도하는 사례가 있어요.",
            similarity:
              "출처를 확인하기 어려운 메시지와 외부 화면 이동 요청이 유사 신호일 수 있어요.",
            signs: "긴급함 강조, 주소가 낯선 링크, 개인정보나 앱 설치 요구",
          }
        : {
            type: "기관·지인 사칭 금융사기",
            summary:
              "신뢰할 만한 사람이나 기관을 사칭해 송금과 정보 제공을 요구하는 사례가 있어요.",
            similarity:
              "갑작스러운 연락, 긴급한 요청, 공식 경로가 아닌 확인 방식이 공통 신호일 수 있어요.",
            signs: "즉시 송금 요구, 비밀 유지 요청, 비밀번호·인증번호 요구",
          }
  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    if (!initialScrollSet.current) {
      node.scrollTop = 0
      initialScrollSet.current = true
      previousMessageCount.current = p.messages.length
      return
    }
    if (p.messages.length > previousMessageCount.current) {
      node.scrollTo({ top: node.scrollHeight, behavior: "smooth" })
    }
    previousMessageCount.current = p.messages.length
  }, [p.messages, p.typing])
  // 상황이 여러 개면 상황별로 묶어서 대응 카드를 모두 보여줍니다(우선순위 순서).
  const renderSteps = () =>
    activeSituations.map((situation, groupIndex) => (
      <div key={situation.key} style={multiple ? { marginTop: groupIndex ? 22 : 4 } : undefined}>
        {multiple && (
          <h4 style={{ margin: "0 0 10px", display: "flex", alignItems: "center", gap: 8 }}>
            <span className="badge">{groupIndex === 0 ? "가장 먼저" : `상황 ${groupIndex + 1}`}</span>
            {situation.title}
          </h4>
        )}
        <div className="action-steps">
          {situation.steps.map((step, index) => (
            <div key={step.title}>
              <span>{index + 1}</span>
              <div>
                <h4>{step.title}</h4>
                <p>{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ))
  const submit = () => {
    if ((!input.trim() && !pendingImages.length) || p.typing) return
    p.onSend(input, pendingImages)
    setInput("")
    setPendingImages([])
    setUploadError("")
  }
  return (
    <section className="emergency-chat-page">
      <div className="container emergency-chat-heading">
        <div>
          <span className="badge">금융사기 대응 안내</span>
          <h1>어떡하지 긴급 대응 도우미</h1>
          <p>
            현재 상황에 필요한 대응 방법을 안내하고, 궁금한 점에 답변해
            드립니다.
          </p>
        </div>
        <button className="outline-button" onClick={p.onBack}>
          <Icon name="refresh" size={16} /> 다른 상황 선택하기
        </button>
      </div>
      <div className="container emergency-chat-layout">
        <div className="emergency-conversation">
          <div className="assistant-header">
            <span>
              <Icon name="shield" size={23} />
            </span>
            <div>
              <h2>어떡하지 대응 도우미</h2>
              <p>
                <i /> 규칙 기반 데모 분석
              </p>
            </div>
          </div>
          <div
            className="emergency-messages"
            ref={scrollRef}
            aria-live="polite"
          >
            {p.messages.slice(0, firstResponseEnd).map((message, index) => (
              <div
                className={`prep-message ${message.from}`}
                key={`${message.text}-${index}`}
              >
                {message.from === "assistant" && (
                  <span>
                    <Icon name="shield" size={18} />
                  </span>
                )}
                <div>
                  <small>
                    {message.from === "assistant" ? "어떡하지 도우미" : "나"}
                  </small>
                  {message.text && <p>{message.text}</p>}
                  {message.images && message.images.length > 0 && (
                    <div className="sent-photo-gallery"><EvidenceGallery images={message.images} /></div>
                  )}
                </div>
              </div>
            ))}
            {isAnalysis && (
              <div className="demo-analysis-notice">
                <Icon name="spark" size={18} />
                <p>
                  <strong>데모 분석 결과</strong>
                  실제 인공지능·이미지 문자 인식·신고 데이터베이스가 연결되지
                  않았습니다. 입력한 글의 핵심어를 바탕으로 참고 정보를
                  보여드려요.
                </p>
              </div>
            )}
            {isAnalysis && (
              <div className="analysis-result-stack">
                <section className="result-card summary-result">
                  <div className="result-card-heading">
                    <span>
                      <Icon name="search" size={21} />
                    </span>
                    <div>
                      <small>입력 내용 확인</small>
                      <h3>상황 분석 요약</h3>
                    </div>
                  </div>
                  <p>
                    {p.submittedText
                      ? `${activeSituations.map((s) => s.title).join(", ")} 상황과 관련된 표현이 확인되었어요. 상대의 신원과 요청 내용을 공식 경로에서 별도로 확인하는 것이 필요합니다.`
                      : "첨부한 사진이 확인되었어요. 현재 데모에서는 이미지 속 문자를 읽을 수 없으므로 아래 대화창에 핵심 내용을 추가해 주세요."}
                  </p>

                  <div className="uncertainty-note">
                    입력 정보만으로 실제 사기 여부를 확정할 수 없어요.
                  </div>
                </section>
                <section className="result-card">
                  <div className="result-card-heading">
                    <span>
                      <Icon name="alert" size={21} />
                    </span>
                    <div>
                      <small>참고 사례</small>
                      <h3>비슷한 금융사기 사례</h3>
                    </div>
                  </div>
                  <p className="case-lead">
                    입력하신 상황과 유사한 금융사기 사례가 있습니다.
                  </p>
                  <dl className="case-details">
                    <div>
                      <dt>사기 유형</dt>
                      <dd>{similarCase.type}</dd>
                    </div>
                    <div>
                      <dt>사례 요약</dt>
                      <dd>{similarCase.summary}</dd>
                    </div>
                    <div>
                      <dt>유사한 점</dt>
                      <dd>{similarCase.similarity}</dd>
                    </div>
                    <div>
                      <dt>주요 경고 신호</dt>
                      <dd>{similarCase.signs}</dd>
                    </div>
                  </dl>
                </section>
                <section className="result-card">
                  <div className="result-card-heading">
                    <span>
                      <Icon name="phone" size={21} />
                    </span>
                    <div>
                      <small>직접 확인</small>
                      <h3>계좌번호 · 전화번호 조회</h3>
                    </div>
                  </div>
                  <p>추출된 정보가 있다면 정확한지 확인하고 수정해 주세요.</p>
                  <div className="extracted-fields">
                    <label>
                      전화번호
                      <input
                        value={phoneNumber}
                        onChange={(event) => {
                          setPhoneNumber(event.target.value)
                          setLookupState("idle")
                        }}
                        placeholder="확인할 전화번호 입력"
                      />
                    </label>
                    <label>
                      계좌번호
                      <input
                        value={accountNumber}
                        onChange={(event) => {
                          setAccountNumber(event.target.value)
                          setLookupState("idle")
                        }}
                        placeholder="확인할 계좌번호 입력"
                      />
                    </label>
                  </div>
                  <button
                    className="lookup-button"
                    disabled={
                      (!phoneNumber.trim() && !accountNumber.trim()) ||
                      lookupState === "loading"
                    }
                    onClick={() => {
                      setLookupState("loading")
                      window.setTimeout(() => setLookupState("done"), 650)
                    }}
                  >
                    <Icon name="search" size={17} />
                    {lookupState === "loading"
                      ? "조회 화면을 준비하고 있어요..."
                      : "신고 이력 조회하기"}
                  </button>
                  {lookupState === "done" && (
                    <div className="lookup-demo-result" role="status">
                      <strong>데모 안내</strong>
                      현재 실제 신고 데이터베이스와 연결되어 있지 않아 신고
                      이력을 조회하지 않았습니다. 실제 조회 서비스가 연결되기
                      전까지 결과를 제공하지 않습니다.
                    </div>
                  )}
                  <small className="lookup-caution">
                    신고 이력이 없더라도 안전한 연락처나 계좌라는 뜻은 아닙니다.
                  </small>
                </section>
                <section className="result-card action-result">
                  <div className="result-card-heading">
                    <span>
                      <Icon name="check" size={21} />
                    </span>
                    <div>
                      <small>안전 행동 안내</small>
                      <h3>지금 필요한 대응 방법</h3>
                    </div>
                  </div>
                  {renderSteps()}
                </section>
                <p className="analysis-disclaimer">
                  <Icon name="alert" size={15} /> AI 분석 결과는 참고용이며,
                  실제 금융사기 여부를 확정하는 판단은 아닙니다.
                </p>
              </div>
            )}
            {!isAnalysis && (
              <div className="action-card chat-guidance">
                <div className="action-title">
                  <span>
                    <Icon name="alert" size={21} />
                  </span>
                  <div>
                    <small>우선 확인하세요</small>
                    <h3>지금 해야 할 일</h3>
                  </div>
                </div>
                {renderSteps()}
              </div>
            )}
            <div className="chat-organizations">
              <h3>관련 공식 기관</h3>
              <div className="organization-grid">
                {organizations.map((key) => {
                  const item = organizationData[key]
                  return (
                    <a
                      key={key}
                      href={item.href}
                      target={
                        item.href.startsWith("http") ? "_blank" : undefined
                      }
                      rel="noreferrer"
                    >
                      <span className="org-mark">{item.mark}</span>
                      <div>
                        <h4>{item.name}</h4>
                        <p>{item.desc}</p>
                        <strong>
                          {item.action} <Icon name="arrow" size={15} />
                        </strong>
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
            {p.messages.slice(firstResponseEnd).map((message, index) => (
              <div
                className={`prep-message ${message.from}`}
                key={`후속-${message.text}-${index}`}
              >
                {message.from === "assistant" && (
                  <span>
                    <Icon name="shield" size={18} />
                  </span>
                )}
                <div>
                  <small>
                    {message.from === "assistant" ? "어떡하지 도우미" : "나"}
                  </small>
                  {message.text && <p>{message.text}</p>}
                  {message.images && message.images.length > 0 && (
                    <div className="sent-photo-gallery"><EvidenceGallery images={message.images} /></div>
                  )}
                </div>
              </div>
            ))}
            {p.typing && <Typing />}
          </div>
          <div className="emergency-chat-input"
            onDragOver={(e) => { e.preventDefault(); setDraggingChat(true) }}
            onDragLeave={(e) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setDraggingChat(false) }}
            onDrop={(e) => { e.preventDefault(); setDraggingChat(false); void addChatImages(e.dataTransfer.files) }}>
            <input className="visually-hidden-evidence" ref={chatImageRef} type="file" multiple accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(e) => void addChatImages(e.target.files)} aria-label="사진 첨부" />
            {draggingChat && <div className="chat-drop-hint">여기에 사진을 놓아 첨부하세요</div>}
            {pendingImages.length > 0 && <div className="chat-attachments pending-photos">
              <span>전송할 사진: {pendingImages.length}장</span>
              <EvidenceGallery images={pendingImages} onRemove={(id) => setPendingImages((items) => items.filter((item) => item.id !== id))} />
            </div>}
            {uploadError && <p className="upload-error" role="alert">{uploadError}</p>}
            <div className="privacy">
              <Icon name="lock" size={15} />
              <span>민감한 개인정보는 입력하지 마세요.</span>
            </div>
            <div className="chat-input-row">
              <button type="button" className="chat-attach-button" title="사진 여러 장 첨부" aria-label="사진 첨부" onClick={() => chatImageRef.current?.click()}><Icon name="image" size={20} /></button>
              <textarea
                rows={1}
                value={input}
                disabled={p.typing}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    submit()
                  }
                }}
                placeholder="추가로 궁금한 점을 입력해 주세요."
              />
              <button disabled={(!input.trim() && pendingImages.length === 0) || p.typing} onClick={submit}>
                <Icon name="send" size={17} /> 전송
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
