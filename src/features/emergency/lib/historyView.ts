import type { ChatMessage } from "@/api"
import type { SituationKey } from "../types"
import { SITUATION_ORDER, situationGuides } from "../data/situationGuides"

/**
 * 같은 말이 연달아 두 번 저장된 경우(상황 저장 + 질문을 따로 보냈을 때) 하나만 남겨요.
 * 상담 복원(SOL-02)과 마이페이지 기록 보기에서 써요.
 */
export function dedupeMessages<T extends Pick<ChatMessage, "sender" | "content">>(list: T[]): T[] {
  const deduped = list.filter((m, i) => !(i > 0 && m.sender === "USER" && list[i - 1].sender === "USER" && list[i - 1].content.trim() === m.content.trim()))
  return tidyFactRecords(deduped)
}

// 서버(SOL-04)가 저장한 사실 기록·고정 질문 문장. 새로고침해도 처음 화면처럼 보이게 정리할 때 써요
const CORRECTION = /^사실 수정:\s*(.+?)\s*선택:\s*(.+)$/
const FACT_QUESTIONS: Record<string, string> = {
  "상대방에게 돈을 보낸 적이 있나요?": "돈을 보냈어요",
  "개인정보를 전달한 적이 있나요?": "개인정보·인증번호를 알려 줬어요",
  "상대방이 알려준 앱을 설치한 적이 있나요?": "앱을 설치했어요",
  "상대방과 지금도 연락하고 있나요?": "아직 연락하고 있어요",
}

/**
 * 새로고침(SOL-02) 때 서버 기록을 처음 대화 모양으로 돌려요.
 * - 체크리스트로 한 번에 보낸 사실 기록 여러 줄("사실 수정: … 선택: 예")은 처음처럼 한 말풍선으로 합쳐요
 *   (예: "아직 연락하고 있어요", 고른 게 없으면 "해당 없어요")
 * - 한 줄만 고친 기록은 "질문 → 답" 모양으로 보여 줘요
 * - 서버가 남긴 고정 사실 질문(SYSTEM)은 화면에서 체크리스트·질문 카드로 따로 보여 주므로 말풍선에서는 빼요
 */
export function tidyFactRecords<T extends Pick<ChatMessage, "sender" | "content">>(list: T[]): T[] {
  const out: T[] = []
  for (let i = 0; i < list.length; i++) {
    const m = list[i]
    if (m.sender !== "USER" && FACT_QUESTIONS[m.content.trim()]) continue
    const first = m.sender === "USER" ? m.content.trim().match(CORRECTION) : null
    if (!first) { out.push(m); continue }
    const run: RegExpMatchArray[] = [first]
    while (i + 1 < list.length && list[i + 1].sender === "USER") {
      const next = list[i + 1].content.trim().match(CORRECTION)
      if (!next) break
      run.push(next)
      i++
    }
    const text = run.length === 1
      ? `${run[0][1]} → ${run[0][2]}`
      : run.filter((r) => r[2].trim() === "예").map((r) => FACT_QUESTIONS[r[1].trim()] ?? r[1]).join(", ") || "해당 없어요"
    out.push({ ...m, content: text })
  }
  return out
}

/** 첫 사용자 말이 유형 카드의 시작 문장이면 그 유형 (고정 안내로 시작한 상담인지 알아내려고) */
export function situationOfText(text: string | undefined): SituationKey | null {
  const t = text?.trim()
  return t ? SITUATION_ORDER.find((k) => situationGuides[k].startText === t) ?? null : null
}
