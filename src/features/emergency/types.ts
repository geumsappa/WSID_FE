import type { UploadedImage } from "@/types/common"

export type EmergencyKey = "transfer" | "link" | "app" | "privacy" | "call" | "trade" | "custom"

export type AssistantMessage = {
  from: "assistant" | "user"
  text: string
  images?: UploadedImage[]
}

export type OrganizationKey = "police" | "cyber" | "fss" | "kisa"
