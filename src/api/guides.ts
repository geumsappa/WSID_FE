// 사기 유형·대응 가이드 API (GUIDE-01~04). 로그인 불필요.
import { request } from "./client"
import { USE_MOCK } from "./config"
import { ENDPOINTS } from "./endpoints"
import { guidesMock } from "./mock/guidesMock"
import type { FraudTypeDetail, FraudTypeSummary, Institution, ResponseCard } from "./types"

const E = ENDPOINTS.guides

export const guidesApi = {
  /** GUIDE-01 */
  fraudTypes: (): Promise<FraudTypeSummary[]> => (USE_MOCK ? guidesMock.fraudTypes() : request(E.fraudTypes)),
  /** GUIDE-02 */
  fraudType: (code: string): Promise<FraudTypeDetail> => (USE_MOCK ? guidesMock.fraudType(code) : request(E.fraudType(code))),
  /** GUIDE-03. codes를 주면 해당 카드만: ?codes=TRANSFER_RESPONSE,MALICIOUS_APP_RESPONSE */
  responseCards: (codes?: string[]): Promise<ResponseCard[]> =>
    USE_MOCK ? guidesMock.responseCards(codes)
      : request(E.responseCards, { query: { codes: codes?.length ? codes.join(",") : undefined } }),
  /** GUIDE-04 */
  institutions: (): Promise<Institution[]> => (USE_MOCK ? guidesMock.institutions() : request(E.institutions)),
}
