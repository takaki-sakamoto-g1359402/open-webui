FROM python:3.11-slim
WORKDIR /app
COPY aiai_p/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY aiai_p aiai_p
CMD ["python", "-m", "aiai_p.cli.server"]
