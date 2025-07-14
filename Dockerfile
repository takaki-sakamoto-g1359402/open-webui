FROM python:3.11-slim
WORKDIR /app
COPY AIAI_P/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY AIAI_P AIAI_P
CMD ["python", "AIAI_P/server.py"]
