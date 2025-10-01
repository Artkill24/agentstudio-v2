interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

class RateLimiter {
  private store: RateLimitStore = {}
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  async check(identifier: string, maxRequests: number, windowMs: number): Promise<{ allowed: boolean, remaining: number, resetIn: number }> {
    const now = Date.now()
    const key = identifier

    if (!this.store[key] || this.store[key].resetTime < now) {
      this.store[key] = {
        count: 1,
        resetTime: now + windowMs
      }
      return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs }
    }

    this.store[key].count++

    if (this.store[key].count > maxRequests) {
      const resetIn = this.store[key].resetTime - now
      return { allowed: false, remaining: 0, resetIn }
    }

    return {
      allowed: true,
      remaining: maxRequests - this.store[key].count,
      resetIn: this.store[key].resetTime - now
    }
  }

  private cleanup() {
    const now = Date.now()
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key]
      }
    })
  }
}

export const rateLimiter = new RateLimiter()

// Rate limit configurations
export const RATE_LIMITS = {
  // API endpoints
  chat: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 req/min
  document: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 req/min
  research: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 req/min
  
  // Auth endpoints
  auth: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 req/15min
  
  // General API
  api: { maxRequests: 100, windowMs: 60 * 1000 } // 100 req/min
}