import type { ChatMessage } from "@/api"
import type { SituationKey } from "../types"
import { SITUATION_ORDER, situationGuides } from "../data/situationGuides"

/**
 * 같은 말이 연달아 두 번 저장된 경우(상황 저장 + 질문을 따로 보냈을 때) 하나만 남겨요.
 * 상담 복원(SOL-02)과 마이페이지 기록 보기에서 써요.
 */
export function dedupeMessages<T extends Pick<ChatMessage, "sender" | "content">>(list: T[]): T[] {
  return list.filter((m, i) => !(i > 0 && m.sender === "USER" && list[i - 1].sender === "USER" && list[i - 1].content.trim() === m.content.trim()))
}

/** 첫 사용자 말이 유형 카드의 시작 문장이면 그 유형 (고정 안내로 시작한 상담인지 알아내려고) */
export function situationOfText(text: string | undefined): SituationKey | null {
  const t = text?.trim()
  return t ? SITUATION_ORDER.find((k) => situationGuides[k].startText === t) ?? null : null
}
