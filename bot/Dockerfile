FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY bot/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY bot/bot.py bot/config.py ./

ENV PYTHONUNBUFFERED=1

CMD ["python", "-u", "bot.py"]
