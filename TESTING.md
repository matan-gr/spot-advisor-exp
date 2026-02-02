
# Testing Instructions: Spot Capacity Advisor v2.11.0

This document provides instructions on how to execute, interpret, and extend the test suite for the Spot Capacity Advisor application.

## 1. Prerequisites

Ensure you have the dependencies installed:

```bash
npm install
```

## 2. Running Tests

The application uses `jest` (via `react-scripts`) for unit testing.

### Standard Run
To run all tests once and view the summary:

```bash
npm test -- --watchAll=false
```

### Watch Mode (Development)
To run tests in watch mode (auto-reloads on file changes):

```bash
npm test
```

### Coverage Report
To see code coverage metrics:

```bash
npm test -- --coverage --watchAll=false
```

## 3. Test Structure

Tests are located in `utils.test.ts`. This single entry point covers critical business logic, simulation engines, and API handling utilities.

| Section | Focus |
| :--- | :--- |
| **Error Handling** | Verifies `getFriendlyErrorMessage` handles HTTP 403, 404, 500, and JSON API error bodies correctly. |
| **Request Builder** | Ensures `buildCapacityAdvisorRequest` constructs valid payloads for the GCE API, including handling shape overrides. |
| **Mock Engine** | Validates `generateMockRecommendations` logic. **Note:** The engine uses deterministic hashing. Tests for "randomness" check that different inputs produce different outputs, but the *same* input always produces the *same* output. |
| **Production API** | Uses mocked `fetch` calls to verify `fetchZoneCapacity` and `fetchAllZonesCapacity` handle success, failure, and mixed-state responses gracefully. |

## 4. How to Extend Tests

To add new tests, open `utils.test.ts` and use the standard Jest `describe` and `it` pattern.

**Example: Adding a test for a new machine type**

```typescript
describe('New Feature Logic', () => {
    it('correctly calculates score for C3 instances', () => {
        // Deterministic check: verify C3 scores lower than N2 in mock mode
        const n2 = getNuancedSimulationMetrics('General Purpose', 'n2-standard-4', 'us-central1', 'us-central1-a', 1);
        const c3 = getNuancedSimulationMetrics('Compute Optimized', 'c3-standard-4', 'us-central1', 'us-central1-a', 1);
        
        // C3 is Tier 4 scarcity, N2 is Tier 1
        expect(c3.obtainability).toBeLessThan(n2.obtainability);
    });

    it('verifies obtainability correlates with uptime', () => {
        const metrics = getNuancedSimulationMetrics('Accelerator Optimized', 'a3-highgpu-8g', 'us-east1', 'us-east1-a', 1);
        
        // If obtainability is low (high contention), uptime should also be low (high preemption)
        if (metrics.obtainability < 0.3) {
            expect(metrics.uptimeScore).toBeLessThan(0.5);
        }
    });
});
```

### Testing Scale Scenarios (New in v2.10.0+)

**Scenario 1: High Volume Constraint**
1. Run app in **Simulation Mode**.
2. Select **E2-standard-2**.
3. Set VM Count to **50**. Result should be Green/High.
4. Set VM Count to **5000**. Result should drop significantly (Red/Critical) due to pool depth saturation logic.

**Scenario 2: GPU Scarcity**
1. Select **A3-highgpu-8g** (H100).
2. Set VM Count to **5**. Result might be moderate.
3. Set VM Count to **100**. Result should be **0-10% (Critical/Stockout)**, as 100 Spot H100s in a single zone is physically unlikely.

### Testing the Stale Data Alert (Manual)
1. Run the app in Mock Mode.
2. Perform a Capacity Check.
3. Wait **1 minute**.
4. Verify that a "Warning" toast appears stating that data is stale.

## 5. Troubleshooting Common Issues

*   **"fetch is not defined"**: The test environment mocks `fetch` globally inside the `describe` block. If you add tests outside the main suite, you may need to mock it again.
*   **"Cannot find module"**: Ensure you are importing from local relative paths (e.g., `./types`, `./services/simulationEngine`).

## 6. Continuous Integration

These tests are designed to run in CI/CD pipelines (e.g., GitHub Actions, Cloud Build). Ensure your pipeline executes `npm test -- --watchAll=false` before deploying to catch regressions.
