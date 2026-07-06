FROM python:3.12-slim
WORKDIR /code
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Hugging Face Spaces expone el puerto 7860.
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
