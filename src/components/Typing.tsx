import { HelperAvatar } from "@/components/HelperAvatar"

export function Typing() {
  return (
    <div className="typing" aria-label="답변을 작성하고 있어요">
      <span className="v2-avatar">
        <HelperAvatar size={36} />
      </span>
      <div>
        <i />
        <i />
        <i />
      </div>
    </div>
  )
}
