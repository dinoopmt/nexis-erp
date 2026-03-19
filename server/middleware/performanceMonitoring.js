/**
 * ============================================================================
 * PERFORMANCE MONITORING MIDDLEWARE
 * ============================================================================
 * 
 * Tracks API request performance, database query timings, and identifies
 * bottlenecks in product operations for high-volume data entry scenarios.
 * 
 * Features:
 * - Request/Response timing
 * - Database query performance
 * - Throughput tracking
 * - Performance alerts for slow operations
 * 
 * ============================================================================
 */

const performanceMetrics = {
  requests: [],
  databaseQueries: [],
  slowOperationThreshold: 1000 // ms
};

/**
 * Performance monitoring middleware for Express
 * Tracks request timing and logs performance metrics
 */
export const performanceMonitoringMiddleware = (req, res, next) => {
  const startTime = performance.now();
  const startMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
  
  // Store original send method
  const originalSend = res.send;
  
  // Override send method to capture response
  res.send = function(data) {
    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
    const responseTime = endTime - startTime;
    const memoryDelta = endMemory - startMemory;
    
    // Record metrics
    const metric = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: responseTime.toFixed(2),
      memoryDelta: memoryDelta.toFixed(2),
      timestamp: new Date().toISOString(),
      queryCount: req.queryCount || 0
    };
    
    performanceMetrics.requests.push(metric);
    
    // Alert if slow operation
    if (responseTime > performanceMetrics.slowOperationThreshold) {
      console.warn(`⚠️  SLOW OPERATION DETECTED:`);
      console.warn(`   Path: ${req.path}`);
      console.warn(`   Time: ${responseTime.toFixed(2)}ms`);
      console.warn(`   Memory: +${memoryDelta.toFixed(2)}MB`);
      console.warn(`   Queries: ${req.queryCount || 0}`);
    }
    
    // Keep only last 1000 metrics to avoid memory bloat
    if (performanceMetrics.requests.length > 1000) {
      performanceMetrics.requests.shift();
    }
    
    // Call original send
    return originalSend.call(this, data);
  };
  
  next();
};

/**
 * Track MongoDB query performance
 * Wrap mongoose queries with timing
 */
export const trackMongooseQuery = (model, operationType) => {
  return async (query) => {
    const startTime = performance.now();
    const result = await query;
    const endTime = performance.now();
    const queryTime = endTime - startTime;
    
    const metric = {
      model: model.modelName || 'Unknown',
      operationType,
      queryTime: queryTime.toFixed(2),
      timestamp: new Date().toISOString()
    };
    
    performanceMetrics.databaseQueries.push(metric);
    
    // Alert if slow query
    if (queryTime > 500) {
      console.warn(`⚠️  SLOW DATABASE QUERY:`);
      console.warn(`   Model: ${metric.model}`);
      console.warn(`   Type: ${operationType}`);
      console.warn(`   Time: ${queryTime.toFixed(2)}ms`);
    }
    
    // Keep only last 500 queries
    if (performanceMetrics.databaseQueries.length > 500) {
      performanceMetrics.databaseQueries.shift();
    }
    
    return result;
  };
};

/**
 * Get performance summary
 */
export const getPerformanceSummary = () => {
  if (performanceMetrics.requests.length === 0) {
    return { message: 'No performance data collected yet' };
  }
  
  const requests = performanceMetrics.requests;
  const timings = requests.map(r => parseFloat(r.responseTime));
  const sorted = timings.sort((a, b) => a - b);
  
  const summary = {
    totalRequests: requests.length,
    averageResponseTime: (timings.reduce((a, b) => a + b, 0) / timings.length).toFixed(2),
    minResponseTime: sorted[0].toFixed(2),
    maxResponseTime: sorted[sorted.length - 1].toFixed(2),
    p95ResponseTime: sorted[Math.floor(sorted.length * 0.95)].toFixed(2),
    p99ResponseTime: sorted[Math.floor(sorted.length * 0.99)].toFixed(2),
    slowOperationCount: requests.filter(r => parseFloat(r.responseTime) > performanceMetrics.slowOperationThreshold).length,
    slowOperationThreshold: `${performanceMetrics.slowOperationThreshold}ms`,
    recentRequests: requests.slice(-10),
    slowestRequests: requests.sort((a, b) => parseFloat(b.responseTime) - parseFloat(a.responseTime)).slice(0, 5),
    databaseMetrics: {
      totalQueries: performanceMetrics.databaseQueries.length,
      averageQueryTime: performanceMetrics.databaseQueries.length > 0
        ? (performanceMetrics.databaseQueries.map(q => parseFloat(q.queryTime)).reduce((a, b) => a + b, 0) / performanceMetrics.databaseQueries.length).toFixed(2)
        : 0,
      slowQueryCount: performanceMetrics.databaseQueries.filter(q => parseFloat(q.queryTime) > 500).length
    }
  };
  
  return summary;
};

/**
 * Reset performance metrics
 */
export const resetPerformanceMetrics = () => {
  performanceMetrics.requests = [];
  performanceMetrics.databaseQueries = [];
};

/**
 * API endpoint to get performance metrics
 */
export const getPerformanceMetricsEndpoint = (req, res) => {
  const summary = getPerformanceSummary();
  res.json(summary);
};

export default {
  performanceMonitoringMiddleware,
  trackMongooseQuery,
  getPerformanceSummary,
  resetPerformanceMetrics,
  performanceMetrics
};
