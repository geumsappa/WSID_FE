# FastAPI(AI) 이미지. 빌드 컨텍스트: WSID_AI 레포 루트, 추가 컨텍스트 kit: deploy/docker
FROM python:3.11-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libgomp1 \
 && rm -rf /var/lib/apt/lists/*
RUN useradd --create-home --uid 10001 app
WORKDIR /app
COPY requirements.txt .
# GPU용 torch(수 GB)가 깔리지 않게 CPU용을 먼저 설치해요 (로컬 임베딩 e5-large용)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt
COPY --chown=app:app . .
COPY --from=kit --chmod=755 ai-entrypoint.sh /usr/local/bin/ai-entrypoint.sh
RUN mkdir -p data/index && chown app:app data/index
USER app
# OCR 모델(앱과 같은 설정)을 이미지에 미리 받아 둬요. 실패하면 서버 시작 때 다시 받아요.
RUN python -c "from paddleocr import PaddleOCR; PaddleOCR(text_detection_model_name='PP-OCRv5_mobile_det', text_recognition_model_name='korean_PP-OCRv5_mobile_rec', use_doc_orientation_classify=False, use_doc_unwarping=False, use_textline_orientation=False, device='cpu', enable_mkldnn=False)" \
 || echo "OCR model pre-download skipped"
# 로컬 검색 임베딩 모델(약 2GB)을 이미지에 미리 받아 둬요. 시작할 때마다 받지 않게요.
# sentence-transformers가 없는 예전 코드에서는 건너뛰고, 있는데 받지 못하면 빌드를 멈춰요.
RUN if python -c "import sentence_transformers" 2>/dev/null; then \
      python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('intfloat/multilingual-e5-large', device='cpu')"; \
    else echo "sentence-transformers 없음: 임베딩 모델 미리 받기 건너뜀"; fi
# HF_HUB_OFFLINE은 켜지 않아요: PaddleOCR도 모델을 허브에서 받을 수 있어서, 미리 받기가 실패했을 때 실행 중 다시 받을 길을 막지 않으려고요.
EXPOSE 8000
ENTRYPOINT ["ai-entrypoint.sh"]
