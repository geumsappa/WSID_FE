import type { SessionUser } from "@/api"

/** 로그인한 사용자. 백엔드 세션(AUTH-04·05)이 돌려주는 모양 그대로예요. */
export type Account = SessionUser

/** 화면에 보여 줄 이름. 회원 정보에 이름이 없어서 이메일 앞부분을 씁니다. */
export const displayName = (account: Account) => account.email.split("@")[0]
