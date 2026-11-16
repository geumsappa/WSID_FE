// 회원 API (AUTH-01~07). 로그인은 세션 쿠키 방식: 서버가 Set-Cookie로 세션을 주고, 브라우저가 알아서 보내요.
// 흐름: signup(인증 메일 발송) → verifyEmail → login → (새로고침 후) session으로 로그인 상태 확인
import { request } from "./client"
import { USE_MOCK } from "./config"
import { ENDPOINTS } from "./endpoints"
import { authMock } from "./mock/authMock"
import type {
  LoginRequest, LoginResponse, MeResponse, ResendEmailResponse, SessionResponse,
  SignupRequest, SignupResponse, VerifyEmailRequest, VerifyEmailResponse,
} from "./types"

const E = ENDPOINTS.auth

export const authApi = {
  /** AUTH-01 회원가입 (201). 인증 메일이 함께 발송돼요 */
  signup: (body: SignupRequest): Promise<SignupResponse> =>
    USE_MOCK ? authMock.signup(body) : request(E.signup, { method: "POST", body }),

  /** AUTH-02 인증번호 재발송. 가입 여부와 상관없이 같은 안내가 와요 */
  resendEmailCode: (email: string): Promise<ResendEmailResponse> =>
    USE_MOCK ? authMock.resendEmailCode(email) : request(E.resendEmailCode, { method: "POST", body: { email } }),

  /** AUTH-03 이메일 인증 완료 */
  verifyEmail: (body: VerifyEmailRequest): Promise<VerifyEmailResponse> =>
    USE_MOCK ? authMock.verifyEmail(body) : request(E.verifyEmail, { method: "POST", body }),

  /** AUTH-04 로그인. 세션 ID는 응답에 없고 쿠키로만 와요 */
  login: (body: LoginRequest): Promise<LoginResponse> =>
    USE_MOCK ? authMock.login(body) : request(E.login, { method: "POST", body }),

  /** AUTH-05 로그인 세션 확인. 로그인 안 됐으면 401 대신 { authenticated: false }로 돌려줘요 */
  session: async (): Promise<SessionResponse> => {
    if (USE_MOCK) return authMock.session()
    try {
      return await request<SessionResponse>(E.session)
    } catch (e) {
      if (e && typeof e === "object" && "status" in e && e.status === 401) return { authenticated: false, user: null }
      throw e
    }
  },

  /** AUTH-06 로그아웃 (204) */
  logout: (): Promise<void> => (USE_MOCK ? authMock.logout() : request(E.logout, { method: "POST" })),

  /** AUTH-07 내 회원정보 */
  me: (): Promise<MeResponse> => (USE_MOCK ? authMock.me() : request(E.me)),
}
