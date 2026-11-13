import { readStore } from "@/lib/storage"
import type { SimProgress, SimulationMessage } from "../types"

// 시뮬레이션 진행 상태 저장(이어하기). 계정별로 이 브라우저에만 저장하며, 사진 원본은 저장하지 않습니다.
export const SIM_PROGRESS_TTL = 24 * 60 * 60 * 1000 // 명세 초안: 무활동 24시간 후 만료
export const simProgressKey = (email: string) => `wsid-sim-progress-${email}`
export function readSimProgress(email: string): SimProgress | null {
  const saved = readStore<SimProgress | null>(simProgressKey(email), null)
  if (!saved || saved.version !== 1 || Date.now() - saved.updatedAt > SIM_PROGRESS_TTL) {
    try { localStorage.removeItem(simProgressKey(email)) } catch { /* 저장소 접근 불가 시 무시 */ }
    return null
  }
  return saved
}
export function removeSimProgress(email: string) {
  try { localStorage.removeItem(simProgressKey(email)) } catch { /* 무시 */ }
}
export const countImages = (messages: SimulationMessage[]) =>
  messages.reduce((sum, m) => sum + (m.images?.length ?? m.imageCount ?? 0), 0)
