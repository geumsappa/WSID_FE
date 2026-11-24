import type { Page } from "@/types/common"
import { Logo } from "@/components/Logo"
import { TextSizeToggle } from "@/components/TextSizeToggle"

export function Header({ page, go, mobileMenu, setMobileMenu, loggedIn, openSimulation }: {
  page: Page
  go: (next: Page) => void
  mobileMenu: boolean
  setMobileMenu: (open: boolean) => void
  loggedIn: boolean
  openSimulation: () => void
}) {
  // 모든 페이지에서 같은 메뉴바 (홈도 같은 모양)
  return (
    <header className="nav-shell">
    <nav className="nav" aria-label="주요 메뉴">
      <Logo onClick={() => go("home")} />
      <div className="v2-nav-tools"><TextSizeToggle /></div>
      {(
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
      {(
        <div className={`nav-links ${mobileMenu ? "open" : ""}`}>
          <button className={page === "home" ? "active" : ""} onClick={() => go("home")}>홈</button>
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
          {/* 로그인 탭은 두지 않아요: 시뮬레이션은 시작할 때, 긴급 대응은 화면 위 안내 띠에서 로그인해요. 로그인하면 마이페이지가 생겨요 */}
          {loggedIn && <button className={page === "mypage" ? "active" : ""} onClick={() => go("mypage")}>마이페이지</button>}
        </div>
      )}
    </nav>
    </header>
  )
}
