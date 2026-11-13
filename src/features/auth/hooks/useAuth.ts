import { useState } from "react"
import type { Page } from "@/types/common"
import { readStore } from "@/lib/storage"
import { ACCOUNT_KEY, SESSION_KEY } from "../lib/demoAuth"
import type { DemoAccount } from "../types"

// 로그인 계정과 "로그인 후 돌아갈 페이지"를 관리합니다.
export function useAuth(go: (next: Page) => void) {
  const [account, setAccount] = useState<DemoAccount | null>(() => {
    try { const email = sessionStorage.getItem(SESSION_KEY); return readStore<DemoAccount[]>(ACCOUNT_KEY, []).find(a => a.email === email && a.verified) || null } catch { return null }
  })
  const [returnAfterLogin, setReturnAfterLogin] = useState<Page>("mypage")
  const requireLogin = (destination: Page) => { if (!account) { setReturnAfterLogin(destination); go("login"); return false } return true }
  const login = (a: DemoAccount) => { setAccount(a); sessionStorage.setItem(SESSION_KEY, a.email); go(returnAfterLogin) }
  const signOut = () => { sessionStorage.removeItem(SESSION_KEY); setAccount(null) }
  return { account, returnAfterLogin, setReturnAfterLogin, requireLogin, login, signOut }
}
