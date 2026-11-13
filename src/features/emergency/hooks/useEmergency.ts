import { useState } from "react"
import type { Page, UploadedImage } from "@/types/common"
import { maskSensitive } from "@/lib/privacy"
import { emergencyData } from "../data/emergencyData"
import { detectEmergencyKeys, mergeEmergencyKeys } from "../lib/detectEmergency"
import type { AssistantMessage, EmergencyKey } from "../types"

const MASK_NOTICE = "입력하신 내용 중 주민등록번호·카드번호·비밀번호 같은 민감정보는 가려서 처리했어요."

// 긴급 대응 입력·분석·후속 대화 상태를 담당합니다.
export function useEmergency(go: (next: Page) => void) {
  const [emergency, setEmergency] = useState<EmergencyKey | null>(null)
  const [emergencyKeys, setEmergencyKeys] = useState<EmergencyKey[]>([])
  const [emergencyText, setEmergencyText] = useState("")
  const [emergencyImages, setEmergencyImages] = useState<UploadedImage[]>([])
  const [emergencyAnalyzing, setEmergencyAnalyzing] = useState(false)
  const [submittedText, setSubmittedText] = useState("")
  const [emergencyMessages, setEmergencyMessages] =
    useState<AssistantMessage[]>([])
  const [emergencyTyping, setEmergencyTyping] = useState(false)
  const openEmergencyChat = (
    keys: EmergencyKey[],
    text = "",
    attachments: UploadedImage[] = [],
    masked = false,
  ) => {
    setEmergency(keys[0])
    setEmergencyKeys(keys)
    setSubmittedText(text)
    setEmergencyImages(attachments)
    const intro =
      keys.length > 1
        ? `여러 상황이 함께 확인됐어요: ${keys.map((key) => emergencyData[key].title).join(", ")}. 가장 급한 조치부터 순서대로 안내할게요.`
        : emergencyData[keys[0]].intro
    setEmergencyMessages([
      ...(text || attachments.length ? [{ from: "user" as const, text, images: attachments }] : []),
      { from: "assistant", text: masked ? `${MASK_NOTICE} ${intro}` : intro },
    ])
    go("emergencyChat")
  }
  const analyzeEmergency = () => {
    const raw = emergencyText.trim()
    if (!raw && emergencyImages.length === 0) return
    const value = maskSensitive(raw)
    const masked = value !== raw
    if (masked) setEmergencyText(value) // 원문이 화면 상태에 남지 않도록 가린 내용으로 바꿉니다.
    setEmergencyAnalyzing(true)
    const keys = detectEmergencyKeys(value)
    window.setTimeout(() => {
      setEmergencyAnalyzing(false)
      openEmergencyChat(keys, value, emergencyImages, masked)
    }, 750)
  }
  const sendEmergencyMessage = (message: string, images: UploadedImage[] = []) => {
    if ((!message.trim() && !images.length) || emergencyTyping || !emergency) return
    const raw = message.trim()
    const value = maskSensitive(raw)
    const masked = value !== raw
    const found = value ? detectEmergencyKeys(value).filter((key) => key !== "custom") : []
    const addedKeys = found.filter((key) => !emergencyKeys.includes(key))
    if (addedKeys.length) {
      const next = mergeEmergencyKeys(emergencyKeys, addedKeys)
      setEmergencyKeys(next)
      setEmergency(next[0])
    }
    setEmergencyMessages((items) => [...items, { from: "user", text: value, images }])
    if (images.length) setEmergencyImages((items) => [...items, ...images])
    setEmergencyTyping(true)
    window.setTimeout(() => {
      let response =
        "현재 안내된 조치를 우선 진행해 주세요. 판단이 어렵다면 관련 공식 기관에 직접 상담하는 것이 가장 안전합니다."
      if (addedKeys.length)
        response = `새로 확인된 상황(${addedKeys.map((key) => emergencyData[key].title).join(", ")})의 대응 방법을 위 카드에 추가했어요. ${emergencyData[addedKeys[0]].intro}`
      else if (/입력.*안|입력하지|안 했|안했/.test(value))
        response =
          "개인정보를 입력하지 않았다면 정보 노출 위험은 상대적으로 낮을 수 있어요. 다만 파일 다운로드나 앱 설치가 있었는지 확인하고, 의심스러운 사이트에는 다시 접속하지 마세요."
      else if (/설치.*안|설치하지|아무것도 설치/.test(value))
        response =
          "앱을 설치하지 않았다면 악성앱을 통한 피해 가능성은 상대적으로 낮을 수 있어요. 계정이나 금융거래에 이상이 있는지 살펴보고, 걱정되는 부분은 118에 상담할 수 있어요."
      else if (/송금|이체|돈을 보냈/.test(value))
        response =
          "금전 이체가 있었다면 추가 대화를 중단하고 즉시 112와 해당 금융회사에 연락해 지급정지를 요청하세요. 이체 내역과 연락 기록도 보관해 주세요."
      else if (/비밀번호|인증번호|신분증|개인정보/.test(value))
        response =
          "정보를 전달했다면 안전한 기기에서 관련 계정 비밀번호를 변경하고 금융회사에 노출 사실을 알려 주세요. 전달한 정보와 시각도 함께 정리해 두세요."
      if (masked) response = `${MASK_NOTICE} ${response}`
      setEmergencyMessages((items) => [
        ...items,
        { from: "assistant", text: response },
      ])
      setEmergencyTyping(false)
    }, 750)
  }
  return {
    emergency, emergencyKeys, emergencyText, setEmergencyText, emergencyImages, setEmergencyImages,
    emergencyAnalyzing, submittedText, emergencyMessages, emergencyTyping,
    openEmergencyChat, analyzeEmergency, sendEmergencyMessage,
  }
}
