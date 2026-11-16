import { errorFromCode } from "../client"

/** 서버를 부르는 것처럼 잠깐 기다립니다. */
export const delay = (ms = 500) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

/** 서버의 stateVersion 검사 흉내: 어긋나면 409 STATE_VERSION_CONFLICT */
export function checkVersion(current: number, sent: number) {
  if (current !== sent) throw errorFromCode(409, "STATE_VERSION_CONFLICT")
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(value)) } catch { /* 저장 공간 부족 시 무시 */ }
}

/** mock에서 쓰는 숫자 ID (새로고침해도 이어지도록 탭 저장소에 보관) */
const SEQ_KEY = "wsid-mock-seq"
export const nextId = () => {
  const next = read<number>(SEQ_KEY, 100) + 1
  write(SEQ_KEY, next)
  return next
}

/**
 * 새로고침해도 남는 mock 저장소. 서버 DB 대신 이 브라우저 탭(sessionStorage)에 둬요.
 * 그래서 mock 모드에서도 "이어서 하기"와 상담 복원을 확인할 수 있어요.
 */
export function persistedMap<V>(key: string) {
  const map = new Map<number, V>(read<[number, V][]>(key, []))
  return { map, save: () => write(key, [...map.entries()]) }
}

/** mock 함수가 끝날 때마다 저장소를 저장하도록 감쌉니다. (_로 시작하는 내부 함수는 제외) */
export function withSave<T extends object>(api: T, save: () => void): T {
  const wrapped: Record<string, unknown> = {}
  for (const [name, fn] of Object.entries(api)) {
    wrapped[name] =
      typeof fn !== "function" || name.startsWith("_")
        ? fn
        : async (...args: unknown[]) => {
            try {
              return await (fn as (...a: unknown[]) => unknown)(...args)
            } finally {
              save()
            }
          }
  }
  return wrapped as T
}
