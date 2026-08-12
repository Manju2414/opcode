import { ConsentManager } from './consent';
import type {
  EventName,
  AnalyticsSettings
} from './types';

export * from './types';
export * from './events';
export { ConsentManager } from './consent';
export { ResourceMonitor, resourceMonitor } from './resourceMonitor';

/**
 * No-op analytics service. This fork removes all telemetry/PostHog
 * integration so no event ever leaves the machine, while keeping the
 * public API intact for the many call sites across the app.
 */
class AnalyticsService {
  private static instance: AnalyticsService;
  private consentManager: ConsentManager;

  private constructor() {
    this.consentManager = ConsentManager.getInstance();
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  async initialize(): Promise<void> {
    await this.consentManager.initialize();
  }

  async enable(): Promise<void> {}

  async disable(): Promise<void> {}

  async deleteAllData(): Promise<void> {
    await this.consentManager.deleteAllData();
  }

  setScreen(_screenName: string): void {}

  track(_eventName: EventName | string, _properties?: Record<string, any>): void {}

  identify(_traits?: Record<string, any>): void {}

  shutdown(): void {}

  // Convenience methods
  isEnabled(): boolean {
    return false;
  }

  hasConsented(): boolean {
    return false;
  }

  getSettings(): AnalyticsSettings | null {
    return this.consentManager.getSettings();
  }
}

// Export singleton instance
export const analytics = AnalyticsService.getInstance();

// Export for direct usage
export default analytics;

/**
 * Performance tracking utility for better insights
 */
export class PerformanceTracker {
  private static performanceData: Map<string, number[]> = new Map();
  
  /**
   * Record a performance metric
   * Automatically tracks percentiles when enough data is collected
   */
  static recordMetric(operation: string, duration: number): void {
    if (!this.performanceData.has(operation)) {
      this.performanceData.set(operation, []);
    }
    
    const data = this.performanceData.get(operation)!;
    data.push(duration);
    
    // Keep last 100 measurements for memory efficiency
    if (data.length > 100) {
      data.shift();
    }
    
    // Track percentiles every 10 measurements
    if (data.length >= 10 && data.length % 10 === 0) {
      const sorted = [...data].sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      
      analytics.track('performance_percentiles', {
        operation,
        p50,
        p95,
        p99,
        sample_size: data.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: data.reduce((a, b) => a + b, 0) / data.length,
      });
    }
  }
  
  /**
   * Get current statistics for an operation
   */
  static getStats(operation: string): { p50: number; p95: number; p99: number; count: number } | null {
    const data = this.performanceData.get(operation);
    if (!data || data.length === 0) return null;
    
    const sorted = [...data].sort((a, b) => a - b);
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      count: data.length,
    };
  }
  
  /**
   * Clear data for an operation or all operations
   */
  static clear(operation?: string): void {
    if (operation) {
      this.performanceData.delete(operation);
    } else {
      this.performanceData.clear();
    }
  }
}
