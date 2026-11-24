import { useEffect } from "react"

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
  // 모양은 styles/theme.css의 .v2-modal-* (v2 디자인: 테두리 없는 회색 면, 큰 글씨·큰 버튼)
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={dismiss}
      className="v2-modal-backdrop"
    >
      <div onClick={(e) => e.stopPropagation()} className="v2-modal">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="v2-modal-actions">
          <button type="button" onClick={onCancel} className="v2-modal-cancel">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className="v2-modal-confirm"
          >
            {confirmLabel}
          </button>
        </div>
        {extraLabel && onExtra && (
          <button
            type="button"
            onClick={onExtra}
            className="v2-modal-extra"
          >
            {extraLabel}
          </button>
        )}
      </div>
    </div>
  )
}
