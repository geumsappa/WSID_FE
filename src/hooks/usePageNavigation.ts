import { useEffect, useState } from "react"
import type { Page } from "@/types/common"

// 페이지 전환과 브라우저 주소·뒤로 가기를 맞춥니다. (추후 react-router로 교체할 부분)
export function usePageNavigation() {
  const initialPage: Page =
    window.location.pathname === "/login" ? "login" : window.location.pathname === "/signup" ? "signup" : window.location.pathname === "/mypage" ? "mypage" : window.location.pathname === "/emergency/chat"
      ? "emergency"
      : window.location.pathname === "/emergency"
        ? "emergency"
        : window.location.pathname === "/simulation"
          ? "simulation"
          : window.location.pathname === "/report"
            ? "report"
            : "home"
  const [page, setPage] = useState<Page>(initialPage)
  const [mobileMenu, setMobileMenu] = useState(false)
  const go = (next: Page) => {
    setPage(next)
    setMobileMenu(false)
    const paths: Record<Page, string> = {
      home: "/",
      simulation: "/simulation",
      emergency: "/emergency",
      emergencyChat: "/emergency/chat",
      report: "/report",
      login: "/login",
      signup: "/signup",
      mypage: "/mypage",
    }
    const path = paths[next]
    window.history.pushState({ page: next }, "", path)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
  useEffect(() => {
    window.history.replaceState(
      { page: initialPage },
      "",
      window.location.pathname,
    )
    const handleBack = (event: PopStateEvent) => {
      const next = event.state?.page as Page | undefined
      if (next) {
        setPage(next)
        setMobileMenu(false)
        window.scrollTo({ top: 0 })
      }
    }
    window.addEventListener("popstate", handleBack)
    return () => window.removeEventListener("popstate", handleBack)
  }, [])
  return { page, go, mobileMenu, setMobileMenu }
}
