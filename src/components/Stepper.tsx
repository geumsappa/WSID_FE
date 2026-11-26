/** 시뮬레이션 진행 단계 표시 (1 상황 이야기 → 4 결과 리포트). 어르신이 지금 어디쯤인지 알 수 있게 */
const STEPS = ["상황 이야기", "시나리오 확인", "대화 훈련", "결과 리포트"]

export function Stepper({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="v2-stepper" aria-label={`진행 단계 ${STEPS.length}단계 중 ${current}단계`}>
      {STEPS.map((name, i) => {
        const n = i + 1
        const state = n < current ? "done" : n === current ? "current" : "todo"
        return (
          <li key={name} className={state} aria-current={state === "current" ? "step" : undefined}>
            <span className="v2-stepper-dot">
              {state === "done"
                ? <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 L10 17.5 L19 7.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                : n}
            </span>
            <span className="v2-stepper-name">{name}</span>
          </li>
        )
      })}
    </ol>
  )
}
