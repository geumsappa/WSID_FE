import { useEffect, useRef, useState } from "react"
import { Icon } from "@/components/Icon"
import { Typing } from "@/components/Typing"
import { SIM_IMAGE_ACCEPT, SIM_IMAGE_LIMITS } from "@/lib/image"
import type { Simulation } from "../hooks/useSimulation"

// 상황 대화(TRN-04·05): AI가 묻고 사용자가 답하며 오늘 겪은 상황을 알려 주는 단계.
export function DiscoveryChat({ sim }: { sim: Simulation }) {
  const [draft, setDraft] = useState("")
  const [imageNote, setImageNote] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const lines = sim.discoveryLines
  const current = lines[lines.length - 1]
  const options = current?.from === "ai" ? current.options ?? [] : []
  const answered = lines.filter((l) => l.from === "user").length
  const imagesLeft = Math.max(0, SIM_IMAGE_LIMITS.max - sim.usedImages)

  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }) }, [lines.length, sim.typing])

  const send = async (value: string) => {
    if (!value.trim() || sim.typing) return
    setDraft("")
    const ok = await sim.sendDiscovery(value)
    if (!ok) setDraft(value) // 실패하면 입력을 되돌려 다시 보낼 수 있게
  }
  const addImages = async (files: FileList | null) => {
    if (!files?.length) return
    const res = await sim.uploadDiscoveryImages(Array.from(files))
    if (fileRef.current) fileRef.current.value = ""
    if (!res) return
    if (res.usable && res.text) {
      setDraft((d) => (d ? `${d} ${res.text}` : res.text))
      setImageNote("사진에서 읽어낸 내용을 입력창에 넣었어요. 확인한 뒤 보내 주세요.")
    } else {
      setImageNote("사진 속 글자를 읽지 못했어요. 사진에 담긴 핵심 내용(누가, 무엇을 요구했는지)을 글로 적어 주세요.")
    }
  }

  return <div className="experience-interview">
    <div className="interview-topline"><strong>오늘 겪은 상황 이야기하기</strong><span>{answered}번 답변{sim.canGenerate ? " · 훈련 준비 가능" : ""}</span></div>
    <p className="interview-help">길게 설명하지 않아도 괜찮아요. 선택지를 고르거나 직접 적을 수 있고, 받은 문자나 화면 사진을 첨부하면 글자를 읽어 줘요.</p>
    <div className="interview-thread" aria-live="polite">
      {lines.map((l) => l.from === "ai"
        ? <div className="interview-assistant" key={l.key}><span className="interview-avatar"><Icon name="shield" size={17}/></span><div className="interview-bubble">{l.text}</div></div>
        : <div key={l.key}><div className="interview-user"><span>{l.text}</span></div>{l.note && <small style={{ display: "block", textAlign: "right", opacity: 0.7, marginTop: 4 }}>{l.note}</small>}</div>)}
      {sim.typing && <Typing />}
      <div ref={endRef}/>
    </div>
    {options.length > 0 && !sim.typing && <div className="interview-choices">{options.map((o) => <button key={o.code} type="button" onClick={() => void send(o.label)}>{o.label}</button>)}</div>}
    {imageNote && <p className="upload-safety" style={{ marginTop: 12 }}><Icon name="spark" size={15}/> {imageNote}</p>}
    {sim.error && <p className="upload-error" role="alert">{sim.error}</p>}
    <input ref={fileRef} style={{ display: "none" }} type="file" multiple accept={SIM_IMAGE_ACCEPT} onChange={(e) => void addImages(e.target.files)} aria-label="상황 설명 사진 첨부" />
    <form className="interview-compose" onSubmit={(e) => { e.preventDefault(); void send(draft) }}>
      <button type="button" className="chat-attach-button" title={`사진 첨부 (PNG·JPEG, 최대 ${SIM_IMAGE_LIMITS.max}장, 장당 5MB)`} aria-label="사진 첨부" disabled={imagesLeft === 0 || sim.typing} onClick={() => fileRef.current?.click()}><Icon name="image" size={18}/></button>
      <input aria-label="상황 답변" placeholder="직접 답변하기..." maxLength={500} value={draft} disabled={sim.typing} onChange={(e) => setDraft(e.target.value)}/>
      <button type="submit" disabled={!draft.trim() || sim.typing}><Icon name="arrow" size={17}/> 답변</button>
    </form>
    <small style={{ display: "block", marginTop: 6, opacity: 0.7 }}>사진 첨부: PNG·JPEG, 훈련 한 번에 최대 {SIM_IMAGE_LIMITS.max}장, 장당 5MB ({sim.usedImages}/{SIM_IMAGE_LIMITS.max})</small>
    {sim.canGenerate && <button type="button" className="primary-button full" disabled={sim.typing} onClick={() => void sim.generateScenario()}>이 상황으로 훈련 시나리오 만들기 <Icon name="spark" size={18}/></button>}
    <div className="privacy"><Icon name="lock" size={16}/><span>입력한 번호·계좌 등 개인정보는 값을 가리고 종류만 남겨요. 사진 속 개인정보는 가린 뒤 첨부해 주세요.</span></div>
  </div>
}
