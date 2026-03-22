FROM python:3.11-slim

# Install dependencies at /app level
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all project files
COPY . .

# Copy entrypoint and make executable
RUN chmod +x /app/entrypoint.sh

# Set working directory to backend (so bare imports work)
WORKDIR /app/backend

# Expose port
EXPOSE 8000

# Use exec form with bash to handle $PORT variable
ENTRYPOINT ["/bin/bash", "/app/entrypoint.sh"]
