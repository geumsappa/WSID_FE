// 이어하기를 돕는 작은 보관함. 진행 상태 자체는 서버(TRN-02·03)가 갖고 있고,
// 여기에는 서버 복원 응답에 없는 "시나리오 제목·설명"과 "마지막으로 끝낸 훈련 번호"만 둡니다.
// 대화 내용이나 개인정보는 저장하지 않아요.
import { readStore } from "@/lib/storage"
import type { ScenarioInfo } from "../types"

const SCENARIO_KEY = "wsid-training-scenario"
const LAST_FINISHED_KEY = "wsid-last-finished-training"

export function saveScenarioInfo(trainingId: number, scenario: ScenarioInfo) {
  try { localStorage.setItem(SCENARIO_KEY, JSON.stringify({ trainingId, ...scenario })) } catch { /* 무시 */ }
}
export function readScenarioInfo(trainingId: number): ScenarioInfo | null {
  const saved = readStore<(ScenarioInfo & { trainingId: number }) | null>(SCENARIO_KEY, null)
  return saved && saved.trainingId === trainingId ? { title: saved.title, description: saved.description,
    senderName: saved.senderName, organizationName: saved.organizationName } : null
}
/** 결과 화면에서 새로고침해도 리포트를 다시 불러올 수 있게, 방금 끝낸 훈련 번호를 탭에 기억해 둡니다. */
export function saveLastFinished(trainingId: number | null) {
  try { trainingId === null ? sessionStorage.removeItem(LAST_FINISHED_KEY) : sessionStorage.setItem(LAST_FINISHED_KEY, String(trainingId)) } catch { /* 무시 */ }
}
export function readLastFinished(): number | null {
  try {
    const raw = sessionStorage.getItem(LAST_FINISHED_KEY)
    return raw ? Number(raw) : null
  } catch {
    return null
  }
}
