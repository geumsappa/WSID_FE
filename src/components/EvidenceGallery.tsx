import { useEffect, useState } from "react"
import type { UploadedImage } from "@/types/common"
import { MAX_EVIDENCE_IMAGES } from "@/lib/image"

export function EvidenceGallery({ images, onRemove, onAdd, max = MAX_EVIDENCE_IMAGES }: {
  images: UploadedImage[]
  max?: number
  onRemove?: (id: string) => void
  onAdd?: () => void
}) {
  const [selected, setSelected] = useState<UploadedImage | null>(null)
  useEffect(() => {
    if (!selected) return
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selected])
  return <>
    {images.length > 0 && <div className="evidence-gallery" aria-label="첨부한 사진 목록">
      {images.map((item, index) => <div className="evidence-tile" key={item.id}>
        <button className="evidence-thumb" type="button" title={`${item.name} 크게 보기`} aria-label={`${index + 1}번째 사진 크게 보기`} onClick={() => setSelected(item)}>
          <img src={item.preview} alt={`${index + 1}번째 첨부 사진: ${item.name}`} />
        </button>
        {onRemove && <button className="evidence-remove" type="button" aria-label={`${item.name} 삭제`} title="사진 삭제" onClick={() => onRemove(item.id)}>×</button>}
      </div>)}
      {onAdd && images.length < max && <button className="evidence-add" type="button" onClick={onAdd} aria-label="사진 더 추가하기"><span>＋</span><small>사진 추가</small></button>}
    </div>}
    {selected && <div className="evidence-lightbox" role="dialog" aria-modal="true" aria-label="사진 확대 보기" onClick={() => setSelected(null)}>
      <button type="button" className="lightbox-close" onClick={() => setSelected(null)} aria-label="확대 보기 닫기">×</button>
      <img src={selected.preview} alt={selected.name} onClick={(event) => event.stopPropagation()} />
      <span className="lightbox-caption">{selected.name}</span>
    </div>}
  </>
}
