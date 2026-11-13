export type Page = "home" | "simulation" | "emergency" | "emergencyChat" | "report" | "login" | "signup" | "mypage"

export type IconName = "shield" | "chat" | "bell" | "spark" | "building" | "send" | "link" | "phone" | "user" | "app" | "check" | "lock" | "search" | "arrow" | "download" | "refresh" | "alert" | "close" | "cart" | "image"

export interface UploadedImage {
  name: string
  preview: string
  id: string
}
