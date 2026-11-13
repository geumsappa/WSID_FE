import type { ConversationAnalysis } from "@/features/report/types"

export type SavedReport = { id: string; title: string; type: string; date: string; analysis: ConversationAnalysis }
export type SavedConversation = { id: string; title: string; date: string; messages: { from: "assistant" | "user"; text: string; imageCount?: number }[] }
