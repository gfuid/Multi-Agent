# 1. Cloud ko bol rahe hain ki ek fresh lightweight Python 3.11 ka system lo
FROM python:3.11-slim

# 2. Faltu temp files (.pyc) mat banao taaki memory waste na ho
ENV PYTHONDONTWRITEBYTECODE=1

# 3. Jo bhi print ho raha hai (logs), wo turant screen pe dikhao
ENV PYTHONUNBUFFERED=1

# 4. Server ke andar ek main folder banao jiska naam "/app" ho
WORKDIR /app

# 5. Linux ke basic tools install karo taaki koi library install hote waqt fail na ho
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 6. Hamari requirements.txt file ko server ke andar copy karo
COPY requirements.txt .

# 7. Sari Python libraries (fastapi, langgraph, tavily, etc.) install karo
RUN pip install --no-cache-dir -r requirements.txt

# 8. Hamara sara Python code (api.py, agent.py, tools.py) server ke andar daal do
COPY . .

# 9. Server ka Port 8000 open karo taaki internet se requests aa sakein
EXPOSE 8000

# 10. Finally, FastAPI server chalu karne ka command chalao!
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
