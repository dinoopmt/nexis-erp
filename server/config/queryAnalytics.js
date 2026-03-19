/**
 * Query Analytics & Logging System
 * Tracks search queries, performance metrics, and usage patterns
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Analytics data structure
const analytics = {
  totalSearches: 0,
  totalResultsReturned: 0,
  averageQueryTime: 0,
  queryTimes: [],
  popularSearches: new Map(),  // { query: count }
  slowQueries: [],  // Queries taking >500ms
  errorLog: [],
  hourlyMetrics: new Map(),
  totalCacheHits: 0,
  totalCacheMisses: 0,
};

// Log directory setup
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Log a search query with metrics
 */
const logQuery = (query, duration, resultCount, cacheHit = false) => {
  const timestamp = new Date();
  const hour = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')} ${String(timestamp.getHours()).padStart(2, '0')}:00`;

  // Update basic metrics
  analytics.totalSearches++;
  analytics.totalResultsReturned += resultCount;
  analytics.queryTimes.push(duration);
  analytics.averageQueryTime =
    analytics.queryTimes.reduce((a, b) => a + b, 0) / analytics.queryTimes.length;

  // Track cache performance
  if (cacheHit) {
    analytics.totalCacheHits++;
  } else {
    analytics.totalCacheMisses++;
  }

  // Track popular searches
  const queryLower = query.toLowerCase().trim();
  analytics.popularSearches.set(
    queryLower,
    (analytics.popularSearches.get(queryLower) || 0) + 1
  );

  // Track hourly metrics
  if (!analytics.hourlyMetrics.has(hour)) {
    analytics.hourlyMetrics.set(hour, { count: 0, avgTime: [], errors: 0 });
  }
  const hourlyData = analytics.hourlyMetrics.get(hour);
  hourlyData.count++;
  hourlyData.avgTime.push(duration);

  // Track slow queries (>500ms)
  if (duration > 500) {
    analytics.slowQueries.push({
      query,
      duration,
      resultCount,
      timestamp: timestamp.toISOString(),
      cacheHit,
    });

    // Keep only last 100 slow queries
    if (analytics.slowQueries.length > 100) {
      analytics.slowQueries.shift();
    }
  }

  // Log to file for persistence
  logToFile({
    timestamp: timestamp.toISOString(),
    query,
    duration: `${duration}ms`,
    resultCount,
    cacheHit,
    cachePercentage: analytics.totalCacheHits / analytics.totalSearches * 100,
  });
};

/**
 * Log errors
 */
const logError = (query, error) => {
  const timestamp = new Date();
  const hour = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')} ${String(timestamp.getHours()).padStart(2, '0')}:00`;

  analytics.errorLog.push({
    query,
    error: error.message,
    timestamp: timestamp.toISOString(),
  });

  // Keep only last 100 errors
  if (analytics.errorLog.length > 100) {
    analytics.errorLog.shift();
  }

  // Update hourly error count
  if (analytics.hourlyMetrics.has(hour)) {
    analytics.hourlyMetrics.get(hour).errors++;
  }

  logToFile({
    timestamp: timestamp.toISOString(),
    type: 'ERROR',
    query,
    error: error.message,
  });
};

/**
 * Write analytics to file (JSON Lines format for easy parsing)
 */
const logToFile = (data) => {
  try {
    const logPath = path.join(logsDir, 'search-analytics.log');
    fs.appendFileSync(logPath, JSON.stringify(data) + '\n');
  } catch (err) {
    console.error('❌ Failed to write analytics log:', err.message);
  }
};

/**
 * Get analytics summary
 */
const getAnalyticsSummary = () => {
  // Calculate top 10 searches
  const topSearches = Array.from(analytics.popularSearches.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([query, count]) => ({ query, count }));

  // Calculate cache hit percentage
  const totalRequests = analytics.totalCacheHits + analytics.totalCacheMisses;
  const cacheHitPercentage = totalRequests > 0 
    ? ((analytics.totalCacheHits / totalRequests) * 100).toFixed(2)
    : 0;

  return {
    totalSearches: analytics.totalSearches,
    totalResultsReturned: analytics.totalResultsReturned,
    averageQueryTime: `${analytics.averageQueryTime.toFixed(2)}ms`,
    cacheHitRate: `${cacheHitPercentage}%`,
    totalCacheHits: analytics.totalCacheHits,
    totalCacheMisses: analytics.totalCacheMisses,
    topSearches,
    slowQueriesCount: analytics.slowQueries.length,
    recentSlowQueries: analytics.slowQueries.slice(-5),
    errorCount: analytics.errorLog.length,
    recentErrors: analytics.errorLog.slice(-5),
    hourlyMetrics: Array.from(analytics.hourlyMetrics.entries()).map(([hour, data]) => ({
      hour,
      searchCount: data.count,
      averageTime: `${(data.avgTime.reduce((a, b) => a + b, 0) / data.avgTime.length).toFixed(2)}ms`,
      errorCount: data.errors,
    })),
  };
};

/**
 * Reset analytics (for testing)
 */
const resetAnalytics = () => {
  analytics.totalSearches = 0;
  analytics.totalResultsReturned = 0;
  analytics.averageQueryTime = 0;
  analytics.queryTimes = [];
  analytics.popularSearches.clear();
  analytics.slowQueries = [];
  analytics.errorLog = [];
  analytics.hourlyMetrics.clear();
  analytics.totalCacheHits = 0;
  analytics.totalCacheMisses = 0;
};

export {
  logQuery,
  logError,
  getAnalyticsSummary,
  resetAnalytics,
};
