#!/bin/sh
# 시작할 때마다 RAG 근거 인덱스를 확인해요. --if-stale은 모델·차원·문단이 바뀌었을 때만 다시 만들어요(약 15초).
# 예전 코드는 --if-stale을 몰라서 오류를 내지만, 아래 || echo가 받아서 기존 인덱스로 그대로 떠요.
set -u
echo "[entrypoint] RAG 인덱스 확인: python -m rag.index --if-stale ${RAG_INDEX_ARGS:-}"
# shellcheck disable=SC2086
python -m rag.index --if-stale ${RAG_INDEX_ARGS:-} || echo "[entrypoint] 인덱스 생성 실패: 피해 대응 API가 503을 반환해요."
exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --timeout-keep-alive 75
