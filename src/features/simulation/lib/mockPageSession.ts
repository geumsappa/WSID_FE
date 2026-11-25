import { ApiError, trainingApi } from "@/api"
import type { MockActionCode, MockPage } from "@/api"

export const trainingChannel = (id: number) => `wsid-training-${id}`

export function openTrainingCheck(trainingId: number) {
  const url = new URL("/", window.location.origin)
  url.searchParams.set("view", "training-check")
  url.searchParams.set("trainingId", String(trainingId))
  // Called directly from the user's click, before any awaited request.
  window.open(url.toString(), "_blank", "noopener,noreferrer")
}

export function notifyTrainingChanged(trainingId: number) {
  if (typeof BroadcastChannel === "undefined") return
  const channel = new BroadcastChannel(trainingChannel(trainingId))
  channel.postMessage({ type: "state-changed" })
  channel.close()
}

/** Only action codes and fixed page metadata cross the API boundary. */
export async function recordPageAction(trainingId: number, actionCode: MockActionCode, page: MockPage, requestId: ReturnType<typeof crypto.randomUUID>,
  filledFields?: string[]) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const detail = await trainingApi.detail(trainingId)
    if (detail.phase !== "SIMULATION" || detail.status !== "ACTIVE") throw new Error("이미 종료되었거나 진행할 수 없는 훈련입니다.")
    if (actionCode === "MOCK_LOGIN_ATTEMPT" && detail.mockPageSubmitted) {
      notifyTrainingChanged(trainingId)
      return
    }
    try {
      const result = await trainingApi.action(trainingId, { stateVersion: detail.stateVersion, actionCode,
        actionMeta: { templateCode: page.templateCode, screenCode: page.screenCode, ...(filledFields ? { filledFields } : {}) } }, requestId)
      notifyTrainingChanged(trainingId)
      return result
    } catch (error) {
      if (error instanceof ApiError && error.code === "DUPLICATE_REQUEST") {
        notifyTrainingChanged(trainingId)
        return
      }
      if (attempt === 0 && error instanceof ApiError && ["STATE_VERSION_CONFLICT", "SESSION_VERSION_CONFLICT"].includes(error.code || "")) continue
      throw error
    }
  }
}
