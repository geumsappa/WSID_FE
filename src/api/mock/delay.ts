import { errorFromCode } from "../client"

/** 서버를 부르는 것처럼 잠깐 기다립니다. */
export const delay = (ms = 500) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

/** 서버의 stateVersion 검사 흉내: 어긋나면 409 STATE_VERSION_CONFLICT */
export function checkVersion(current: number, sent: number) {
  if (current !== sent) throw errorFromCode(409, "STATE_VERSION_CONFLICT")
}

/** mock에서 쓰는 숫자 ID */
let seq = 100
export const nextId = () => ++seq
