## ==========================================
## Stage 1: Builder
## ==========================================
#FROM python:3.11-slim AS builder
#
## Set environment variables to optimize Python
#ENV PYTHONDONTWRITEBYTECODE=1
#ENV PYTHONUNBUFFERED=1
#
#WORKDIR /app
#
## Install build dependencies required for compiling C-extensions
#RUN apt-get update && apt-get install -y --no-install-recommends \
#    build-essential \
#    libpq-dev \
#    && rm -rf /var/lib/apt/lists/*
#
## Install dependencies to a temporary directory (/install)
#COPY requirements.txt .
#RUN pip install --no-cache-dir --prefix=/install -r requirements.txt
#
## ==========================================
## Stage 2: Final Image
## ==========================================
#FROM python:3.11-slim
#
## Set environment variables
#ENV PYTHONDONTWRITEBYTECODE=1
#ENV PYTHONUNBUFFERED=1
#ENV PORT=8080
#
#WORKDIR /app
#
## Install runtime dependencies only (keeps the final image small)
#RUN apt-get update && apt-get install -y --no-install-recommends \
#    libpq5 \
#    && rm -rf /var/lib/apt/lists/*
#
## Copy compiled dependencies from the builder stage
#COPY --from=builder /install /usr/local
#
## Create a non-root user for security and assign ownership of the /app directory
#RUN useradd -m -r appuser && chown -R appuser /app
#
## Switch to the non-root user before copying code or running the app
#USER appuser
#
## Copy application code
#COPY . .
#
## Start the application using Uvicorn
#CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
# ==========================================
# Stage 1: Builder
# ==========================================
# ==========================================
# Stage 1: Builder
# ==========================================
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    python3-dev \
    libffi-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ==========================================
# Stage 2: Final Image
# ==========================================
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local

# Create a non-root user (no need to chown /app here yet)
RUN useradd -m -r appuser

# Switch to the non-root user
USER appuser

# FIX: Copy application code AND set ownership to appuser in one step
COPY --chown=appuser:appuser . .

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]