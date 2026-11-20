// (개발용, mock 모드만) 첨부 사진을 AI 레포의 개발 대역(try_assist --serve)의 /dev/ocr로 보내 글자를 읽어요.
// 대역이 내부 키를 붙여 AI OCR(/internal/ai/ocr/extract, PaddleOCR)을 불러요. 실제 서비스에서는 Spring이 할 일이에요.
import { AI_DEV_URL } from "../config"
import type { UploadedImage } from "@/types/common"

export type DevOcrResult = {
  recognizedText: string
  usable: boolean
  imageType: "SMS" | "MESSENGER_CHAT" | "TRANSFER_RECEIPT" | "WEB_PAGE" | "OTHER"
  summary: string | null
}

/** OCR이 받는 사진: PNG·JPEG, 최대 3장 (AI OCR 제한과 같음) */
const OCR_IMAGE = /^data:image\/(png|jpe?g);base64,/i
export const MAX_OCR_IMAGES = 3

export async function devOcr(images: UploadedImage[]): Promise<DevOcrResult | null> {
  if (!AI_DEV_URL) return null
  const targets = images.filter((i) => OCR_IMAGE.test(i.preview)).slice(0, MAX_OCR_IMAGES)
  if (!targets.length) return null
  try {
    const form = new FormData()
    for (const img of targets) form.append("images", await (await fetch(img.preview)).blob(), img.name)
    const res = await fetch(`${AI_DEV_URL}/dev/ocr`, { method: "POST", body: form, signal: AbortSignal.timeout(60_000) })
    if (!res.ok) {
      console.warn(`[OCR] ${res.status} → 사진 장수만 보내요`)
      return null
    }
    const body = (await res.json()) as { data?: DevOcrResult }
    return body.data ?? null
  } catch (e) {
    console.warn("[OCR] 연결 실패 → 사진 장수만 보내요", e)
    return null
  }
}
