FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Force cache bust on all subsequent layers: 2026-03-22-v4
ARG CACHEBUST=4
RUN echo "Cache bust: $CACHEBUST"

# Copy all project files (always fresh)
COPY . .

# Expose port
EXPOSE 8000

# Run from root using run.py which sets up sys.path correctly
CMD ["python", "run.py"]
