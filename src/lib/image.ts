import type { UploadedImage } from "@/types/common"

export const MAX_EVIDENCE_IMAGES = 12
export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]

export type ImageLimits = { max: number; maxBytes: number; types: string[]; ext: RegExp; typeLabel: string; sizeLabel: string }
// 긴급 대응: 최대 12장, 장당 10MB, JPG·PNG·WEBP
export const EMERGENCY_IMAGE_LIMITS: ImageLimits = { max: MAX_EVIDENCE_IMAGES, maxBytes: MAX_EVIDENCE_BYTES, types: IMAGE_TYPES, ext: /\.(jpe?g|png|webp)$/i, typeLabel: "JPG, PNG, WEBP", sizeLabel: "10MB" }
// 시뮬레이션(요구사항 명세): 훈련 한 번에 최대 3장, 장당 5MB, PNG·JPEG
export const SIM_IMAGE_LIMITS: ImageLimits = { max: 3, maxBytes: 5 * 1024 * 1024, types: ["image/jpeg", "image/png"], ext: /\.(jpe?g|png)$/i, typeLabel: "PNG, JPEG", sizeLabel: "5MB" }
export const SIM_IMAGE_ACCEPT = ".png,.jpg,.jpeg,image/png,image/jpeg"

export async function loadEvidence(files: File[], existing: number, limits: ImageLimits = EMERGENCY_IMAGE_LIMITS): Promise<{ images: UploadedImage[], error: string }> {
  const available = Math.max(0, limits.max - existing)
  const selected = files.slice(0, available)
  const images: UploadedImage[] = []
  const errors: string[] = []
  if (files.length > available) errors.push(`사진은 최대 ${limits.max}장까지 첨부할 수 있어요.`)
  for (const file of selected) {
    if (!limits.types.includes(file.type) && !limits.ext.test(file.name)) {
      errors.push(`${file.name}: ${limits.typeLabel} 파일만 첨부할 수 있어요.`)
      continue
    }
    if (file.size > limits.maxBytes) {
      errors.push(`${file.name}: 사진 한 장은 ${limits.sizeLabel} 이하여야 해요.`)
      continue
    }
    try {
      const preview = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject()
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      images.push({ id: crypto.randomUUID(), name: file.name, preview })
    } catch {
      errors.push(`${file.name}: 사진을 불러오지 못했어요.`)
    }
  }
  return { images, error: errors.join(" ") }
}
