// 백엔드 명세에서 아직 모양이 정해지지 않은 목록(예: 카드의 actions, 리포트의 turnFeedback)을
// 화면에 그릴 수 있는 공통 모양으로 바꿉니다. 문자열이든 객체든 받아서 제목·본문을 최대한 찾아내요.
// 백엔드가 형식을 확정하면 api/types.ts의 unknown[]을 실제 타입으로 바꾸고 이 파일은 지워도 됩니다.

export type TextItem = { title?: string; body: string }
export type LinkItem = { label: string; url?: string }

const TITLE_KEYS = ["title", "name", "label", "step", "heading", "summary"]
const BODY_KEYS = ["body", "description", "content", "text", "detail", "feedback", "comment", "message", "guide"]
const URL_KEYS = ["url", "link", "href", "officialUrl"]

function pick(obj: Record<string, unknown>, keys: string[]) {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === "string" && v.trim()) return v.trim()
    if (typeof v === "number") return String(v)
  }
  return undefined
}

export function toTextItems(list: unknown): TextItem[] {
  if (!Array.isArray(list)) return []
  const items: TextItem[] = []
  for (const raw of list) {
    if (typeof raw === "string") {
      if (raw.trim()) items.push({ body: raw.trim() })
    } else if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>
      const title = pick(obj, TITLE_KEYS)
      const body = pick(obj, BODY_KEYS)
      const turn = typeof obj.turn === "number" || typeof obj.turnNumber === "number" ? `${obj.turn ?? obj.turnNumber}번째 대화` : undefined
      if (title || body) items.push({ title: body ? title ?? turn : turn, body: body ?? title! })
    }
  }
  return items
}

export function toLinkItems(list: unknown): LinkItem[] {
  if (!Array.isArray(list)) return []
  const items: LinkItem[] = []
  for (const raw of list) {
    if (typeof raw === "string") {
      if (raw.trim()) items.push(/^https?:\/\//.test(raw) ? { label: raw, url: raw } : { label: raw.trim() })
    } else if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>
      const url = pick(obj, URL_KEYS)
      const label = pick(obj, TITLE_KEYS) ?? pick(obj, BODY_KEYS) ?? url
      if (label) items.push({ label, url: url && /^https?:\/\//.test(url) ? url : undefined })
    }
  }
  return items
}
