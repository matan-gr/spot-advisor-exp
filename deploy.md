
# Deployment Guide

## Project Structure

```text
/
├── src/
│   ├── components/       # UI Components (GeminiCard, Charts, etc.)
│   ├── hooks/            # Custom React Hooks (useCapacityLogic, useStreamAI)
│   ├── services/         # API & Logic Services (apiService, simulationEngine)
│   ├── App.tsx           # Main Application Shell
│   ├── config.ts         # Static Configuration (Regions, Machine Types)
│   ├── constants.tsx     # Icons & Global Constants
│   ├── export.ts         # PDF/CSV/JSON Export Logic
│   ├── styles.css        # Global Styles & Tailwind Directives
│   ├── types.ts          # TypeScript Definitions
│   └── utils.ts          # Utility Functions
├── public/               # Static Assets
├── dist/                 # Build Output (Generated)
├── dockerfile.txt        # Docker Build Instructions (Template)
├── nginx.txt             # Nginx Configuration (Template)
├── dockerignore.txt      # Docker Ignore Patterns (Template)
├── package.json          # Dependencies & Scripts
├── vite.config.ts        # Vite Configuration
└── tailwind.config.js    # Tailwind CSS Configuration
```

## Deployment Instructions

### 1. Prepare Configuration Files

Rename the template files to their standard names:

```bash
cp dockerfile.txt Dockerfile
cp nginx.txt nginx.conf
cp dockerignore.txt .dockerignore
```

### 2. Build the Docker Image

Build the container image using the standard Docker CLI. You **MUST** provide your Gemini API Key as a build argument for the client-side AI features to work.

```bash
# Replace [YOUR_GEMINI_API_KEY] with your actual key
docker build \
  --build-arg API_KEY=[YOUR_GEMINI_API_KEY] \
  -t spot-capacity-advisor:latest .
```

### 3. Run the Container

Run the container, mapping port 3000 to your host:

```bash
docker run -d \
  -p 3000:3000 \
  --name spot-advisor \
  spot-capacity-advisor:latest
```

### 4. Environment Variables

The `VITE_API_KEY` is baked into the image during the build process via the `--build-arg`. You do not need to pass it at runtime.

## Google Cloud Run Deployment

Deploying to Cloud Run provides a serverless, scalable environment for your application.

### 1. Prerequisites

Ensure you have the Google Cloud CLI (`gcloud`) installed and authenticated.

```bash
# Login to Google Cloud
gcloud auth login

# Set your project ID
gcloud config set project [YOUR_PROJECT_ID]

# Enable required APIs
gcloud services enable artifactregistry.googleapis.com run.googleapis.com cloudbuild.googleapis.com
```

### 2. Set up Artifact Registry

Create a Docker repository in Artifact Registry to store your container images.

```bash
# Create a repository named 'spot-advisor-repo' in 'us-central1'
gcloud artifacts repositories create spot-advisor-repo \
    --repository-format=docker \
    --location=us-central1 \
    --description="Docker repository for Spot Capacity Advisor"
```

### 3. Build and Push the Image

Use Cloud Build with the provided `cloudbuild.yaml` to build and push the image. You must provide the `_API_KEY` substitution.

```bash
# Submit the build using cloudbuild.yaml
# Replace [YOUR_GEMINI_API_KEY] with your actual key
gcloud builds submit \
    --config cloudbuild.yaml \
    --substitutions=_API_KEY=[YOUR_GEMINI_API_KEY] \
    .
```

*Note: Ensure you have renamed `dockerfile.txt` to `Dockerfile`, `nginx.txt` to `nginx.conf`, and created `cloudbuild.yaml` before running this command.*

### 4. Deploy to Cloud Run

Deploy the container image to Cloud Run.

```bash
gcloud run deploy spot-advisor \
    --image us-central1-docker.pkg.dev/[YOUR_PROJECT_ID]/spot-advisor-repo/spot-advisor:latest \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --port 3000 \
    --memory 512Mi
```

*   `--allow-unauthenticated`: Makes the application accessible publicly. Remove this flag if you want to restrict access to authenticated users only.
*   `--port 3000`: Matches the port exposed in the Dockerfile and Nginx config.

### 5. Verify Deployment

After the deployment completes, the command will output a Service URL (e.g., `https://spot-advisor-xyz-uc.a.run.app`). Open this URL in your browser to access the application.

## Security Notes

- **Nginx Hardening:** The provided `nginx.conf` includes strict security headers (CSP, X-Frame-Options, HSTS) to protect the application.
- **Non-Root User:** For higher security in production, consider updating the Dockerfile to run Nginx as a non-root user.
- **API Keys:** The application requires a Google Cloud Access Token for "Live Mode". This token is **never** stored in `localStorage` or cookies; it is held only in React state memory for the duration of the session.

## Troubleshooting

- **404 on Refresh:** The Nginx config is set up to handle SPA routing (`try_files $uri $uri/ /index.html`), so refreshing deep links should work correctly.
- **CORS Errors:** Ensure your Google Cloud Project has the correct CORS policy applied if you are hitting APIs directly, or use a proxy.

