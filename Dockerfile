FROM python:3.11-slim

# Set working directory to the backend
WORKDIR /app/backend

# Copy requirements and install dependencies
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy the entire project
COPY . /app/

# Expose port
EXPOSE 8000

# Run uvicorn from the backend directory (bare imports work correctly)
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
