import type { Page } from "@/types/common"
import { Logo } from "@/components/Logo"

export function Header({ page, go, mobileMenu, setMobileMenu, loggedIn, openSimulation }: {
  page: Page
  go: (next: Page) => void
  mobileMenu: boolean
  setMobileMenu: (open: boolean) => void
  loggedIn: boolean
  openSimulation: () => void
}) {
  return (
    <header className={`nav-shell ${page === "home" ? "home-nav" : ""}`}>
    <nav className="nav" aria-label="주요 메뉴">
      <Logo onClick={() => go("home")} />
      {page !== "home" && (
        <button
          className="menu-button"
          onClick={() => setMobileMenu(!mobileMenu)}
          aria-label="메뉴 열기"
          aria-expanded={mobileMenu}
        >
          <span />
          <span />
          <span />
        </button>
      )}
      {page !== "home" && (
        <div className={`nav-links ${mobileMenu ? "open" : ""}`}>
          <button onClick={() => go("home")}>홈</button>
          <button
            className={
              page === "simulation" || page === "report" ? "active" : ""
            }
            onClick={() => openSimulation()}
          >
            금융사기 시뮬레이션
          </button>
          <button
            className={
              page === "emergency" || page === "emergencyChat"
                ? "active"
                : ""
            }
            onClick={() => go("emergency")}
          >
            긴급 대응
          </button>
          {loggedIn ? <button className={page === "mypage" ? "active" : ""} onClick={() => go("mypage")}>마이페이지</button> : <button className={page === "login" || page === "signup" ? "active" : ""} onClick={() => go("login")}>로그인</button>}
        </div>
      )}
      {page === "home" && <div className="nav-account-home">{loggedIn ? <button onClick={() => go("mypage")}>마이페이지</button> : <button onClick={() => go("login")}>로그인 / 회원가입</button>}</div>}
    </nav>
    </header>
  )
}
