import { useId } from "react"
import type { MockAttachment } from "@/api"

/** App-drawn virtual material. No file input, user image, external URL or upload. */
export function MockPhotoPreview({ attachment }: { attachment: MockAttachment }) {
  const titleId = useId()
  const label = attachment.type === "ID_CARD" ? "가상 신분증" : attachment.type === "BANKBOOK" ? "가상 통장" : "가상 사진"
  return (
    <figure className="mock-photo-preview">
      <svg viewBox="0 0 340 202" role="img" aria-labelledby={titleId}>
        <title id={titleId}>{`${label} — 실제 개인정보가 없는 훈련용 이미지`}</title>
        <rect x="1" y="1" width="338" height="200" rx="16" fill="#f8fafc" stroke="#cbd5e1" />
        <path d="M1 17a16 16 0 0 1 16-16h306a16 16 0 0 1 16 16v35H1z" fill="#e2e8f0" />
        <text x="20" y="33" fontSize="17" fontWeight="700" fill="#334155">{label}</text>
        {attachment.type === "ID_CARD" ? <>
          <rect x="20" y="69" width="78" height="96" rx="8" fill="#e2e8f0" />
          <circle cx="59" cy="99" r="15" fill="#94a3b8" />
          <path d="M33 150a26 26 0 0 1 52 0" fill="#94a3b8" />
        </> : <>
          <rect x="20" y="69" width="78" height="96" rx="8" fill="#e2e8f0" />
          <path d="M30 143l19-29 14 18 13-24 12 35z" fill="#94a3b8" />
          <circle cx="41" cy="94" r="9" fill="#94a3b8" />
        </>}
        <text x="117" y="93" fontSize="14" fill="#475569">훈련용 예시 자료</text>
        <rect x="117" y="109" width="170" height="9" rx="4" fill="#cbd5e1" />
        <rect x="117" y="129" width="135" height="9" rx="4" fill="#cbd5e1" />
        <text x="117" y="162" fontSize="12" fill="#64748b">실제 이름·번호·얼굴 없음</text>
        <text x="20" y="186" fontSize="11" fill="#64748b">SIMULATION ONLY · 실제 문서가 아닙니다</text>
      </svg>
      <figcaption>훈련용 가상 자료 · 실제 사진 전송 없음</figcaption>
    </figure>
  )
}
