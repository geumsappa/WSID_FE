#!/bin/sh
# RAG 근거 인덱스가 없으면 한 번 만들고 AI 서버를 켜요. 인덱스는 볼륨에 남아서 다음 시작 때는 건너뛰어요.
set -u
if [ -z "$(ls -A data/index 2>/dev/null)" ]; then
  echo "[entrypoint] RAG 인덱스 생성: python -m rag.index ${RAG_INDEX_ARGS:-}"
  # shellcheck disable=SC2086
  python -m rag.index ${RAG_INDEX_ARGS:-} || echo "[entrypoint] 인덱스 생성 실패: 피해 대응 API가 503을 반환해요. OPENAI_API_KEY를 확인하세요."
fi
exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --timeout-keep-alive 75
