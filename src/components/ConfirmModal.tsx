import { useEffect } from "react"
import type React from "react"

/**
 * onDismiss: 바깥을 누르거나 Esc를 눌렀을 때. 없으면 onCancel과 같아요.
 * (취소 버튼이 "새로 시작"처럼 실제 동작일 때는 onDismiss로 그냥 닫히게 해요)
 */
export function ConfirmModal({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel, onDismiss, extraLabel, onExtra }: {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  onDismiss?: () => void
  /** 세 번째 선택지 (예: "저장 없이 나가기"). 두 버튼 아래에 작은 글자 버튼으로 보여요 */
  extraLabel?: string
  onExtra?: () => void
}) {
  const dismiss = onDismiss ?? onCancel
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [dismiss])
  const buttonBase: React.CSSProperties = {
    flex: 1,
    height: 48,
    padding: "0 16px",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1,
    whiteSpace: "nowrap",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  }
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={dismiss}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", display: "grid", placeItems: "center", zIndex: 1000, padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 20, padding: "28px 24px 24px", width: "100%", maxWidth: 360, textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}
      >
        <h2 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 800, color: "#0f172a", lineHeight: 1.4 }}>{title}</h2>
        <p style={{ margin: "0 0 24px", fontSize: 15, lineHeight: 1.6, color: "#475569", wordBreak: "keep-all" }}>{message}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ ...buttonBase, background: "#fff", color: "#334155", border: "1px solid #cbd5e1" }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            style={{ ...buttonBase, background: "#1d6fe0", color: "#fff", border: "none" }}
          >
            {confirmLabel}
          </button>
        </div>
        {extraLabel && onExtra && (
          <button
            type="button"
            onClick={onExtra}
            style={{ marginTop: 14, background: "none", border: "none", color: "#b42318", fontSize: 14, fontWeight: 600, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
          >
            {extraLabel}
          </button>
        )}
      </div>
    </div>
  )
}
