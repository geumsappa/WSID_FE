import { useRef, useState } from "react"
import type { UploadedImage } from "@/types/common"
import { Icon } from "@/components/Icon"
import { DuoIcon } from "@/components/DuoIcon"
import { EvidenceGallery } from "@/components/EvidenceGallery"
import { loadEvidence } from "@/lib/image"
import { SITUATION_ORDER, situationGuides } from "../data/situationGuides"
import type { SituationKey } from "../types"

export type EmergencyProps = {
  text: string
  setText: (value: string) => void
  attachments: UploadedImage[]
  setAttachments: (value: UploadedImage[]) => void
  analyzing: boolean
  error: string
  onSelect: (key: SituationKey) => void
  onAnalyze: () => void
  /** 로그인 여부. 비로그인이면 '기록이 저장되지 않는다'는 안내를 보여 줘요 */
  loggedIn?: boolean
  onLogin?: () => void
}
// 긴급 대응 첫 화면: 사기 유형 카드 6개(고정 안내) 또는 직접 설명 → 상담 시작(SOL-01)
export function EmergencyPage(p: EmergencyProps) {
  const [uploadError, setUploadError] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const dragDepth = useRef(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const selectImages = async (files: FileList | null) => {
    if (!files?.length) return
    const result = await loadEvidence(Array.from(files), p.attachments.length)
    if (result.images.length) p.setAttachments([...p.attachments, ...result.images])
    setUploadError(result.error)
    if (fileRef.current) fileRef.current.value = ""
  }
  return (
    <section className="subpage emergency-page">
      {/* 비로그인 안내: 네비게이션 바로 아래 한 줄 띠 (subpage 위쪽 여백 76px만큼 끌어올려요) */}
      {p.loggedIn === false && (
        <div style={{ margin: "-76px 0 56px", background: "#eaf2ff", borderBottom: "1px solid #d6e4fb" }}>
          <div className="container" style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", fontSize: 14, color: "#33507a", flexWrap: "wrap" }}>
            <Icon name="lock" size={16} />
            <span style={{ flex: 1, minWidth: 220 }}>로그인하지 않아도 상담할 수 있지만, 상담 기록은 저장되지 않아요. 기록을 마이페이지에 남기려면 먼저 로그인해 주세요.</span>
            {p.onLogin && (
              <button type="button" onClick={p.onLogin} style={{ padding: "7px 16px", border: "1px solid #1769e0", borderRadius: 999, background: "#fff", color: "#1769e0", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                로그인하기
              </button>
            )}
          </div>
        </div>
      )}
      <div className="container">
        {/* 가장 급한 안내: 제목 바로 위 빨간 한 줄 (상자 없이, 제목과 같은 왼쪽 선) */}
        <p className="v2-urgent-top" role="note">
          <Icon name="alert" size={20} />
          이미 돈을 보냈다면 지금 바로 112 · 1394에 지급정지를 요청하세요
        </p>
        <div className="v2-intro">
          <h1>어떤 일이 있었나요?</h1>
          <p>비슷한 상황을 고르면 지금 해야 할 일을 순서대로 알려 드려요.</p>
        </div>
        <div className="situation-grid v2-situations">
          {SITUATION_ORDER.map((key) => (
            <button
              key={key}
              disabled={p.analyzing}
              onClick={() => p.onSelect(key)}
            >
              <DuoIcon name={key} size={56} />
              <div>
                <h3>{situationGuides[key].title}</h3>
                <p>{situationGuides[key].short}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="direct-input">
          <div>
            <span className="direct-icon">
              <DuoIcon name="chat" size={30} />
            </span>
            <h2>목록에 없나요? 직접 알려 주세요</h2>
            <p>받은 문자나 대화, 있었던 일을 글이나 사진으로 알려 주세요.</p>
          </div>
          <textarea
            value={p.text}
            onChange={(e) => p.setText(e.target.value)}
            placeholder="예: 은행 직원이라는 사람에게 전화를 받고 안내에 따라 돈을 이체했어요. 어떻게 해야 하나요?"
          />
          <div
            className={`upload-zone ${isDragging ? "is-dragging" : ""}`}
            onDragEnter={(event) => {
              event.preventDefault()
              dragDepth.current += 1
              setIsDragging(true)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = "copy"
            }}
            onDragLeave={(event) => {
              event.preventDefault()
              dragDepth.current = Math.max(0, dragDepth.current - 1)
              if (dragDepth.current === 0) setIsDragging(false)
            }}
            onDrop={(event) => {
              event.preventDefault()
              dragDepth.current = 0
              setIsDragging(false)
              void selectImages(event.dataTransfer.files)
            }}
          >
            <input
              ref={fileRef}
              id="evidence-image"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => void selectImages(event.target.files)}
            />
            <label htmlFor="evidence-image">
              <span><DuoIcon name="photo" size={30} /></span>
              <span>
                <strong>사진을 끌어다 놓거나 클릭해서 첨부하기</strong>
                <small>여러 장을 한꺼번에 선택하거나 추가할 수 있어요. (최대 12장, 장당 10MB)</small>
              </span>
              <Icon name="arrow" size={18} />
            </label>
            {p.attachments.length > 0 && <div className="attached-evidence">
              <strong>첨부한 사진: {p.attachments.length}장</strong>
              <EvidenceGallery images={p.attachments}
                onAdd={() => fileRef.current?.click()}
                onRemove={(id) => p.setAttachments(p.attachments.filter((item) => item.id !== id))} />
            </div>}
            {uploadError && (
              <p className="upload-error" role="alert">
                {uploadError}
              </p>
            )}
            <p className="upload-safety">
              <Icon name="lock" size={15} />
              제출 전에 비밀번호, 인증번호, 전체 주민등록번호 등 불필요한
              민감정보가 보이지 않도록 사진을 자르거나 가려 주세요.
            </p>
          </div>
          {p.error && <p className="upload-error" role="alert">{p.error}</p>}
          <div className="direct-footer">
            <span>
              <Icon name="lock" size={16} /> 사진 원본은 서버로 보내지 않고
              장수만 전달합니다.
            </span>
            <button
              className="primary-button"
              disabled={(!p.text.trim() && p.attachments.length === 0) || p.analyzing}
              onClick={p.onAnalyze}
            >
              {p.analyzing
                ? "상황을 분석하고 있어요..."
                : "대응 방법 확인하기"}
              {!p.analyzing && <Icon name="arrow" size={17} />}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
