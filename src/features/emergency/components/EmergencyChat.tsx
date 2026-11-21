import { useEffect, useRef, useState } from "react"
import { USE_MOCK } from "@/api"
import { AI_DEV_URL } from "@/api/config"
import type { FactKey, YesNoUnknown } from "@/api"
import type { UploadedImage } from "@/types/common"
import { Icon } from "@/components/Icon"
import { ConfirmModal } from "@/components/ConfirmModal"
import { EvidenceGallery } from "@/components/EvidenceGallery"
import { Typing } from "@/components/Typing"
import { loadEvidence } from "@/lib/image"
import { toLinkItems, toTextItems } from "@/lib/normalize"
import type { Emergency, InputMode } from "../hooks/useEmergency"
import { situationGuides } from "../data/situationGuides"
import { CHECK_LABEL, CHECK_ORDER } from "../lib/composeReply"
import type { SolutionFacts } from "@/api"

/**
 * 도우미의 긴 글을 읽기 쉽게: 첫 문장(답)은 위에, 나머지 할 일은 번호 목록으로.
 * - AI가 줄바꿈 + "1. " 목록으로 주면 그대로 목록으로
 * - "1) ... 2) ..."처럼 한 줄에 이어 쓴 목록도 나눠요
 * - 그 밖에 세 문장 이상이면 첫 문장 뒤를 문장별 목록으로
 */
function splitAnswer(text: string): { lead: string; items: string[] } {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  const numbered = /^\d+[.)]\s*/
  if (lines.length > 1 && lines.slice(1).some((l) => numbered.test(l))) {
    return { lead: lines[0], items: lines.slice(1).map((l) => l.replace(numbered, "")) }
  }
  const flat = lines.join(" ")
  const inline = flat.split(/\s(?=\d\)\s)/)
  if (inline.length >= 3) return { lead: inline[0], items: inline.slice(1).map((l) => l.replace(numbered, "")) }
  const sentences = flat.split(/(?<=[.!?])\s+/).filter(Boolean)
  if (sentences.length >= 3) return { lead: sentences[0], items: sentences.slice(1) }
  return { lead: flat, items: [] }
}

function MessageText({ text, className, structured }: { text: string; className?: string; structured: boolean }) {
  // 말풍선 모양은 <p>에 걸려 있어서, 목록도 <p> 안에서 줄을 나눠 보여 줘요
  const { lead, items } = structured ? splitAnswer(text) : { lead: text, items: [] as string[] }
  if (!items.length) return <p className={className}>{text}</p>
  return (
    <p className={className}>
      <span style={{ display: "block", fontWeight: 600 }}>{lead}</span>
      {items.map((item, i) => (
        <span key={i} style={{ display: "flex", gap: 8, marginTop: 6, lineHeight: 1.6 }}>
          <span style={{ flex: "none", minWidth: 18, color: "#1769e0", fontWeight: 700 }}>{i + 1}.</span>
          <span>{item}</span>
        </span>
      ))}
    </p>
  )
}

/** 사실 확인을 [예/아니오/모름] 네 번 대신 '있었던 일 모두 고르기' 한 번으로 물어요. false면 예전 방식 */
const USE_CHECKLIST = true

/** 있었던 일 모두 고르기. 설명·사진에서 이미 '예'로 파악된 항목은 미리 골라 둬요 */
function FactChecklist({ facts, onSubmit }: { facts: SolutionFacts | null; onSubmit: (selected: FactKey[]) => void }) {
  const [picked, setPicked] = useState<FactKey[]>(() => CHECK_ORDER.filter((k) => facts?.[k] === "YES"))
  const [none, setNone] = useState(false)
  const [error, setError] = useState("")
  const toggle = (k: FactKey) => {
    setError("")
    setNone(false)
    setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))
  }
  const pill = (on: boolean) => ({
    display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontSize: 14,
    border: `1px solid ${on ? "#1769e0" : "#cfd8e3"}`, background: on ? "#eaf2ff" : "#fff", color: on ? "#1769e0" : "#33415c", fontWeight: on ? 700 : 500,
  } as const)
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {CHECK_ORDER.map((k) => (
          <button key={k} type="button" aria-pressed={picked.includes(k)} style={pill(picked.includes(k))} onClick={() => toggle(k)}>
            {picked.includes(k) ? "✓ " : ""}{CHECK_LABEL[k]}
          </button>
        ))}
        <button type="button" aria-pressed={none} style={pill(none)} onClick={() => { setError(""); setPicked([]); setNone((v) => !v) }}>
          {none ? "✓ " : ""}해당 없어요
        </button>
      </div>
      {error && <p role="alert" style={{ margin: "8px 0 0", fontSize: 13, color: "#c0392b" }}>{error}</p>}
      <button type="button" className="primary-button" style={{ marginTop: 12, padding: "10px 18px", fontSize: 14 }}
        onClick={() => (picked.length || none ? onSubmit(picked) : setError("해당하는 것을 고르거나 '해당 없어요'를 눌러 주세요."))}>
        이대로 알려 주기
      </button>
    </div>
  )
}
import { organizationData } from "../data/organizations"

const FACT_LABEL: Record<FactKey, string> = { transferredMoney: "돈을 보냈나요?", sharedInformation: "정보를 알려 줬나요?", installedApp: "앱을 설치했나요?", contactContinues: "연락이 계속되나요?" }
const ANSWER_LABEL: Record<YesNoUnknown, string> = { YES: "예", NO: "아니오", UNKNOWN: "모름" }
/**
 * '파악한 피해 사실' 패널(드롭다운 4개)을 보여 줄지. 기능(SOL-04 정정, AI가 파악한 사실)은 그대로 두고 화면에서만 숨겨요.
 * 다시 보이게 하려면 true 로 바꾸면 돼요. 사실 확인은 채팅의 [예][아니오][모름] 말풍선으로 받아요.
 */
const SHOW_FACT_PANEL = false
const KIND_LABEL = { clarification: "어떡하지 도우미 · 추가 질문", answer: "어떡하지 도우미 · AI 답변", unable: "어떡하지 도우미" } as const
const PLACEHOLDER: Record<InputMode, string> = {
  auto: "궁금한 점을 묻거나 새로 생긴 상황을 알려 주세요. 예) 앱도 깔았는데 어떻게 해요?",
  question: "궁금한 점을 물어보세요. 예) 앱을 깔았는데 어떻게 해야 하나요?",
  fact: "새로 생긴 상황을 설명해 주세요. 대응 카드가 갱신돼요.",
  answer: "도우미의 질문에 답해 주세요.",
}

// 피해 대응 상담 화면(SOL-02~05 + GUIDE-03·04). 피해 사실, 대응 카드, 기관 안내, 후속 대화를 보여 줘요.
/**
 * (개발용, mock 모드만) 로컬 AI 서버가 켜져 있는지 15초마다 /health로 확인해요.
 * null: 확인 중, true: 켜짐, false: 꺼짐 또는 VITE_AI_DEV_URL 미설정
 */
function useAiDevStatus(): boolean | null {
  const [up, setUp] = useState<boolean | null>(USE_MOCK && AI_DEV_URL ? null : false)
  useEffect(() => {
    if (!USE_MOCK || !AI_DEV_URL) return
    let alive = true
    const check = async () => {
      try {
        const r = await fetch(`${AI_DEV_URL}/health`, { signal: AbortSignal.timeout(2000) })
        if (alive) setUp(r.ok)
      } catch {
        if (alive) setUp(false)
      }
    }
    void check()
    const id = window.setInterval(check, 15000)
    return () => { alive = false; window.clearInterval(id) }
  }, [])
  return up
}

export function EmergencyChat({ em, loggedIn = false, onMyPage }: { em: Emergency; loggedIn?: boolean; onMyPage?: () => void }) {
  const [input, setInput] = useState("")
  const [confirmEnd, setConfirmEnd] = useState(false)
  const aiUp = useAiDevStatus()
  const [uploadError, setUploadError] = useState("")
  const [dragging, setDragging] = useState(false)
  const [pendingImages, setPendingImages] = useState<UploadedImage[]>([])
  // 질문인지 상황 설명인지는 보낸 글을 보고 자동으로 정해요(useEmergency.decideModes). 도우미가 되물으면 답하기 안내만 보여요.
  const mode: InputMode = em.clarification ? "answer" : "auto"
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
    void em.send(input, pendingImages, "auto")
    setInput(""); setPendingImages([]); setUploadError("")
  }
  const institutionOf = (code: string) => em.institutions.find((i) => i.code === code)
  const institutionCodes = Array.from(new Set(em.cards.flatMap((c) => em.cardDetails[c.code]?.institutionCodes ?? c.institutionCodes ?? [])))
  // 사기 유형 카드로 시작했으면 서버 대응 카드·기관 대신 그 유형의 고정 안내를 보여 줘요 (채팅 답변은 그대로 AI)
  const guide = em.situation ? situationGuides[em.situation] : null
  const first = em.messages.slice(0, 2)
  const rest = em.messages.slice(2)
  const renderMessage = (m: Emergency["messages"][number]) => m.notice ? (
    // 대응 카드가 바뀌었을 때: 제목·가장 먼저 할 일만 짧게, 전체는 위쪽 대응 방법으로
    <div className="prep-message assistant" key={m.key}>
      <span><Icon name="shield" size={18} /></span>
      <div>
        <small>어떡하지 도우미 · 대응 방법 변경</small>
        <div style={{ background: "#fff", border: "1px solid #d6e4fb", borderRadius: 14, padding: "12px 14px", display: "grid", gap: 10, maxWidth: 560 }}>
          {m.notice.added.map((a) => (
            <div key={a.code}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {a.urgent && <span style={{ padding: "2px 8px", borderRadius: 999, background: "#fff2f1", color: "#b43b38", fontSize: 12, fontWeight: 700 }}>긴급</span>}
                <strong style={{ fontSize: 15 }}>새 대응: {a.title}</strong>
              </div>
              {a.first && <div style={{ marginTop: 4, fontSize: 14, color: "#526174" }}>먼저: {a.first}</div>}
            </div>
          ))}
          {m.notice.removed.length > 0 && (
            <div style={{ fontSize: 13, color: "#697586" }}>{m.notice.removed.map((t) => `'${t}'`).join(", ")}은(는) 지금 상황에 맞지 않아 뺐어요.</div>
          )}
          <button type="button" onClick={() => document.getElementById("em-plan")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            style={{ justifySelf: "start", padding: "6px 12px", border: "1px solid #1769e0", borderRadius: 999, background: "#fff", color: "#1769e0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            위에서 전체 보기 ↑
          </button>
        </div>
      </div>
    </div>
  ) : (
    <div className={`prep-message ${m.from}`} key={m.key}>
      {m.from === "assistant" && <span><Icon name="shield" size={18} /></span>}
      <div>
        <small>{m.from === "assistant" ? (m.kind ? KIND_LABEL[m.kind] : "어떡하지 도우미") : "나"}</small>
        {m.text && (m.from === "assistant"
          ? <MessageText text={m.text} className={m.kind ? `assist-${m.kind}` : undefined} structured={m.kind === "answer" || /\n1\. /.test(m.text)} />
          : <p className={m.kind ? `assist-${m.kind}` : undefined}>{m.text}</p>)}
        {m.references && <div className="assist-refs">근거: {m.references.map((code) => em.cardDetails[code]?.title ?? em.cards.find((c) => c.code === code)?.title ?? code).join(" · ")}</div>}
        {m.images && m.images.length > 0 && <div className="sent-photo-gallery"><EvidenceGallery images={m.images} /></div>}
      </div>
    </div>
  )
  return (
    <section className="emergency-chat-page">
      {confirmEnd && (
        <ConfirmModal
          title="상담을 마칠까요?"
          message={loggedIn
            ? "지금까지의 대화는 마이페이지 '긴급 대응 기록'에 저장돼요. 마친 상담은 이어서 대화할 수 없어요."
            : "로그인하지 않아 대화 기록이 저장되지 않아요. 상담을 마치면 지금까지의 대화를 다시 볼 수 없어요."}
          confirmLabel={loggedIn ? "마치고 저장하기" : "상담 마치기"}
          cancelLabel="계속 상담하기"
          onConfirm={() => { setConfirmEnd(false); void em.complete() }}
          onCancel={() => setConfirmEnd(false)}
        />
      )}
      <div className="container emergency-chat-heading">
        <div><span className="badge">금융사기 대응 안내</span><h1>어떡하지 긴급 대응 도우미</h1><p>현재 상황에 필요한 대응 방법을 안내하고, 궁금한 점에 답변해 드립니다.</p></div>
        <button className="outline-button" onClick={em.back}><Icon name="refresh" size={16} /> 다른 상황 선택하기</button>
      </div>
      <div className="container emergency-chat-layout">
        <div className="emergency-conversation">
          <div className="assistant-header"><span><Icon name="shield" size={23} /></span><div><h2>어떡하지 대응 도우미</h2><p><i /> {USE_MOCK ? (aiUp ? "mock 모드 (백엔드 없음 · AI 서버 연결됨)" : aiUp === null ? "mock 모드 (AI 서버 확인 중)" : "mock 모드 (백엔드·AI 서버 없음 → 프론트 예비 답변)") : "AI 분석 연결됨"}</p></div></div>
          <div className="emergency-messages" ref={scrollRef} aria-live="polite">
            {first.slice(0, 1).map(renderMessage)}
            {/* 대응 카드를 먼저(화면 폭 가득), 그 아래에 도우미 첫 안내 */}
            <div className="analysis-result-stack" id="em-plan">
              {SHOW_FACT_PANEL && em.facts && (
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
              <section className="result-card action-result">
                <div className="result-card-heading"><span><Icon name="check" size={21} /></span><div><small>안전 행동 안내</small><h3>지금 필요한 대응 방법</h3></div></div>
                {guide ? (
                  <div style={{ marginTop: 4 }}>
                    <h4 style={{ margin: "0 0 10px", display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="badge" style={em.situation !== "trade" ? { background: "#fff2f1", color: "#b43b38" } : undefined}>{em.situation !== "trade" ? "긴급" : "대처 방법"}</span>
                      {guide.title}
                    </h4>
                    <div className="action-steps">{guide.steps.map((a, i) => <div key={i}><span>{i + 1}</span><div><h4>{a.title}</h4><p>{a.body}</p></div></div>)}</div>
                  </div>
                ) : <>
                {em.cards.length === 0 && <p>대응 카드를 준비하고 있어요.</p>}
                {em.cards.map((c, gi) => {
                  const d = em.cardDetails[c.code]
                  const actions = toTextItems(d?.actions)
                  const materials = toTextItems(d?.requiredMaterials)
                  const sources = toLinkItems(d?.sourceReferences)
                  const urgent = (c.priority ?? d?.priority) === "URGENT" // 상담 응답의 우선순위가 먼저 (중고거래+송금이면 긴급)
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
                </>}
              </section>
              <p className="analysis-disclaimer"><Icon name="alert" size={15} /> 분석 결과는 참고용이며, 실제 금융사기 여부를 확정하는 판단은 아닙니다. 실제 피해가 있다면 공식 기관 신고를 우선해 주세요.</p>
            </div>
            {guide && (
              <div className="chat-organizations">
                <h3>관련 공식 기관</h3>
                <div className="organization-grid">
                  {guide.organizations.map((k) => {
                    const o = organizationData[k]
                    return (
                      <a key={k} href={o.href} target={o.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                        <span className="org-mark">{o.mark}</span>
                        <div><h4>{o.name}</h4><p>{o.desc}</p><strong>{o.action} <Icon name="arrow" size={15} /></strong></div>
                      </a>
                    )
                  })}
                </div>
              </div>
            )}
            {!guide && institutionCodes.length > 0 && (
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
            {first.slice(1).map(renderMessage)}
            {rest.map(renderMessage)}
            {em.nextQuestion && !em.typing && !em.clarification && !em.completed && (
              // 사실 확인 질문(송금·정보·앱·연락)은 카드 대신 채팅 말풍선 + 빠른 답 버튼으로 물어봐요
              <div className="prep-message assistant">
                <span><Icon name="shield" size={18} /></span>
                <div>
                  <small>어떡하지 도우미 · 확인 질문</small>
                  {USE_CHECKLIST && em.firstQuestion ? <>
                    <p className="assist-clarification" style={{ margin: 0 }}>지금까지 있었던 일을 모두 골라 주세요.<br /><small style={{ fontSize: 13, color: "#697586", fontWeight: 400 }}>고르신 것에 따라 지금 할 일이 달라져요.</small></p>
                    <FactChecklist facts={em.facts} onSubmit={(s) => void em.submitChecklist(s)} />
                  </> : <>
                    {em.firstQuestion && <p style={{ margin: "0 0 6px" }}>지금 상황에 맞는 방법을 골라 드리려고 몇 가지만 여쭤볼게요.</p>}
                    <p className="assist-clarification">{em.nextQuestion.content}</p>
                    <div className="interview-choices" style={{ marginTop: 10 }}>
                      {(em.nextQuestion.options ?? ["YES", "NO", "UNKNOWN"]).map((v) => <button key={v} type="button" onClick={() => void em.answer(em.nextQuestion!, v)}>{ANSWER_LABEL[v]}</button>)}
                    </div>
                  </>}
                </div>
              </div>
            )}
            {em.typing && <Typing />}
            {em.completed && <div className="complete-card"><span><Icon name="check" size={26} /></span><h3>상담을 마쳤어요.</h3><p>안내한 조치를 진행해 주세요. 새 상황이 생기면 다시 시작할 수 있어요.</p>
              {loggedIn
                ? <><p>이 상담 기록은 마이페이지 '긴급 대응 기록'에 저장했어요.</p>{onMyPage && <button type="button" className="outline-button" style={{ marginTop: 10 }} onClick={onMyPage}>마이페이지에서 보기</button>}</>
                : <p>로그인하지 않아 상담 기록은 저장되지 않았어요.</p>}</div>}
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
            {em.clarification &&
              <div className="assist-mode answering"><span><Icon name="chat" size={14} /> 도우미 질문에 답하는 중: <strong>{em.clarification.content}</strong></span>
                {em.clarification.options.length > 0 && <div className="assist-quick">{em.clarification.options.map((v) => <button key={v} type="button" disabled={em.typing} onClick={() => void em.send(ANSWER_LABEL[v], [], "answer")}>{ANSWER_LABEL[v]}</button>)}</div>}</div>}
            <div className="privacy"><Icon name="lock" size={15} /><span>민감한 개인정보는 입력하지 마세요. 입력해도 가려서 전송돼요.{!loggedIn && " 로그인하지 않으면 상담 기록이 저장되지 않아요."}</span></div>
            <div className="chat-input-row">
              <button type="button" className="chat-attach-button" title="사진 첨부" aria-label="사진 첨부" onClick={() => fileRef.current?.click()}><Icon name="image" size={20} /></button>
              <textarea rows={1} value={input} disabled={em.typing} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit() } }}
                placeholder={PLACEHOLDER[mode]} />
              <button disabled={(!input.trim() && !pendingImages.length) || em.typing} onClick={submit}><Icon name="send" size={17} /> 전송</button>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}><button type="button" className="text-button" onClick={() => setConfirmEnd(true)}>상담 마치기 <Icon name="check" size={15} /></button></div>
          </div>}
        </div>
      </div>
    </section>
  )
}
