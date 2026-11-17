import { useEffect, useRef, useState } from "react"
import { USE_MOCK } from "@/api"
import type { FactKey, YesNoUnknown } from "@/api"
import type { UploadedImage } from "@/types/common"
import { Icon } from "@/components/Icon"
import { EvidenceGallery } from "@/components/EvidenceGallery"
import { Typing } from "@/components/Typing"
import { loadEvidence } from "@/lib/image"
import { toLinkItems, toTextItems } from "@/lib/normalize"
import type { Emergency, InputMode } from "../hooks/useEmergency"

const FACT_LABEL: Record<FactKey, string> = { transferredMoney: "돈을 보냈나요?", sharedInformation: "정보를 알려 줬나요?", installedApp: "앱을 설치했나요?", contactContinues: "연락이 계속되나요?" }
const ANSWER_LABEL: Record<YesNoUnknown, string> = { YES: "예", NO: "아니오", UNKNOWN: "모름" }
const KIND_LABEL = { clarification: "어떡하지 도우미 · 추가 질문", answer: "어떡하지 도우미 · AI 답변", unable: "어떡하지 도우미" } as const
const PLACEHOLDER: Record<InputMode, string> = {
  question: "궁금한 점을 물어보세요. 예) 앱을 깔았는데 어떻게 해야 하나요?",
  fact: "새로 생긴 상황을 설명해 주세요. 대응 카드가 갱신돼요.",
  answer: "도우미의 질문에 답해 주세요.",
}

// 피해 대응 상담 화면(SOL-02~05 + GUIDE-03·04). 피해 사실, 대응 카드, 기관 안내, 후속 대화를 보여 줘요.
export function EmergencyChat({ em }: { em: Emergency }) {
  const [input, setInput] = useState("")
  const [uploadError, setUploadError] = useState("")
  const [dragging, setDragging] = useState(false)
  const [pendingImages, setPendingImages] = useState<UploadedImage[]>([])
  const [mode, setMode] = useState<InputMode>("question")
  // AI가 추가 질문을 하면 입력창을 "답하기"로, 질문이 끝나면 다시 "질문하기"로 돌려요.
  const clarificationId = em.clarification?.questionId
  useEffect(() => {
    setMode((m) => clarificationId ? "answer" : m === "answer" ? "question" : m)
  }, [clarificationId])
  const fileRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const count = useRef(em.messages.length)
  const addImages = async (files: FileList | null) => {
    if (!files?.length) return
    const result = await loadEvidence(Array.from(files), pendingImages.length)
    if (result.images.length) setPendingImages((c) => [...c, ...result.images])
    setUploadError(result.error)
    if (fileRef.current) fileRef.current.value = ""
  }
  useEffect(() => {
    const node = scrollRef.current
    if (node && em.messages.length > count.current) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" })
    count.current = em.messages.length
  }, [em.messages, em.typing])
  const submit = () => {
    if ((!input.trim() && !pendingImages.length) || em.typing) return
    void em.send(input, pendingImages, mode)
    setInput(""); setPendingImages([]); setUploadError("")
  }
  const institutionOf = (code: string) => em.institutions.find((i) => i.code === code)
  const institutionCodes = Array.from(new Set(em.cards.flatMap((c) => em.cardDetails[c.code]?.institutionCodes ?? c.institutionCodes ?? [])))
  const first = em.messages.slice(0, 2)
  const rest = em.messages.slice(2)
  const renderMessage = (m: Emergency["messages"][number]) => (
    <div className={`prep-message ${m.from}`} key={m.key}>
      {m.from === "assistant" && <span><Icon name="shield" size={18} /></span>}
      <div>
        <small>{m.from === "assistant" ? (m.kind ? KIND_LABEL[m.kind] : "어떡하지 도우미") : "나"}</small>
        {m.text && <p className={m.kind ? `assist-${m.kind}` : undefined}>{m.text}</p>}
        {m.references && <div className="assist-refs">근거: {m.references.map((code) => em.cardDetails[code]?.title ?? em.cards.find((c) => c.code === code)?.title ?? code).join(" · ")}</div>}
        {m.images && m.images.length > 0 && <div className="sent-photo-gallery"><EvidenceGallery images={m.images} /></div>}
      </div>
    </div>
  )
  return (
    <section className="emergency-chat-page">
      <div className="container emergency-chat-heading">
        <div><span className="badge">금융사기 대응 안내</span><h1>어떡하지 긴급 대응 도우미</h1><p>현재 상황에 필요한 대응 방법을 안내하고, 궁금한 점에 답변해 드립니다.</p></div>
        <button className="outline-button" onClick={em.back}><Icon name="refresh" size={16} /> 다른 상황 선택하기</button>
      </div>
      <div className="container emergency-chat-layout">
        <div className="emergency-conversation">
          <div className="assistant-header"><span><Icon name="shield" size={23} /></span><div><h2>어떡하지 대응 도우미</h2><p><i /> {USE_MOCK ? "mock 모드 (서버 없음)" : "AI 분석 연결됨"}</p></div></div>
          <div className="emergency-messages" ref={scrollRef} aria-live="polite">
            {first.map(renderMessage)}
            <div className="analysis-result-stack">
              {em.facts && (
                <section className="result-card summary-result">
                  <div className="result-card-heading"><span><Icon name="search" size={21} /></span><div><small>입력 내용 확인</small><h3>파악한 피해 사실</h3></div></div>
                  <p>잘못 파악된 항목이 있으면 눌러서 바꿔 주세요. 대응 카드가 바로 갱신돼요.</p>
                  <div className="extracted-fields" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    {(Object.keys(FACT_LABEL) as FactKey[]).map((k) => (
                      <label key={k}>{FACT_LABEL[k]}
                        <select value={em.facts![k]} disabled={em.typing} onChange={(e) => void em.correctFact(k, e.target.value as YesNoUnknown)} style={{ width: "100%", marginTop: 6, padding: "10px 12px", border: "1px solid #dfe5ee", borderRadius: 10, background: "#fbfcfe", fontSize: 12 }}>
                          {(["YES", "NO", "UNKNOWN"] as YesNoUnknown[]).map((v) => <option key={v} value={v}>{ANSWER_LABEL[v]}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                  <div className="uncertainty-note">입력 정보만으로 실제 사기 여부를 확정할 수 없어요.</div>
                </section>
              )}
              {em.nextQuestion && !em.typing && (
                <section className="result-card">
                  <div className="result-card-heading"><span><Icon name="chat" size={21} /></span><div><small>추가 확인</small><h3>{em.nextQuestion.content}</h3></div></div>
                  <div className="interview-choices" style={{ marginTop: 4 }}>{(em.nextQuestion.options ?? ["YES", "NO", "UNKNOWN"]).map((v) => <button key={v} type="button" onClick={() => void em.answer(em.nextQuestion!, v)}>{ANSWER_LABEL[v]}</button>)}</div>
                </section>
              )}
              <section className="result-card action-result">
                <div className="result-card-heading"><span><Icon name="check" size={21} /></span><div><small>안전 행동 안내</small><h3>지금 필요한 대응 방법</h3></div></div>
                {em.cards.length === 0 && <p>대응 카드를 준비하고 있어요.</p>}
                {em.cards.map((c, gi) => {
                  const d = em.cardDetails[c.code]
                  const actions = toTextItems(d?.actions)
                  const materials = toTextItems(d?.requiredMaterials)
                  const sources = toLinkItems(d?.sourceReferences)
                  const urgent = (d?.priority ?? c.priority) === "URGENT"
                  return (
                    <div key={c.code} style={{ marginTop: gi ? 22 : 4 }}>
                      <h4 style={{ margin: "0 0 10px", display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="badge" style={urgent ? { background: "#fff2f1", color: "#b43b38" } : undefined}>{urgent ? "긴급" : `상황 ${gi + 1}`}</span>
                        {d?.title ?? c.title ?? c.code}
                      </h4>
                      {actions.length > 0 ? <div className="action-steps">{actions.map((a, i) => <div key={i}><span>{i + 1}</span><div>{a.title && <h4>{a.title}</h4>}<p>{a.body}</p></div></div>)}</div>
                        : <p style={{ fontSize: 12, color: "#697586" }}>{d ? "세부 조치가 아직 등록되지 않았어요. 아래 공식 기관에 문의해 주세요." : "카드 내용을 불러오는 중이에요."}</p>}
                      {materials.length > 0 && <p style={{ margin: "10px 0 0", fontSize: 12, color: "#526174" }}><strong>준비할 것:</strong> {materials.map((m) => m.body).join(", ")}</p>}
                      {sources.length > 0 && <p style={{ margin: "6px 0 0", fontSize: 11, color: "#7a8798" }}>근거: {sources.map((s, i) => <span key={i}>{i ? " · " : ""}{s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.label}</a> : s.label}</span>)}{d?.reviewedAt && ` (검토 ${d.reviewedAt.slice(0, 10)})`}</p>}
                    </div>
                  )
                })}
              </section>
              <p className="analysis-disclaimer"><Icon name="alert" size={15} /> 분석 결과는 참고용이며, 실제 금융사기 여부를 확정하는 판단은 아닙니다. 실제 피해가 있다면 공식 기관 신고를 우선해 주세요.</p>
            </div>
            {institutionCodes.length > 0 && (
              <div className="chat-organizations">
                <h3>관련 공식 기관</h3>
                <div className="organization-grid">
                  {institutionCodes.map((code) => {
                    const it = institutionOf(code)
                    const href = it?.phone ? `tel:${it.phone}` : it?.officialUrl ?? undefined
                    const Tag = href ? "a" : "div"
                    return (
                      <Tag key={code} href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                        <span className="org-mark">{it?.phone ?? (it?.name ?? code).slice(0, 2)}</span>
                        <div>
                          <h4>{it?.name ?? code}</h4>
                          <p>{it?.role ?? "기관 정보를 불러오는 중"}</p>
                          {href && <strong>{it?.phone ? `${it.phone} 전화하기` : "공식 사이트 이동"} <Icon name="arrow" size={15} /></strong>}
                        </div>
                      </Tag>
                    )
                  })}
                </div>
              </div>
            )}
            {rest.map(renderMessage)}
            {em.typing && <Typing />}
            {em.completed && <div className="complete-card"><span><Icon name="check" size={26} /></span><h3>상담을 마쳤어요.</h3><p>안내한 조치를 진행해 주세요. 새 상황이 생기면 다시 시작할 수 있어요.</p></div>}
          </div>
          {!em.completed && <div className="emergency-chat-input"
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={(e) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false) }}
            onDrop={(e) => { e.preventDefault(); setDragging(false); void addImages(e.dataTransfer.files) }}>
            <input className="visually-hidden-evidence" ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(e) => void addImages(e.target.files)} aria-label="사진 첨부" />
            {dragging && <div className="chat-drop-hint">여기에 사진을 놓아 첨부하세요</div>}
            {pendingImages.length > 0 && <div className="chat-attachments pending-photos"><span>전송할 사진: {pendingImages.length}장</span><EvidenceGallery images={pendingImages} onRemove={(id) => setPendingImages((items) => items.filter((i) => i.id !== id))} /></div>}
            {uploadError && <p className="upload-error" role="alert">{uploadError}</p>}
            {em.error && <p className="upload-error" role="alert">{em.error}{em.failed && <> <button type="button" className="assist-retry" disabled={em.typing} onClick={em.retry}>다시 보내기</button></>}</p>}
            {em.clarification && mode === "answer"
              ? <div className="assist-mode answering"><span><Icon name="chat" size={14} /> 도우미 질문에 답하는 중: <strong>{em.clarification.content}</strong></span><button type="button" onClick={() => setMode("question")}>새 질문으로 보내기</button>
                  {em.clarification.options.length > 0 && <div className="assist-quick">{em.clarification.options.map((v) => <button key={v} type="button" disabled={em.typing} onClick={() => void em.send(ANSWER_LABEL[v], [], "answer")}>{ANSWER_LABEL[v]}</button>)}</div>}</div>
              : <div className="assist-mode" role="radiogroup" aria-label="입력 종류">
                  <button type="button" role="radio" aria-checked={mode === "question"} className={mode === "question" ? "active" : ""} onClick={() => setMode("question")}>질문하기</button>
                  <button type="button" role="radio" aria-checked={mode === "fact"} className={mode === "fact" ? "active" : ""} onClick={() => setMode("fact")}>상황 추가 설명</button>
                  {em.clarification && <button type="button" className="assist-back" onClick={() => setMode("answer")}>↩ 도우미 질문에 답하기</button>}
                </div>}
            <div className="privacy"><Icon name="lock" size={15} /><span>민감한 개인정보는 입력하지 마세요. 입력해도 가려서 전송돼요.</span></div>
            <div className="chat-input-row">
              <button type="button" className="chat-attach-button" title="사진 첨부" aria-label="사진 첨부" onClick={() => fileRef.current?.click()}><Icon name="image" size={20} /></button>
              <textarea rows={1} value={input} disabled={em.typing} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit() } }}
                placeholder={PLACEHOLDER[mode]} />
              <button disabled={(!input.trim() && !pendingImages.length) || em.typing} onClick={submit}><Icon name="send" size={17} /> 전송</button>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}><button type="button" className="text-button" onClick={() => void em.complete()}>상담 마치기 <Icon name="check" size={15} /></button></div>
          </div>}
        </div>
      </div>
    </section>
  )
}
