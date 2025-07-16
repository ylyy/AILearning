// Performance monitoring utility
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private marks: Map<string, number> = new Map();
  private observers: Map<string, (metric: PerformanceMetric) => void> = new Map();

  private constructor() {
    // Initialize performance monitoring
    this.setupGlobalErrorHandling();
    this.setupMemoryMonitoring();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start timing an operation
   */
  startTimer(name: string): void {
    this.marks.set(name, performance.now());
  }

  /**
   * End timing an operation and record the duration
   */
  endTimer(name: string): number {
    const startTime = this.marks.get(name);
    if (!startTime) {
      console.warn(`Timer '${name}' was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.recordMetric(name, duration);
    this.marks.delete(name);

    return duration;
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);

    // Keep only last 100 measurements
    if (this.metrics.get(name)!.length > 100) {
      this.metrics.get(name)!.shift();
    }

    // Notify observers
    this.notifyObservers(name, value);
  }

  /**
   * Get average performance for a metric
   */
  getAverage(name: string): number {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return 0;

    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  /**
   * Get performance statistics for a metric
   */
  getStats(name: string): PerformanceStats {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0, median: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = sum / values.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const median = sorted[Math.floor(sorted.length / 2)];

    return {
      count: values.length,
      average,
      min,
      max,
      median,
    };
  }

  /**
   * Monitor memory usage
   */
  getMemoryUsage(): MemoryInfo {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      };
    }
    return { used: 0, total: 0, limit: 0, percentage: 0 };
  }

  /**
   * Monitor network performance
   */
  async measureNetworkLatency(url: string): Promise<number> {
    const startTime = performance.now();
    try {
      await fetch(url, { method: 'HEAD' });
      const duration = performance.now() - startTime;
      this.recordMetric('network_latency', duration);
      return duration;
    } catch (error) {
      this.recordMetric('network_errors', 1);
      return -1;
    }
  }

  /**
   * Monitor bundle size
   */
  getBundleSize(): BundleInfo {
    const scripts = document.querySelectorAll('script[src]');
    let totalSize = 0;
    const scriptSizes: Record<string, number> = {};

    scripts.forEach((script) => {
      const src = script.getAttribute('src');
      if (src) {
        // This is a rough estimation - in real implementation you'd need to fetch the actual sizes
        scriptSizes[src] = 0;
      }
    });

    return {
      totalSize,
      scriptSizes,
      scriptCount: scripts.length,
    };
  }

  /**
   * Monitor render performance
   */
  measureRenderTime(componentName: string): () => void {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(`render_${componentName}`, duration);
    };
  }

  /**
   * Monitor API call performance
   */
  async measureApiCall<T>(
    apiCall: () => Promise<T>,
    endpoint: string
  ): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;
      this.recordMetric(`api_${endpoint}`, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(`api_${endpoint}_error`, duration);
      throw error;
    }
  }

  /**
   * Monitor image loading performance
   */
  measureImageLoad(src: string): Promise<number> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const img = new Image();
      
      img.onload = () => {
        const duration = performance.now() - startTime;
        this.recordMetric('image_load', duration);
        resolve(duration);
      };

      img.onerror = () => {
        const duration = performance.now() - startTime;
        this.recordMetric('image_load_error', duration);
        resolve(-1);
      };

      img.src = src;
    });
  }

  /**
   * Add performance observer
   */
  addObserver(name: string, callback: (metric: PerformanceMetric) => void): void {
    this.observers.set(name, callback);
  }

  /**
   * Remove performance observer
   */
  removeObserver(name: string): void {
    this.observers.delete(name);
  }

  /**
   * Get all performance metrics
   */
  getAllMetrics(): Record<string, PerformanceStats> {
    const result: Record<string, PerformanceStats> = {};
    for (const [name] of this.metrics) {
      result[name] = this.getStats(name);
    }
    return result;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.marks.clear();
  }

  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport {
    const memory = this.getMemoryUsage();
    const bundle = this.getBundleSize();
    const metrics = this.getAllMetrics();

    return {
      timestamp: new Date().toISOString(),
      memory,
      bundle,
      metrics,
      summary: this.generateSummary(metrics),
    };
  }

  private setupGlobalErrorHandling(): void {
    window.addEventListener('error', (event) => {
      this.recordMetric('js_errors', 1);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.recordMetric('unhandled_promises', 1);
    });
  }

  private setupMemoryMonitoring(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = this.getMemoryUsage();
        if (memory.percentage > 80) {
          this.recordMetric('memory_warning', 1);
        }
      }, 30000); // Check every 30 seconds
    }
  }

  private notifyObservers(name: string, value: number): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
    };

    for (const callback of this.observers.values()) {
      try {
        callback(metric);
      } catch (error) {
        console.warn('Performance observer error:', error);
      }
    }
  }

  private generateSummary(metrics: Record<string, PerformanceStats>): PerformanceSummary {
    const apiMetrics = Object.entries(metrics)
      .filter(([name]) => name.startsWith('api_'))
      .map(([, stats]) => stats.average);

    const renderMetrics = Object.entries(metrics)
      .filter(([name]) => name.startsWith('render_'))
      .map(([, stats]) => stats.average);

    return {
      averageApiLatency: apiMetrics.length > 0 ? apiMetrics.reduce((a, b) => a + b, 0) / apiMetrics.length : 0,
      averageRenderTime: renderMetrics.length > 0 ? renderMetrics.reduce((a, b) => a + b, 0) / renderMetrics.length : 0,
      totalErrors: Object.entries(metrics)
        .filter(([name]) => name.includes('error'))
        .reduce((sum, [, stats]) => sum + stats.count, 0),
      totalApiCalls: Object.entries(metrics)
        .filter(([name]) => name.startsWith('api_') && !name.includes('error'))
        .reduce((sum, [, stats]) => sum + stats.count, 0),
    };
  }
}

// Types
export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
}

export interface PerformanceStats {
  count: number;
  average: number;
  min: number;
  max: number;
  median: number;
}

export interface MemoryInfo {
  used: number;
  total: number;
  limit: number;
  percentage: number;
}

export interface BundleInfo {
  totalSize: number;
  scriptSizes: Record<string, number>;
  scriptCount: number;
}

export interface PerformanceSummary {
  averageApiLatency: number;
  averageRenderTime: number;
  totalErrors: number;
  totalApiCalls: number;
}

export interface PerformanceReport {
  timestamp: string;
  memory: MemoryInfo;
  bundle: BundleInfo;
  metrics: Record<string, PerformanceStats>;
  summary: PerformanceSummary;
}

// Convenience functions
export const performanceMonitor = PerformanceMonitor.getInstance();

// React performance hooks
export const usePerformanceMonitor = () => {
  return {
    startTimer: performanceMonitor.startTimer.bind(performanceMonitor),
    endTimer: performanceMonitor.endTimer.bind(performanceMonitor),
    measureApiCall: performanceMonitor.measureApiCall.bind(performanceMonitor),
    measureRenderTime: performanceMonitor.measureRenderTime.bind(performanceMonitor),
    getMemoryUsage: performanceMonitor.getMemoryUsage.bind(performanceMonitor),
    generateReport: performanceMonitor.generateReport.bind(performanceMonitor),
  };
};