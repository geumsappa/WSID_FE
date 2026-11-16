import { useEffect, useState } from "react"
import { ApiError, authApi } from "@/api"
import type { Page } from "@/types/common"
import type { Account } from "../types"

// 로그인 상태를 백엔드 세션(AUTH-04~06)으로 관리합니다. 토큰은 저장하지 않고, 세션 쿠키를 브라우저가 대신 보내요.
export function useAuth(go: (next: Page) => void) {
  const [account, setAccount] = useState<Account | null>(null)
  /** 처음 세션 확인(AUTH-05)이 끝났는지. 끝나기 전에는 로그인 여부를 아직 몰라요 */
  const [ready, setReady] = useState(false)
  const [returnAfterLogin, setReturnAfterLogin] = useState<Page>("mypage")

  // 새로고침·재방문: 세션 쿠키가 살아 있으면 로그인 상태를 복구합니다.
  useEffect(() => {
    let alive = true
    authApi
      .session()
      .then((s) => { if (alive) setAccount(s.authenticated ? s.user : null) })
      .catch(() => { if (alive) setAccount(null) }) // 서버가 꺼져 있으면 비로그인으로 시작
      .finally(() => { if (alive) setReady(true) })
    return () => { alive = false }
  }, [])

  const requireLogin = (destination: Page) => {
    if (account) return true
    setReturnAfterLogin(destination)
    go("login")
    return false
  }
  /** AUTH-04. 실패하면 에러를 던지고, 화면(AuthPage)이 문구를 보여 줘요 */
  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password })
    setAccount(res.user)
    go(returnAfterLogin)
    setReturnAfterLogin("mypage")
  }
  /** AUTH-06. 서버 요청이 실패해도 화면에서는 로그아웃 처리 */
  const signOut = async () => {
    try { await authApi.logout() } catch { /* 이미 만료된 세션 등 */ }
    setAccount(null)
  }
  /** 다른 API가 401을 받았을 때: 세션이 끝난 것이므로 로그인 화면으로 보냅니다. true면 처리했다는 뜻 */
  const handleUnauthorized = (err: unknown, destination: Page) => {
    if (!(err instanceof ApiError) || err.status !== 401) return false
    setAccount(null)
    setReturnAfterLogin(destination)
    go("login")
    return true
  }
  return { account, ready, returnAfterLogin, setReturnAfterLogin, requireLogin, login, signOut, handleUnauthorized }
}
