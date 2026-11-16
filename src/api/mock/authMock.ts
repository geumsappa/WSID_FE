// 서버 없이 회원 기능을 흉내 냅니다. 계정은 이 브라우저(localStorage)에, 로그인 상태는 sessionStorage에 둬요(세션 쿠키 대신).
// 흐름: signup(인증번호 발급) → verifyEmail → login
// mock에는 메일이 없어서, 발급한 인증번호를 개발자 도구 콘솔에 찍어 줘요.
import { readStore } from "@/lib/storage"
import { errorFromCode } from "../client"
import type {
  Gender, LoginRequest, LoginResponse, MeResponse, ResendEmailResponse, SessionResponse, SessionUser,
  SignupRequest, SignupResponse, VerifyEmailRequest, VerifyEmailResponse,
} from "../types"
import { delay } from "./delay"

type MockAccount = { id: number; email: string; password: string; gender: Gender | null; status: "PENDING" | "ACTIVE"; createdAt: string }
const ACCOUNTS_KEY = "wsid-mock-accounts-v2"
const SESSION_KEY = "wsid-mock-session-v2"
const codes = new Map<string, { code: string; expires: number }>()

const accounts = () => readStore<MockAccount[]>(ACCOUNTS_KEY, [])
const saveAccounts = (list: MockAccount[]) => localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list))
const toUser = (a: MockAccount): SessionUser => ({ id: a.id, email: a.email, gender: a.gender })
function issueCode(email: string) {
  const code = String(Math.floor(100000 + Math.random() * 900000))
  codes.set(email, { code, expires: Date.now() + 5 * 60 * 1000 })
  console.info(`[mock] ${email} 인증번호: ${code}`)
  return code
}
/** mock 로그인 사용자 (다른 mock 파일에서도 사용) */
export function mockCurrentUser(): MockAccount | null {
  let email: string | null = null
  try { email = sessionStorage.getItem(SESSION_KEY) } catch { /* 무시 */ }
  return accounts().find((a) => a.email === email && a.status === "ACTIVE") ?? null
}
export function requireMockUser() {
  const user = mockCurrentUser()
  if (!user) throw errorFromCode(401, "UNAUTHORIZED")
  return user
}
/** 테스트에서 인증번호를 꺼낼 때만 사용 */
export const _mockCodeFor = (email: string) => codes.get(email)?.code

export const authMock = {
  async signup(body: SignupRequest): Promise<SignupResponse> {
    await delay(300)
    const list = accounts()
    if (list.some((a) => a.email === body.email && a.status === "ACTIVE")) throw errorFromCode(409, "EMAIL_ALREADY_EXISTS")
    const account: MockAccount = { id: list.length + 1, email: body.email, password: body.password, gender: body.gender, status: "PENDING", createdAt: new Date().toISOString() }
    saveAccounts([...list.filter((a) => a.email !== body.email), account])
    issueCode(body.email)
    return { userId: account.id, email: account.email, status: "PENDING", verificationRequired: true }
  },
  async resendEmailCode(email: string): Promise<ResendEmailResponse> {
    await delay(200)
    if (accounts().some((a) => a.email === email && a.status === "PENDING")) issueCode(email)
    return { message: "인증 메일 발송 요청이 처리되었습니다." } // 가입 여부와 상관없이 같은 안내
  },
  async verifyEmail(body: VerifyEmailRequest): Promise<VerifyEmailResponse> {
    await delay(200)
    const saved = codes.get(body.email)
    if (!saved || Date.now() > saved.expires) throw errorFromCode(400, "VERIFICATION_CODE_EXPIRED")
    if (saved.code !== body.code) throw errorFromCode(400, "INVALID_VERIFICATION_CODE")
    saveAccounts(accounts().map((a) => (a.email === body.email ? { ...a, status: "ACTIVE" as const } : a)))
    codes.delete(body.email)
    return { verified: true, status: "ACTIVE" }
  },
  async login(body: LoginRequest): Promise<LoginResponse> {
    await delay(300)
    const account = accounts().find((a) => a.email === body.email)
    if (!account || account.password !== body.password) throw errorFromCode(401, "INVALID_CREDENTIALS")
    if (account.status !== "ACTIVE") throw errorFromCode(403, "EMAIL_NOT_VERIFIED")
    sessionStorage.setItem(SESSION_KEY, account.email)
    return { user: toUser(account) }
  },
  async session(): Promise<SessionResponse> {
    await delay(100)
    const user = mockCurrentUser()
    return { authenticated: Boolean(user), user: user ? toUser(user) : null }
  },
  async logout(): Promise<void> {
    await delay(100)
    requireMockUser()
    sessionStorage.removeItem(SESSION_KEY)
  },
  async me(): Promise<MeResponse> {
    await delay(100)
    const u = requireMockUser()
    return { id: u.id, email: u.email, gender: u.gender, status: u.status, createdAt: u.createdAt }
  },
}
