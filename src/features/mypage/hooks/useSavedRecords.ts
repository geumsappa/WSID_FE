import { useEffect, useState } from "react"
import type { Page } from "@/types/common"
import { formatDate } from "@/lib/date"
import { readStore } from "@/lib/storage"
import type { DemoAccount } from "@/features/auth/types"
import { emergencyData } from "@/features/emergency/data/emergencyData"
import type { AssistantMessage, EmergencyKey } from "@/features/emergency/types"
import type { ConversationAnalysis } from "@/features/report/types"
import type { Scenario } from "@/features/simulation/types"
import type { SavedConversation, SavedReport } from "../types"

const reportsKey = (email: string) => `wsid-reports-${email}`
const conversationsKey = (email: string) => `wsid-conversations-${email}`

// 마이페이지에 저장하는 리포트·긴급대응 대화 기록(계정별 localStorage)을 담당합니다.
// 백엔드 연결 시 이 훅 안의 localStorage 접근을 API 호출로 교체합니다.
export function useSavedRecords(account: DemoAccount | null, requireLogin: (destination: Page) => boolean) {
  const [savedReports, setSavedReports] = useState<SavedReport[]>([])
  const [savedChats, setSavedChats] = useState<SavedConversation[]>([])
  const [saveNotice, setSaveNotice] = useState("")
  useEffect(() => {
    setSavedReports(account ? readStore<SavedReport[]>(reportsKey(account.email), []) : [])
    setSavedChats(account ? readStore<SavedConversation[]>(conversationsKey(account.email), []) : [])
  }, [account])
  const saveReport = (scenario: Scenario, analysis: ConversationAnalysis) => {
    if (!requireLogin("report")) return
    if (!account) return
    const item: SavedReport = { id: crypto.randomUUID(), title: scenario.title, type: "금융사기 시뮬레이션", date: formatDate(), analysis }
    const next = [item, ...savedReports.filter(r => !(r.title === item.title && r.analysis.score === item.analysis.score && r.date === item.date))]
    setSavedReports(next); localStorage.setItem(reportsKey(account.email), JSON.stringify(next)); setSaveNotice("리포트를 마이페이지에 저장했어요.")
  }
  const saveEmergencyChat = (emergencyKeys: EmergencyKey[], emergencyMessages: AssistantMessage[]) => {
    if (!requireLogin("emergencyChat")) return
    if (!account || !emergencyMessages.length) return
    const item: SavedConversation = { id: crypto.randomUUID(), title: emergencyKeys.length ? emergencyKeys.map((key) => emergencyData[key].title).join(" · ") : "긴급 대응 대화", date: formatDate(), messages: emergencyMessages.map(m => ({ from: m.from, text: m.text, imageCount: m.images?.length || 0 })) }
    const next = [item, ...savedChats]; setSavedChats(next)
    try { localStorage.setItem(conversationsKey(account.email), JSON.stringify(next)); setSaveNotice("긴급대응 대화를 저장했어요. 사진 원본은 저장하지 않아요.") }
    catch { setSavedChats(savedChats); setSaveNotice("저장 공간이 부족해 저장하지 못했어요.") }
  }
  const removeReport = (id: string) => {
    if (!account) return
    const next = savedReports.filter(x => x.id !== id); setSavedReports(next); localStorage.setItem(reportsKey(account.email), JSON.stringify(next))
  }
  const removeConversation = (id: string) => {
    if (!account) return
    const next = savedChats.filter(x => x.id !== id); setSavedChats(next); localStorage.setItem(conversationsKey(account.email), JSON.stringify(next))
  }
  const clearSaveNotice = () => setSaveNotice("")
  return { savedReports, savedChats, saveNotice, saveReport, saveEmergencyChat, removeReport, removeConversation, clearSaveNotice }
}
