/**
 * Client-Side Rate Limiter (Token Bucket Algorithm)
 * 
 * Implements a strict limit of 60 requests per 60 seconds to prevent
 * API abuse and ensure production stability.
 */

class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // Tokens per ms

  constructor(maxRequests: number, timeWindowSeconds: number) {
    this.maxTokens = maxRequests;
    this.tokens = maxRequests;
    this.lastRefill = Date.now();
    // Calculate how many tokens to add per millisecond
    this.refillRate = maxRequests / (timeWindowSeconds * 1000);
  }

  /**
   * Refills tokens based on time elapsed since last check.
   */
  private refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = elapsed * this.refillRate;

    if (newTokens > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
      this.lastRefill = now;
    }
  }

  /**
   * Attempts to consume a token for an API request.
   * @returns {boolean} True if request is allowed, False if rate limited.
   */
  public tryRequest(): boolean {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Asynchronously waits for a token to become available.
   * This allows batch operations to queue up without failing immediately.
   */
  public async waitForToken(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Calculate wait time
    const needed = 1 - this.tokens;
    const waitMs = (needed / this.refillRate) + 50; // +50ms buffer

    return new Promise(resolve => {
      setTimeout(async () => {
        await this.waitForToken();
        resolve();
      }, waitMs);
    });
  }

  /**
   * Returns metadata about the current limit status.
   */
  public getStatus() {
    this.refill();
    return {
      remaining: Math.floor(this.tokens),
      resetInSeconds: Math.ceil((1 - this.tokens) / (this.refillRate * 1000))
    };
  }
}

// Singleton instance configured for 120 requests in 60 seconds
export const apiRateLimiter = new RateLimiter(120, 60);
