import { useEffect, useRef, useState } from "react"
import type { UploadedImage } from "@/types/common"
import { Icon } from "@/components/Icon"
import { EvidenceGallery } from "@/components/EvidenceGallery"
import { loadEvidence, SIM_IMAGE_ACCEPT, SIM_IMAGE_LIMITS } from "@/lib/image"
import { scrubPersonalInfo } from "@/lib/privacy"
import { OCR_DEMO_NOTICE } from "../lib/constants"
import { interviewQuestion } from "../lib/scenarioFactory"
import type { InterviewAnswer } from "../types"

export function ExperienceInterview({ onComplete }: { onComplete: (context: string, images: UploadedImage[]) => void }) {
  const [answers, setAnswers] = useState<InterviewAnswer[]>([])
  const [draft, setDraft] = useState("")
  const [pendingImages, setPendingImages] = useState<UploadedImage[]>([])
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const current = interviewQuestion(answers)
  const usedImages = answers.reduce((sum, a) => sum + (a.images?.length ?? 0), 0) + pendingImages.length
  const finish = (items: InterviewAnswer[]) =>
    onComplete(items.map(v => `${v.question} ${v.answer}`).join(" / "), items.flatMap(v => v.images ?? []))
  const submit = (value: string) => {
    const v = value.trim()
    if (!v && !pendingImages.length) return
    // 상황 설명에 들어간 개인정보도 실제 값은 바로 지웁니다.
    const { text: cleaned, types } = scrubPersonalInfo(v)
    const answer = cleaned || `(사진 ${pendingImages.length}장 첨부)`
    const next = [...answers, { question: current.text, answer, images: pendingImages.length ? pendingImages : undefined }]
    setAnswers(next)
    setDraft("")
    setPendingImages([])
    setError(types.length ? `입력한 ${types.join(", ")}은(는) 저장하지 않고 바로 지웠어요.` : "")
    if (next.length === 3) finish(next)
  }
  const addImages = async (files: FileList | null) => {
    if (!files?.length) return
    const result = await loadEvidence(Array.from(files), usedImages, SIM_IMAGE_LIMITS)
    if (result.images.length) setPendingImages((items) => [...items, ...result.images])
    setError(result.error)
    if (fileRef.current) fileRef.current.value = ""
  }
  useEffect(() => { endRef.current?.scrollIntoView({block:"nearest", behavior:"smooth"}) }, [answers.length])
  return <div className="experience-interview">
    <div className="interview-topline"><strong>나의 일상 이야기하기</strong><span>최대 3개 질문 · {Math.min(answers.length+1,3)}/3</span></div>
    <p className="interview-help">길게 설명하지 않아도 괜찮아요. 답변은 선택하거나 직접 적을 수 있고, 받은 문자나 화면 사진을 첨부해도 돼요.</p>
    <div className="interview-thread" aria-live="polite">
      {answers.map((a,i) => <div className="interview-pair" key={i}>
        <div className="interview-assistant"><span className="interview-avatar"><Icon name="shield" size={17}/></span><div className="interview-bubble">{a.question}</div></div>
        <div className="interview-user"><span>{a.answer}</span></div>
        {a.images && <div className="sent-photo-gallery" style={{ display: "flex", justifyContent: "flex-end" }}><EvidenceGallery images={a.images} /></div>}
      </div>)}
      <div className="interview-assistant"><span className="interview-avatar"><Icon name="shield" size={17}/></span><div className="interview-bubble">{current.text}</div></div>
      <div ref={endRef}/>
    </div>
    <div className="interview-choices">{current.choices.map(choice => <button key={choice} type="button" onClick={() => submit(choice)}>{choice}</button>)}</div>
    {pendingImages.length > 0 && <div className="chat-attachments pending-photos">
      <span>함께 보낼 사진: {pendingImages.length}장</span>
      <EvidenceGallery images={pendingImages} max={SIM_IMAGE_LIMITS.max} onRemove={(id) => setPendingImages((items) => items.filter((item) => item.id !== id))} />
      <p className="upload-safety"><Icon name="spark" size={15}/> {OCR_DEMO_NOTICE}</p>
    </div>}
    {error && <p className="upload-error" role="alert">{error}</p>}
    <input ref={fileRef} className="visually-hidden-evidence" style={{ display: "none" }} type="file" multiple accept={SIM_IMAGE_ACCEPT} onChange={(e) => void addImages(e.target.files)} aria-label="상황 설명 사진 첨부" />
    <form className="interview-compose" onSubmit={e => {e.preventDefault(); submit(draft)}}>
      <button type="button" className="chat-attach-button" title={`사진 첨부 (PNG·JPEG, 최대 ${SIM_IMAGE_LIMITS.max}장, 장당 5MB)`} aria-label="사진 첨부" disabled={usedImages >= SIM_IMAGE_LIMITS.max} onClick={() => fileRef.current?.click()}><Icon name="image" size={18}/></button>
      <input aria-label="일상 경험 답변" placeholder="직접 답변하기..." maxLength={180} value={draft} onChange={e => setDraft(e.target.value)}/>
      <button type="submit" disabled={!draft.trim() && !pendingImages.length}><Icon name="arrow" size={17}/> 답변</button>
    </form>
    <small style={{ display: "block", marginTop: 6, opacity: 0.7 }}>사진 첨부: PNG·JPEG, 훈련 한 번에 최대 {SIM_IMAGE_LIMITS.max}장, 장당 5MB ({usedImages}/{SIM_IMAGE_LIMITS.max})</small>
    {answers.length >= 2 && <button type="button" className="interview-skip" onClick={() => finish(answers)}>충분히 이야기했어요 · 상황 추천받기 →</button>}
    <div className="privacy"><Icon name="lock" size={16}/><span>입력한 번호·계좌 등 개인정보는 저장하지 않고 바로 지워요. 사진 속 개인정보는 가린 뒤 첨부해 주세요.</span></div>
  </div>
}
