import { Icon } from "@/components/Icon"

export function Typing() {
  return (
    <div className="typing" aria-label="답변을 작성하고 있어요">
      <span>
        <Icon name="spark" size={16} />
      </span>
      <div>
        <i />
        <i />
        <i />
      </div>
    </div>
  )
}
