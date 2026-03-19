/**
 * Database Query Optimization Metrics
 * Monitors MongoDB query performance and provides optimization recommendations
 */

const metrics = {
  queries: [],
  indexUsage: new Map(),
  slowQueries: [],
  aggregationMetrics: [],
};

/**
 * Record a query execution
 */
const recordQuery = (collectionName, operation, duration, documentCount, usedIndex = null) => {
  const query = {
    timestamp: new Date().toISOString(),
    collection: collectionName,
    operation, // find, aggregate, updateOne, etc.
    duration,
    documentCount,
    usedIndex,
    isSlow: duration > 100, // >100ms is slow
  };

  metrics.queries.push(query);

  // Keep only last 1000 queries in memory
  if (metrics.queries.length > 1000) {
    metrics.queries.shift();
  }

  // Track index usage
  if (usedIndex) {
    const key = `${collectionName}:${usedIndex}`;
    metrics.indexUsage.set(key, (metrics.indexUsage.get(key) || 0) + 1);
  }

  // Track slow queries
  if (query.isSlow) {
    metrics.slowQueries.push(query);
    if (metrics.slowQueries.length > 100) {
      metrics.slowQueries.shift();
    }
  }

  return query;
};

/**
 * Record aggregation pipeline metrics
 */
const recordAggregation = (collectionName, pipelineLength, duration, resultCount) => {
  const agg = {
    timestamp: new Date().toISOString(),
    collection: collectionName,
    pipelineStages: pipelineLength,
    duration,
    resultCount,
    efficency: resultCount > 0 ? (resultCount / duration).toFixed(2) : 0, // docs/ms
  };

  metrics.aggregationMetrics.push(agg);
  if (metrics.aggregationMetrics.length > 100) {
    metrics.aggregationMetrics.shift();
  }

  return agg;
};

/**
 * Get optimization metrics report
 */
const getOptimizationReport = () => {
  const totalQueries = metrics.queries.length;
  const slowCount = metrics.slowQueries.length;
  
  // Group by collection
  const byCollection = {};
  metrics.queries.forEach((q) => {
    if (!byCollection[q.collection]) {
      byCollection[q.collection] = {
        count: 0,
        avgDuration: [],
        slowCount: 0,
        operations: new Set(),
      };
    }
    byCollection[q.collection].count++;
    byCollection[q.collection].avgDuration.push(q.duration);
    byCollection[q.collection].operations.add(q.operation);
    if (q.isSlow) byCollection[q.collection].slowCount++;
  });

  // Calculate recommendations
  const recommendations = [];

  if (slowCount > totalQueries * 0.1) {
    recommendations.push('⚠️  More than 10% of queries are slow (>100ms). Consider:');
    recommendations.push('   - Adding database indexes on frequently searched fields');
    recommendations.push('   - Optimizing query filters to be more specific');
  }

  const indexUsageList = Array.from(metrics.indexUsage.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    totalQueries,
    slowQueriesCount: slowCount,
    slowQueryPercentage: `${((slowCount / totalQueries) * 100).toFixed(2)}%`,
    byCollection: Object.entries(byCollection).map(([name, data]) => ({
      collection: name,
      queryCount: data.count,
      averageDuration: `${(data.avgDuration.reduce((a, b) => a + b, 0) / data.avgDuration.length).toFixed(2)}ms`,
      slowCount: data.slowCount,
      operations: Array.from(data.operations),
    })),
    topIndexUsage: indexUsageList.map(([index, count]) => ({ index, usage: count })),
    recentSlowQueries: metrics.slowQueries.slice(-5).map((q) => ({
      collection: q.collection,
      operation: q.operation,
      duration: `${q.duration}ms`,
      docCount: q.documentCount,
      index: q.usedIndex || 'none',
    })),
    recommendations,
    aggregationMetrics: metrics.aggregationMetrics.slice(-5).map((a) => ({
      collection: a.collection,
      stages: a.pipelineStages,
      duration: `${a.duration}ms`,
      results: a.resultCount,
      efficiency: `${a.efficency} docs/ms`,
    })),
  };
};

/**
 * Get a single query performance recommendation
 */
const optimizeQuerySuggestion = (collectionName, operation) => {
  const collectionQueries = metrics.queries.filter((q) => q.collection === collectionName && q.operation === operation);

  if (collectionQueries.length === 0) {
    return 'No query data available';
  }

  const avgDuration = collectionQueries.reduce((sum, q) => sum + q.duration, 0) / collectionQueries.length;
  const slowCount = collectionQueries.filter((q) => q.isSlow).length;

  let suggestion = `📊 ${collectionName}.${operation}:\n`;
  suggestion += `   Avg Duration: ${avgDuration.toFixed(2)}ms\n`;
  suggestion += `   Slow Queries: ${slowCount}/${collectionQueries.length}\n`;

  if (avgDuration > 100) {
    suggestion += '   ✅ Recommendations:\n';
    suggestion += '      - Add index on frequently filtered fields\n';
    suggestion += '      - Use lean() for read-only queries (if Mongoose)\n';
    suggestion += '      - Limit projection to required fields only\n';
  } else {
    suggestion += '   ✅ Query is well-optimized!\n';
  }

  return suggestion;
};

/**
 * Reset metrics
 */
const resetMetrics = () => {
  metrics.queries = [];
  metrics.indexUsage.clear();
  metrics.slowQueries = [];
  metrics.aggregationMetrics = [];
};

export {
  recordQuery,
  recordAggregation,
  getOptimizationReport,
  optimizeQuerySuggestion,
  resetMetrics,
};
