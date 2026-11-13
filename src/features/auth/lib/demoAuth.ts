// 프런트 데모용 계정 처리. Spring AUTH API 연결 시 이 파일을 api 호출로 교체합니다.

export const ACCOUNT_KEY = "wsid-demo-accounts-v1"
export const SESSION_KEY = "wsid-demo-session-v1"

export async function hashDemoPassword(password: string, salt: string) {
  const bytes = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, "0")).join("")
}
