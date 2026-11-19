import { useState } from "react"
import { ConfirmModal } from "@/components/ConfirmModal"
import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"
import { AuthGate } from "@/features/auth/components/AuthGate"
import { AuthPage } from "@/features/auth/components/AuthPage"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { EmergencyChat } from "@/features/emergency/components/EmergencyChat"
import { EmergencyPage } from "@/features/emergency/components/EmergencyPage"
import { useEmergency } from "@/features/emergency/hooks/useEmergency"
import { HomePage } from "@/features/home/HomePage"
import { MyPage } from "@/features/mypage/components/MyPage"
import { useSavedReports } from "@/features/mypage/hooks/useSavedReports"
import { useSolutionHistory } from "@/features/mypage/hooks/useSolutionHistory"
import { ReportPage } from "@/features/report/components/ReportPage"
import { SimulationPage } from "@/features/simulation/components/SimulationPage"
import { useSimulation } from "@/features/simulation/hooks/useSimulation"
import { usePageNavigation } from "@/hooks/usePageNavigation"

// 화면 조립만 담당합니다. 기능별 상태와 서버 통신은 features/*/hooks 와 src/api 에 있습니다.
export default function App() {
  const { page, go, mobileMenu, setMobileMenu } = usePageNavigation()
  const auth = useAuth(go)
  const { account } = auth
  const sim = useSimulation(account, page, go, auth.handleUnauthorized)
  const reports = useSavedReports(account, page, auth.handleUnauthorized)
  const history = useSolutionHistory(account, page, auth.handleUnauthorized)
  const em = useEmergency(go)
  const [loginPopup, setLoginPopup] = useState(false)

  const logout = async () => {
    await auth.signOut()
    sim.resetForLogout()
    go("home")
  }
  // fresh=true: 홈의 시작 버튼처럼 새 훈련을 시작합니다. false: 진행 중인 훈련이 있으면 이어서 보여줍니다.
  const openSimulation = (fresh = false) => {
    if (!account) {
      auth.setReturnAfterLogin("simulation")
      setLoginPopup(true)
      return
    }
    if (fresh) sim.startNew()
    else go("simulation")
  }
  const needsTraining = sim.stage === "chat" // 훈련 대화 중에만 "종료하면 결과 리포트" 흐름

  return (
    <div className="app">
      {loginPopup && (
        <ConfirmModal title="로그인이 필요해요" message="금융사기 시뮬레이션은 로그인 이후 사용할 수 있습니다." confirmLabel="로그인하러 가기" cancelLabel="닫기"
          onConfirm={() => { setLoginPopup(false); go("login") }} onCancel={() => { setLoginPopup(false); auth.setReturnAfterLogin("mypage") }} />
      )}
      {sim.endConfirm && (
        <ConfirmModal
          title={needsTraining ? "훈련을 종료할까요?" : "시뮬레이션을 나갈까요?"}
          message={needsTraining ? "지금까지의 대화를 바탕으로 결과 리포트를 만들어요. 종료 후에는 이 훈련을 이어서 할 수 없어요." : "진행 상태는 저장되어 있어, 나중에 홈의 '이어서 하기'로 돌아올 수 있어요."}
          confirmLabel={needsTraining ? "종료하고 결과 보기" : "홈으로"} cancelLabel="계속하기"
          onConfirm={() => (needsTraining ? void sim.finish() : sim.leave())} onCancel={() => sim.setEndConfirm(false)} />
      )}
      <Header page={page} go={go} mobileMenu={mobileMenu} setMobileMenu={setMobileMenu} loggedIn={Boolean(account)} openSimulation={() => openSimulation()} />
      <main>
        {page === "home" && <HomePage onSimulation={() => openSimulation(true)} onEmergency={() => go("emergency")} resume={sim.resumeInfo} onResume={() => go("simulation")} />}
        {page === "simulation" && (auth.ready && !account
          ? <AuthGate message="금융사기 시뮬레이션은 로그인 이후 사용할 수 있습니다." onLogin={() => { auth.setReturnAfterLogin("simulation"); go("login") }} />
          : <SimulationPage sim={sim} />)}
        {page === "emergency" && <EmergencyPage text={em.text} setText={em.setText} attachments={em.images} setAttachments={em.setImages} analyzing={em.analyzing} error={em.error} onSelect={em.selectSituation} onAnalyze={em.analyze} loggedIn={Boolean(account)} onLogin={() => { auth.setReturnAfterLogin("emergency"); go("login") }} />}
        {page === "emergencyChat" && (em.solutionId !== null
          ? <EmergencyChat em={em} loggedIn={Boolean(account)} onMyPage={() => go("mypage")} />
          : <EmergencyPage text={em.text} setText={em.setText} attachments={em.images} setAttachments={em.setImages} analyzing={em.analyzing} error={em.error} onSelect={em.selectSituation} onAnalyze={em.analyze} loggedIn={Boolean(account)} onLogin={() => { auth.setReturnAfterLogin("emergency"); go("login") }} />)}
        {page === "report" && (auth.ready && !account
          ? <AuthGate message="결과 리포트는 로그인 이후 볼 수 있습니다." onLogin={() => { auth.setReturnAfterLogin("report"); go("login") }} />
          : <ReportPage sim={sim} onEmergency={() => go("emergency")} />)}
        {page === "login" && <AuthPage mode="login" onSwitch={() => go("signup")} onLogin={auth.login} />}
        {page === "signup" && <AuthPage mode="signup" onSwitch={() => go("login")} onLogin={auth.login} />}
        {page === "mypage" && (account
          ? <MyPage account={account} reports={reports} history={history} onLogout={() => void logout()} />
          : auth.ready ? <AuthGate onLogin={() => { auth.setReturnAfterLogin("mypage"); go("login") }} /> : null)}
      </main>
      {page !== "home" && <Footer onHome={() => go("home")} />}
    </div>
  )
}
