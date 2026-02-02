# Security Audit & Remediation

## 1. Client-Side API Key Exposure (Critical)
**Risk:** The `VITE_API_KEY` used for Gemini AI is embedded in the client-side JavaScript bundle. This allows any user with access to the application to extract the key and potentially abuse your quota.
**Remediation:**
- **Short Term:** Restrict the API Key in Google Cloud Console to the specific HTTP Referrer (domain) where this app is hosted.
- **Long Term:** Migrate to a backend-for-frontend (BFF) pattern where the API key is kept server-side, or use Google Cloud Vertex AI with the user's OAuth token (similar to the Compute API logic) to eliminate the need for a separate API key.

## 2. Cross-Site Scripting (XSS)
**Risk:** The application renders Markdown content from the AI. While no `dangerouslySetInnerHTML` was found in critical paths, improper Markdown parsing can lead to XSS.
**Remediation:**
- The application uses a custom Markdown parser (`GeminiCard.tsx`) which is safer than raw HTML injection.
- **Action Taken:** Added Content Security Policy (CSP) headers to `nginx.conf` to restrict script execution sources.

## 3. Infrastructure Security
**Risk:** Default Nginx configuration lacks hardening headers.
**Remediation:**
- **Action Taken:** Created a hardened `nginx.conf` with the following headers:
    - `X-Frame-Options: DENY` (Prevents Clickjacking)
    - `X-Content-Type-Options: nosniff` (Prevents MIME sniffing)
    - `Content-Security-Policy` (Restricts data sources to self, Google Compute API, and Google GenAI API)
    - `Strict-Transport-Security` (Enforces HTTPS)

## 4. Access Token Handling
**Status:** Secure.
- The application correctly stores the Google Cloud Access Token in memory (`useState`) and does **not** persist it to `localStorage`. This mitigates the risk of token theft via XSS persistence.

## 5. Dependency Vulnerabilities
**Risk:** Outdated dependencies can introduce vulnerabilities.
**Remediation:**
- Run `npm audit` regularly.
- The `Dockerfile` copies `package.json` separately to allow efficient layer caching but ensures fresh installs.
