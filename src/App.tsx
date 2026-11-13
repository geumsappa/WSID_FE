import { useState } from "react"
import { ConfirmModal } from "@/components/ConfirmModal"
import { Icon } from "@/components/Icon"
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
import { useSavedRecords } from "@/features/mypage/hooks/useSavedRecords"
import { ReportPage } from "@/features/report/components/ReportPage"
import { SimulationPage } from "@/features/simulation/components/SimulationPage"
import { useSimulation } from "@/features/simulation/hooks/useSimulation"
import { usePageNavigation } from "@/hooks/usePageNavigation"

// 화면 조립만 담당합니다. 기능별 상태와 로직은 features/*/hooks 에 있습니다.
export default function App() {
  const { page, go, mobileMenu, setMobileMenu } = usePageNavigation()
  const auth = useAuth(go)
  const { account } = auth
  const records = useSavedRecords(account, auth.requireLogin)
  const sim = useSimulation(account, page, go)
  const em = useEmergency(go)

  const logout = () => {
    auth.signOut()
    sim.resetForLogout()
    records.clearSaveNotice()
    go("home")
  }
  const [loginPopup, setLoginPopup] = useState(false)
  // fresh=true: 홈의 시작 버튼처럼 새 훈련을 시작합니다. false: 진행 중인 훈련이 있으면 그대로 이어서 보여줍니다.
  const openSimulation = (fresh = false) => {
    if (!account) {
      auth.setReturnAfterLogin("simulation")
      setLoginPopup(true)
      return
    }
    if (fresh) sim.clearSimulation()
    go("simulation")
  }
  const closeLoginPopup = () => {
    setLoginPopup(false)
    auth.setReturnAfterLogin("mypage")
  }
  const goLoginFromPopup = () => {
    setLoginPopup(false)
    go("login")
  }

  return (
    <div className="app">
      {loginPopup && (
        <ConfirmModal
          title="로그인이 필요해요"
          message="금융사기 시뮬레이션은 로그인 이후 사용할 수 있습니다."
          confirmLabel="로그인하러 가기"
          cancelLabel="닫기"
          onConfirm={goLoginFromPopup}
          onCancel={closeLoginPopup}
        />
      )}
      {sim.endConfirm && (
        <ConfirmModal
          title="시뮬레이션을 종료하시겠습니까?"
          message="지금 종료하면 진행한 대화와 결과 리포트가 저장되지 않고 홈 화면으로 이동해요."
          confirmLabel="예"
          cancelLabel="아니오"
          onConfirm={sim.confirmEndSimulation}
          onCancel={() => sim.setEndConfirm(false)}
        />
      )}
      <Header
        page={page}
        go={go}
        mobileMenu={mobileMenu}
        setMobileMenu={setMobileMenu}
        loggedIn={Boolean(account)}
        openSimulation={() => openSimulation()}
      />
      <main>
        {page === "home" && (
          <HomePage
            onSimulation={() => openSimulation(true)}
            onEmergency={() => go("emergency")}
            resume={sim.resumeInfo}
            onResume={() => go("simulation")}
          />
        )}
        {page === "simulation" && !account && (
          <AuthGate
            message="금융사기 시뮬레이션은 로그인 이후 사용할 수 있습니다."
            onLogin={() => { auth.setReturnAfterLogin("simulation"); go("login") }}
          />
        )}
        {page === "simulation" && account && (
          <SimulationPage
            stage={sim.simStage}
            context={sim.context}
            setContext={sim.setContext}
            selectedSituation={sim.selectedSituation}
            setSelectedSituation={sim.setSelectedSituation}
            scenario={sim.scenario}
            simMode={sim.simMode}
            setSimMode={sim.setSimMode}
            everydayCategory={sim.everydayCategory}
            setEverydayCategory={sim.setEverydayCategory}
            scenarioOptions={sim.scenarioOptions}
            chatTyping={sim.chatTyping}
            chatMessages={sim.chatMessages}
            onCreate={() => sim.createScenario()}
            onInterviewComplete={(value, images) => sim.createScenario(value, images)}
            usedImages={sim.usedSimImages}
            contextImages={sim.contextImages}
            restoredContextImageCount={sim.restoredContextImageCount}
            onReset={sim.resetSimulation}
            onStart={sim.startChat}
            onSend={sim.sendSimulationMessage}
            onEnd={() => sim.setEndConfirm(true)}
            onReport={() => go("report")}
          />
        )}
        {page === "emergency" && (
          <EmergencyPage
            selected={em.emergency}
            text={em.emergencyText}
            setText={em.setEmergencyText}
            attachments={em.emergencyImages}
            setAttachments={em.setEmergencyImages}
            analyzing={em.emergencyAnalyzing}
            onSelect={(key) => em.openEmergencyChat([key])}
            onAnalyze={em.analyzeEmergency}
          />
        )}
        {page === "emergencyChat" && em.emergency && (
          <>
          <EmergencyChat
            categories={em.emergencyKeys.length ? em.emergencyKeys : [em.emergency]}
            submittedText={em.submittedText}
            attachments={em.emergencyImages}
            setAttachments={em.setEmergencyImages}
            messages={em.emergencyMessages}
            typing={em.emergencyTyping}
            onSend={em.sendEmergencyMessage}
            onBack={() => go("emergency")}
          />
          <div className="chat-save-dock"><button type="button" onClick={() => records.saveEmergencyChat(em.emergencyKeys, em.emergencyMessages)}><Icon name="download" size={16} /> 이 대화 저장</button>{records.saveNotice && <span role="status">{records.saveNotice}</span>}</div>
          </>
        )}
        {page === "report" && (
          <ReportPage
            analysis={sim.analysis}
            scenario={sim.scenario}
            onRetry={sim.resetSimulation}
            onEmergency={() => go("emergency")}
            onSave={() => records.saveReport(sim.scenario, sim.analysis)}
            saveNotice={records.saveNotice}
          />
        )}
        {page === "login" && <AuthPage mode="login" onSwitch={() => go("signup")} onLogin={auth.login} />}
        {page === "signup" && <AuthPage mode="signup" onSwitch={() => go("login")} onLogin={auth.login} />}
        {page === "mypage" && (account
          ? <MyPage account={account} reports={records.savedReports} conversations={records.savedChats} onLogout={logout} onRemoveReport={records.removeReport} onRemoveConversation={records.removeConversation} />
          : <AuthGate onLogin={() => { auth.setReturnAfterLogin("mypage"); go("login") }} />)}
      </main>
      {page !== "home" && <Footer onHome={() => go("home")} />}
    </div>
  )
}
