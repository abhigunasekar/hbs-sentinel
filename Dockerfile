FROM python:3.11-slim

# Cache bust: 2026-03-22-v3
ARG CACHEBUST=3

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all project files
COPY . .

# Expose port
EXPOSE 8000

# Run from root using run.py which sets up sys.path correctly
CMD ["python", "run.py"]
