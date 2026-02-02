# Deployment Guide

This guide explains how to deploy the Spot Capacity Advisor to Google Cloud Run.

## Project Structure

```text
/
├── src/                  # Application Source Code
├── public/               # Static Assets
├── dockerfile.txt        # Docker Build Instructions (Template)
├── nginx.txt             # Nginx Configuration (Template)
├── cloudbuild.yaml       # Cloud Build Configuration
├── package.json          # Dependencies
├── vite.config.ts        # Vite Config
└── tailwind.config.js    # Tailwind Config
```

## Quick Start: Cloud Run Deployment

The easiest way to deploy is using Google Cloud Build and Cloud Run.

### 1. Prerequisites

- Google Cloud CLI (`gcloud`) installed and authenticated.
- A Google Cloud Project with billing enabled.

```bash
# Login and set project
gcloud auth login
gcloud config set project [YOUR_PROJECT_ID]

# Enable required services
gcloud services enable artifactregistry.googleapis.com run.googleapis.com cloudbuild.googleapis.com
```

### 2. Set up Artifact Registry

You need a Docker repository to store the images.

```bash
gcloud artifacts repositories create spot-advisor-repo \
    --repository-format=docker \
    --location=us-central1 \
    --description="Docker repository for Spot Capacity Advisor"
```

### 3. Build and Push

Use Cloud Build to build the image and push it to Artifact Registry.
Cloud Build will automatically rename the template file `dockerfile.txt` to `Dockerfile` for the build.

**Important:** You must provide your Gemini API Key.

```bash
gcloud builds submit \
    --config cloudbuild.yaml \
    --substitutions=_API_KEY=[YOUR_GEMINI_API_KEY] \
    .
```

### 4. Deploy to Cloud Run

Once the build is complete, deploy the image:

```bash
gcloud run deploy spot-advisor \
    --image us-central1-docker.pkg.dev/[YOUR_PROJECT_ID]/spot-advisor-repo/spot-advisor:latest \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --port 3000
```

### 5. Access Documentation

The full project history and technical documentation is deployed with the application. You can access it at:

`https://[YOUR-CLOUD-RUN-URL]/project_history.html`

## Manual Docker Deployment

If you prefer to run locally or on a VM:

### 1. Prepare Files

```bash
cp dockerfile.txt Dockerfile
```

### 2. Build

```bash
docker build \
  --build-arg API_KEY=[YOUR_GEMINI_API_KEY] \
  -t spot-advisor .
```

### 3. Run

```bash
docker run -d -p 3000:3000 spot-advisor
```

Access the app at `http://localhost:3000`.

## Configuration Details

### Dockerfile (from `dockerfile.txt`)
- **Base Image:** `node:22-alpine` (Build), `nginx:alpine` (Serve).
- **Port:** Exposes port `3000`.
- **Security:** Runs as non-root user `nginx`.

### Nginx (`nginx.txt` -> `nginx.conf`)
- **Security Headers:** HSTS, X-Frame-Options, CSP enabled.
- **SPA Routing:** Configured to redirect all 404s to `index.html`.
- **Compression:** Gzip enabled for performance.

### Environment Variables
- `VITE_API_KEY`: Injected at build time via `--build-arg`. This key is visible in the client-side code, so ensure you restrict its usage in the Google AI Studio console.
