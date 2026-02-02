
# 📘 Spot Capacity Advisor: Technical Design Document (TDD) & LLD

**Version:** 2.17.2
**Status:** Production Ready
**Maintainers:** Engineering Team
**Last Updated:** December 2024

---

## 1. Executive Summary

The **Spot Capacity Advisor** is a React-based Single Page Application (SPA) designed to solve the opacity problem of Spot VM availability on Google Cloud Platform (GCP). 

By interfacing with the `compute.googleapis.com/alpha` API, it retrieves real-time "Obtainability Scores" for Spot instances. It augments this quantitative data with qualitative analysis from **Gemini 3 Flash**, providing a holistic "Principal Architect" experience that weighs technical feasibility against market conditions (e.g., seasonal contention, hardware lifecycles).

---

## 2. High-Level Architecture (HLD)

The application follows a **Client-Side MVC** pattern, completely decoupled from a backend for the UI logic, but dependent on Google Cloud APIs for data.

```mermaid
graph TD
    User[User / Browser] <-->|Interacts| UI[React UI Layer]
    UI <-->|State/Logic| Controller[useCapacityLogic Hook]
    
    subgraph Services Layer
        Controller -->|Fetch| API[GCP Compute Engine API]
        Controller -->|Stream| AI[Gemini API (Vertex/Studio)]
        Controller -->|Process| Sim[Simulation Engine]
    end
    
    subgraph Data Sources
        API -->|JSON| GCP[Google Cloud Platform]
        AI -->|Tokens| LLM[Google Gemini 3 Flash]
    end
```

### Key Architectural Decisions
1.  **No-Backend Pattern:** To maximize security and reduce latency, the app runs entirely in the client's browser. Access Tokens are kept in memory and never sent to an intermediate server.
2.  **Streaming-First AI:** We utilize Generative AI streaming to reduce Time-To-First-Byte (TTFB) perception. The UI renders the advisor's text character-by-character as it arrives.
3.  **Monolithic State Store:** A single `AppState` object manages the entire application lifecycle, mimicking a Redux store but implemented via React Hooks for simplicity and lower bundle size.

---

## 3. Tech Stack & Frameworks

This application utilizes a modern, performance-oriented stack designed for concurrent data processing and smooth animations.

### Core Frameworks
*   **React 18:** Leverages the new Concurrent Mode rendering features.
*   **TypeScript 5:** Ensures strict type safety across the entire codebase, including API response shapes and State objects.
*   **ES Modules:** Native browser module support via `importmap` for efficient dependency loading without complex bundlers.

### UI & Styling
*   **Tailwind CSS 3.4:** Utility-first CSS framework used for layout, typography, and responsive design. Configured with a custom color palette (`slate`, `indigo`) and Dark Mode support.
*   **Lucide React:** A lightweight, tree-shakeable icon library providing consistent SVG iconography.
*   **Framer Motion 11:** The animation engine powering layout transitions, shared element transitions (gauges), and entrance effects. It handles the physics-based spring animations for the dashboard.

### Data & Logic
*   **Google GenAI SDK v1.34:** The official client for interacting with Gemini models. We use `generateContentStream` for real-time token streaming.
*   **GCP Compute Engine Alpha API:** The backend data source for Spot capacity obtainability scores.
*   **jsPDF & AutoTable:** Client-side PDF generation library used to create downloadable reports of the capacity analysis.

### Infrastructure & Build
*   **Docker:** Multi-stage build process.
    *   *Stage 1:* Node.js builder for compiling React/TSX.
    *   *Stage 2:* Nginx (Alpine) for serving static assets.
*   **Nginx:** Configured as a high-performance static file server with Gzip compression and SPA routing rules (`try_files`).
*   **Google Cloud Build:** CI/CD pipeline for automated container construction.

---

## 4. Low-Level Design (LLD)

### 4.1. Component Hierarchy & Composition
The UI is composed of "Smart" Containers and "Dumb" Presentational Components.

*   **`App.tsx` (Root Container)**
    *   *Responsibility:* Layout shell, Global Provider simulation, Lazy loading `DebugConsole`.
    *   **`Header.tsx`**: Navigation, Theme Toggle (Dark/Light), Environment Switch (Mock/Live).
    *   **`ConfigurationPanel.tsx`**: Form inputs for Region, Machine Type, Count. Includes interactive "Run/Cancel" logic and Token Helper.
        *   `Autocomplete.tsx`: Fuzzy search logic for 150+ machine types.
        *   `RegionAutocomplete.tsx`: Filterable dropdown with continent metadata.
    *   **`ResultsDashboard.tsx`**: The main data visualization view.
        *   `ScoreGauge.tsx`: SVG-based animated meter using `framer-motion` physics. Wrapped in `React.memo` for concurrency.
        *   `ZoneDistributionChart.tsx`: Bar chart visualizing availability spread. Wrapped in `React.memo`.
        *   `ZoneComparisonChart.tsx`: Detailed tabular view with recursive expansion rows. Wrapped in `React.memo`.
        *   `GeminiCard.tsx`: Markdown renderer for AI insights. Wrapped in `React.memo`.

### 4.2. State Management Strategy (`useCapacityLogic.ts`)
We employ a custom hook acting as a Controller.

*   **State Interface (`AppState`):**
    ```typescript
    interface AppState {
      // Configuration inputs
      project: string;
      region: string;
      selectedMachineType: string;
      
      // Request parameters
      size: number;
      targetShape: TargetShape; // 'ANY' | 'BALANCED'
      
      // Async states
      loading: boolean;
      groundingLoading: boolean;
      
      // Data containers
      result: CapacityAdvisorResponse | null;
      groundingMetadata: GroundingMetadata | null;
      
      // Observability
      debugData: DebugData; // Full HTTP/Log traces
    }
    ```
*   **Persistence:** `useEffect` hooks automatically sync critical configuration (Project, Region, Machine Type) to `localStorage`, ensuring user context is preserved between reloads.

### 4.3. Services Layer Detail

#### A. API Service (`services/apiService.ts`)
*   **Rate Limiting:** Implements a **Token Bucket Algorithm** (`services/rateLimiter.ts`) enforcing a strict limit (e.g., 60 req/min) to prevent quota exhaustion during rapid UI interactions.
*   **Logic Enhancement:** The Production API service now includes "Stockout Detection". If the GCP API returns an empty recommendation list (common for scarce resources), the service intercepts this and throws a structured `Stockout` error, ensuring the UI displays a helpful error message rather than a blank chart.

#### B. Gemini Service (`services/geminiService.ts`)
*   **Generator Pattern:** Uses TypeScript `async function*` to yield multiple data types in a single stream.
    *   `yield { type: 'debug' }`: Sends the constructed prompt to the Debug Console immediately.
    *   `yield { type: 'text' }`: Streams the markdown content.
    *   `yield { type: 'metadata' }`: Asynchronously captures Google Search Grounding URLs.
*   **Quota Awareness:** The system prompt has been engineered to explicitly warn users about Project Quotas vs Spot Capacity, as this is a common failure mode.

#### C. Simulation Engine (`services/simulationEngine.ts`)
*   **Depth-Based Modeling:** The simulation now calculates a "Spot Pool Depth" for every machine family. This allows realistic "Stockout" simulation.
*   **Saturation Logic:** If a user requests 150 GPUs in a region with an estimated depth of 50, the score drops to <10% (Critical/Stockout), reflecting the reality of hardware constraints.
*   **Balanced Shape Intelligence:** When "Balanced" distribution is selected, the engine splits the request size across zones *before* calculating saturation, resulting in higher obtainability scores compared to "Single Zone" requests of the same total size.

### 4.4. Data Flow Logic

1.  **Initialization:** `App.tsx` mounts -> `useCapacityLogic` hydrates state from `localStorage`.
2.  **Input:** User modifies "Machine Type" -> `Autocomplete` triggers `updateState`.
3.  **Execution:** User clicks "Run" -> `handleSearch` is invoked.
    *   *Branch A (Mock):* Calls `simulationEngine` -> returns immediate JSON.
    *   *Branch B (Live):* Checks `RateLimiter` -> Calls `fetchAllZonesCapacity` (GCP API) -> Returns JSON.
4.  **Parallel Execution:** Simultaneously, `triggerStream` calls Gemini API.
5.  **Rendering:** `ResultsDashboard` watches `state.result`. Animations trigger via `framer-motion` `AnimatePresence`.

---

## 5. Security & Compliance

### Authentication
*   **Bearer Tokens:** The app requires a valid Google Cloud Access Token.
*   **Scope Requirement:** `https://www.googleapis.com/auth/compute.readonly`.
*   **Handling:** Tokens are stored in React State (Memory) only. They are **not** persisted to LocalStorage to prevent XSS attacks from retrieving long-lived credentials.

### API Security
*   **CORS:** The app assumes it is running in an environment that permits calls to `compute.googleapis.com`.

---

## 6. Performance Optimization

*   **Concurrency:** API calls and AI streaming are fully parallelized. The `useCapacityLogic` hook utilizes aggressive pre-fetching for dropdowns with optimized debounce timers (100ms).
*   **Code Splitting:** The `DebugConsole` is heavy (lots of DOM nodes). It is lazy-loaded using `React.lazy()` and `Suspense` so it doesn't impact the initial load time.
*   **Memoization:** Critical visualization components (`ScoreGauge`, `ZoneComparisonChart`, `GeminiCard`) are wrapped in `React.memo`.
*   **Stale Data:** To ensure decision quality in a high-volatility market, the "Stale Data" alert threshold has been tightened to **1 minute**.

---

## 7. Change Log

### v2.17.2 (UI/UX Overhaul & Production Readiness)
*   **Design System Upgrade:**
    *   Implemented "High-Tech Professional" theme (Glassmorphism 3.0).
    *   Updated color palette to "Electric Indigo" & "True Dark" (Zinc 950/Black).
    *   Refined all UI components (Cards, Charts, Inputs, Buttons) with consistent glass effects.
*   **Component Redesign:**
    *   **GeminiCard:** Added robust Markdown parsing (H1-H3, Tables, Alerts), adaptive text colors for light/dark modes, and improved loading states.
    *   **ZoneComparisonChart:** Updated table styling, header visuals, and text contrast.
    *   **ZoneDistributionChart:** Refined chart colors and tooltip visibility.
    *   **ScoreGauge:** Enhanced visual impact with neon glows and adaptive tooltips.
    *   **MachineTypeInfo:** Standardized icon containers and text styling.
*   **Accessibility & Polish:**
    *   Fixed text contrast issues across the entire application for both Light and Dark modes.
    *   Ensured all text is legible against complex glass backgrounds.
*   **Codebase Cleanup:**
    *   Removed unused files (`utils.test.ts`).
    *   Verified file structure and dependency alignment.
*   **Deployment Prep:**
    *   Updated `nginx.txt` with hardened security headers (CSP, HSTS).
    *   Updated `dockerfile.txt` for multi-stage builds.
    *   Created `dockerignore.txt`.
    *   Updated `deploy.md` with detailed instructions.

### v2.17.1 (Optimization & Polish)
*   **Features:**
    *   **JSON Export:** Added ability to export full analysis results as a structured JSON file for programmatic consumption.
    *   **Smart Notifications:** Implemented intelligent toast stacking to group identical alerts, reducing visual noise during repetitive errors.
*   **UX Refinements:**
    *   **Professional Terminology:** Standardized application text (e.g., "Obtainability Index" -> "Provisioning Success Probability") to align with enterprise capacity planning standards.
    *   **Actionable Alerts:** Enhanced error messages to be more descriptive and solution-oriented.
*   **Performance:**
    *   **Rendering:** Applied `content-visibility: auto` to heavy list components to improve rendering performance on large datasets.
    *   **Mobile Responsiveness:** Added `touch-action: manipulation` to interactive elements to eliminate tap delays on mobile devices.
*   **Bug Fixes:**
    *   **Notification Lifecycle:** Fixed an issue where "Data Freshness" alerts from previous sessions would persist after a reset.

### v2.17.0 (Data-Driven Intelligence & UX Polish)
*   **Gemini AI Enhancements:**
    *   **Real-Time Data Injection:** AI analysis now directly consumes the raw API response (obtainability scores, uptime) to generate grounded, data-driven recommendations.
    *   **Search & Filter:** Added a search input to the AI insights card, allowing users to filter the generated report by keywords.
    *   **Professional Formatting:** Improved Markdown rendering with cleaner lists and structured sections.
    *   **Contextual Tooltips:** Export buttons now display informative tooltips when disabled during AI streaming.
*   **UX Improvements:**
    *   **Concise Error Messages:** Simplified inline error display to reduce visual clutter, relying on the enhanced Toast system for detailed troubleshooting.
    *   **GKE Command:** Enhanced the GKE provisioning command with autoscaling flags and region inference.
    *   **Optimization Guide:** Integrated a comprehensive in-app guide for Spot VM optimization strategies.
*   **Performance:**
    *   **State Optimization:** Refined `useCapacityLogic` to eliminate potential race conditions between API calls and AI streaming.

### v2.16.0 (Feature Expansion & Hardening)
*   **New Features:**
    *   **Advanced Charts:** Integrated `Recharts` for sophisticated data visualization (Composed Charts for comparison, Pie Charts for distribution).
    *   **Battlecard:** Added "Alternatives Battlecard" to Gemini AI prompt for constrained capacity scenarios.
    *   **HTML Export:** Added option to export reports as formatted HTML.
    *   **Smart Reset:** Implemented auto-reset logic when workload configuration changes to ensure data consistency.
    *   **Toast Notifications:** Enhanced notification system with professional, actionable messages for state changes and errors.
*   **Improvements:**
    *   **Validation:** Enforced 9999 VM limit and mandatory Project ID in all modes. Added visual error highlighting.
    *   **Error Handling:** Robust handling for Gemini 429/503 errors and email button crash fix.
    *   **Infrastructure:** Updated to **Node 22** and latest **Alpine Linux** for deployment.
    *   **Cleanup:** Removed email sharing feature and unused assets.

### v2.15.2 (Infrastructure & UX Refinement)
*   **Infrastructure:** Refactored project structure to standard `src/` layout. Updated Docker build process with explicit TypeScript inclusion and npm updates.
*   **Build Stability:** Fixed `tsconfig.json` module resolution and `vite-env.d.ts` to resolve build-time module errors.
*   **UX Improvements:**
    *   **ScoreGauge:** Optimized layout to prevent text truncation on description labels.
    *   **GeminiCard:** Enhanced Markdown rendering (tables, lists, headers), added TL;DR summary, and increased model temperature to 1.0 for richer insights.
*   **Bug Fixes:** Resolved infinite re-render loop in `useStreamAI` via memoization.

### v2.15.1 (Optimizations)
*   **Aesthetics:** Refined "Analyze Capacity" button with a diffuse glow effect for a more elegant UI.
*   **Data Validity:** Added timestamp cache busting to API requests to guarantee fresh capacity scores.
*   **Project Structure:** Added standard `.gitignore`.

### v2.15.0 (Production Release)
*   **API Resilience:** Enforced `no-store` cache policy on all API requests to prevent stale data.
*   **Rendering Optimization:** Implemented strict memoization on `ZoneComparisonChart` rows and `Autocomplete` to reduce main thread blocking during high-frequency AI streaming.
*   **Production Config:** Finalized Nginx configuration for aggressive HTML freshness.
