import { useRef, useState } from "react"
import type { IconName, UploadedImage } from "@/types/common"
import { Icon } from "@/components/Icon"
import { EvidenceGallery } from "@/components/EvidenceGallery"
import { PageIntro } from "@/components/PageIntro"
import { loadEvidence } from "@/lib/image"
import { emergencyData } from "../data/emergencyData"
import type { EmergencyKey } from "../types"

export type EmergencyProps = {
  text: string
  setText: (value: string) => void
  attachments: UploadedImage[]
  setAttachments: (value: UploadedImage[]) => void
  analyzing: boolean
  error: string
  onSelect: (key: Exclude<EmergencyKey, "custom">) => void
  onAnalyze: () => void
}
// 긴급 대응 첫 화면: 상황 카드 6개 또는 직접 설명 → 상담 시작(SOL-01)
export function EmergencyPage(p: EmergencyProps) {
  const [uploadError, setUploadError] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const dragDepth = useRef(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const cards: [Exclude<EmergencyKey, "custom">, IconName][] = [
    ["transfer", "send"], ["link", "link"], ["app", "app"],
    ["privacy", "user"], ["call", "phone"], ["trade", "cart"],
  ]
  const selectImages = async (files: FileList | null) => {
    if (!files?.length) return
    const result = await loadEvidence(Array.from(files), p.attachments.length)
    if (result.images.length) p.setAttachments([...p.attachments, ...result.images])
    setUploadError(result.error)
    if (fileRef.current) fileRef.current.value = ""
  }
  return (
    <section className="subpage emergency-page">
      <div className="container">
        <PageIntro
          kicker="상황별 빠른 안내"
          title="금융사기 긴급 대응"
          subtitle="현재 상황을 선택하거나 직접 설명해 주세요. 필요한 대응 방법과 공식 신고 경로를 안내해 드립니다."
        />
        <div className="urgent-notice">
          <span>
            <Icon name="alert" size={22} />
          </span>
          <div>
            <strong>이미 돈을 송금하셨나요?</strong>
            <p>
              사기가 의심된다면 즉시 112와 해당 금융회사에 신고하고 지급정지를
              요청하세요.
            </p>
          </div>
        </div>
        <div className="section-heading left">
          <span>상황 선택</span>
          <h2>어떤 상황에 처하셨나요?</h2>
          <p>가장 가까운 상황을 선택해 주세요.</p>
        </div>
        <div className="situation-grid">
          {cards.map(([key, icon]) => (
            <button
              key={key}
              disabled={p.analyzing}
              onClick={() => p.onSelect(key)}
            >
              <span>
                <Icon name={icon} size={25} />
              </span>
              <div>
                <h3>{emergencyData[key].title}</h3>
                <p>{emergencyData[key].short}</p>
              </div>
              <Icon name="arrow" size={18} />
            </button>
          ))}
        </div>
        <div className="direct-input">
          <div>
            <span className="direct-icon">
              <Icon name="chat" size={24} />
            </span>
            <h2>내 상황을 직접 설명해 주세요.</h2>
            <p>
              의심스러운 문자, 대화, 전화, 송금이나 피싱 상황을 글과 사진으로
              알려주세요.
            </p>
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
              <span><Icon name="image" size={23} /></span>
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
                : "AI로 대응 방법 확인하기"}
              {!p.analyzing && <Icon name="arrow" size={17} />}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
