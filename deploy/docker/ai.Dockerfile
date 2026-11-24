# FastAPI(AI) 이미지. 빌드 컨텍스트: WSID_AI 레포 루트, 추가 컨텍스트 kit: deploy/docker
FROM python:3.11-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libgomp1 \
 && rm -rf /var/lib/apt/lists/*
RUN useradd --create-home --uid 10001 app
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY --chown=app:app . .
COPY --from=kit --chmod=755 ai-entrypoint.sh /usr/local/bin/ai-entrypoint.sh
RUN mkdir -p data/index && chown app:app data/index
USER app
# OCR 모델(앱과 같은 설정)을 이미지에 미리 받아 둬요. 실패하면 서버 시작 때 다시 받아요.
RUN python -c "from paddleocr import PaddleOCR; PaddleOCR(text_detection_model_name='PP-OCRv5_mobile_det', text_recognition_model_name='korean_PP-OCRv5_mobile_rec', use_doc_orientation_classify=False, use_doc_unwarping=False, use_textline_orientation=False, device='cpu', enable_mkldnn=False)" \
 || echo "OCR model pre-download skipped"
EXPOSE 8000
ENTRYPOINT ["ai-entrypoint.sh"]
