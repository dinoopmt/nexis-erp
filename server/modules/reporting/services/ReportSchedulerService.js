import logger from '../../../config/logger.js';
import { AppError } from '../../../config/errorHandler.js';

/**
 * ReportSchedulerService
 * Manages scheduled report generation and automation
 * Handles cron jobs, triggers, and report execution
 */
class ReportSchedulerService {
  /**
   * Create automated report job
   * @param {Object} jobData - { jobName, reportType, frequency, triggerTime, recipients }
   * @returns {Promise<Object>} - Created job configuration
   */
  static async createReportJob(jobData) {
    try {
      const { jobName, reportType, frequency, triggerTime, recipients } = jobData;

      if (!jobName || !reportType || !frequency || !triggerTime) {
        throw new Error('Job Name, Report Type, Frequency, and Trigger Time are required');
      }

      const validFrequencies = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annual'];
      if (!validFrequencies.includes(frequency)) {
        throw new Error(`Invalid frequency. Valid frequencies: ${validFrequencies.join(', ')}`);
      }

      // Validate trigger time format (HH:MM)
      if (!/^\d{2}:\d{2}$/.test(triggerTime)) {
        throw new Error('Invalid trigger time format. Use HH:MM (24-hour format)');
      }

      // In real implementation, save to database and register cron job
      const job = {
        jobId: `JOB_${new Date().getTime()}`,
        jobName,
        reportType,
        frequency,
        triggerTime,
        recipients: recipients || [],
        status: 'Active',
        createdAt: new Date(),
        lastExecutionTime: null,
        lastExecutionStatus: null,
        nextExecutionTime: this.calculateNextExecutionTime(frequency, triggerTime),
        executionCount: 0,
        failureCount: 0,
        retryEnabled: true,
        retryAttempts: 3,
      };

      logger.info('Report job created successfully', {
        jobId: job.jobId,
        jobName,
        reportType,
        frequency,
        triggerTime,
      });

      return job;
    } catch (error) {
      logger.error('Error creating report job', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get all report jobs
   * @param {Object} filters - { status, reportType, frequency }
   * @returns {Promise<Array>} - List of jobs
   */
  static async getAllReportJobs(filters = {}) {
    try {
      const { status, reportType, frequency } = filters;

      // In real implementation, query database
      let jobs = [
        {
          jobId: 'JOB_001',
          jobName: 'Daily Sales Report',
          reportType: 'Sales Analysis',
          frequency: 'Daily',
          triggerTime: '06:00',
          status: 'Active',
          lastExecutionTime: new Date(),
          executionCount: 30,
        },
        {
          jobId: 'JOB_002',
          jobName: 'Monthly Financial Report',
          reportType: 'Income Statement',
          frequency: 'Monthly',
          triggerTime: '08:00',
          status: 'Active',
          lastExecutionTime: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
          executionCount: 6,
        },
        {
          jobId: 'JOB_003',
          jobName: 'Weekly Inventory Review',
          reportType: 'Inventory Analysis',
          frequency: 'Weekly',
          triggerTime: '09:00',
          status: 'Paused',
          lastExecutionTime: new Date(new Date().getTime() - 14 * 24 * 60 * 60 * 1000),
          executionCount: 20,
        },
      ];

      if (status) {
        jobs = jobs.filter((job) => job.status === status);
      }
      if (reportType) {
        jobs = jobs.filter((job) => job.reportType === reportType);
      }
      if (frequency) {
        jobs = jobs.filter((job) => job.frequency === frequency);
      }

      logger.info('All report jobs retrieved successfully', {
        totalJobs: jobs.length,
        status,
        reportType,
      });

      return jobs;
    } catch (error) {
      logger.error('Error retrieving report jobs', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get job execution history
   * @param {string} jobId - Job ID
   * @param {Object} filters - { limit, fromDate, toDate }
   * @returns {Promise<Array>} - Execution history
   */
  static async getJobExecutionHistory(jobId, filters = {}) {
    try {
      const { limit = 20, fromDate, toDate } = filters;

      if (!jobId) {
        throw new Error('Job ID is required');
      }

      if (limit > 100) {
        throw new Error('Limit cannot exceed 100');
      }

      // In real implementation, query from database
      const history = [
        {
          executionId: 'EXE_001',
          jobId,
          executedAt: new Date(new Date().getTime() - 1 * 24 * 60 * 60 * 1000),
          status: 'Success',
          duration: '2.5 seconds',
          recipientsCount: 5,
          outputFormat: 'PDF',
        },
        {
          executionId: 'EXE_002',
          jobId,
          executedAt: new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000),
          status: 'Success',
          duration: '2.3 seconds',
          recipientsCount: 5,
          outputFormat: 'Excel',
        },
        {
          executionId: 'EXE_003',
          jobId,
          executedAt: new Date(new Date().getTime() - 3 * 24 * 60 * 60 * 1000),
          status: 'Failed',
          duration: null,
          error: 'Report generation timeout',
          recipientsCount: 0,
        },
      ];

      logger.info('Job execution history retrieved', {
        jobId,
        count: history.length,
      });

      return history.slice(0, limit);
    } catch (error) {
      logger.error('Error retrieving job execution history', {
        error: error.message,
        jobId,
      });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Execute report job manually
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} - Execution result
   */
  static async executeJobNow(jobId) {
    try {
      if (!jobId) {
        throw new Error('Job ID is required');
      }

      // In real implementation, trigger job execution
      const executionResult = {
        executionId: `EXE_${new Date().getTime()}`,
        jobId,
        status: 'In Progress',
        startedAt: new Date(),
        estimatedDuration: '2-5 seconds',
        reportGenerated: null,
        emailsSent: 0,
      };

      logger.info('Report job executed manually', {
        jobId,
        executionId: executionResult.executionId,
      });

      // Simulate execution completion (in real implementation, this would be async)
      setTimeout(() => {
        executionResult.status = 'Completed';
        executionResult.completedAt = new Date();
        executionResult.reportGenerated = true;
        executionResult.emailsSent = 5;
      }, 3000);

      return executionResult;
    } catch (error) {
      logger.error('Error executing job', { error: error.message, jobId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Update report job
   * @param {string} jobId - Job ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} - Updated job
   */
  static async updateReportJob(jobId, updateData) {
    try {
      if (!jobId) {
        throw new Error('Job ID is required');
      }

      // Validate frequency if provided
      if (updateData.frequency) {
        const validFrequencies = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annual'];
        if (!validFrequencies.includes(updateData.frequency)) {
          throw new Error(
            `Invalid frequency. Valid frequencies: ${validFrequencies.join(', ')}`,
          );
        }
      }

      // In real implementation, update in database
      const updated = {
        jobId,
        ...updateData,
        updatedAt: new Date(),
        nextExecutionTime: updateData.frequency
          ? this.calculateNextExecutionTime(updateData.frequency, updateData.triggerTime)
          : null,
      };

      logger.info('Report job updated successfully', {
        jobId,
        fields: Object.keys(updateData),
      });

      return updated;
    } catch (error) {
      logger.error('Error updating report job', { error: error.message, jobId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Pause report job
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} - Paused job
   */
  static async pauseReportJob(jobId) {
    try {
      if (!jobId) {
        throw new Error('Job ID is required');
      }

      // In real implementation, pause in database
      const paused = {
        jobId,
        status: 'Paused',
        pausedAt: new Date(),
      };

      logger.info('Report job paused successfully', { jobId });

      return paused;
    } catch (error) {
      logger.error('Error pausing report job', { error: error.message, jobId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Resume report job
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} - Resumed job
   */
  static async resumeReportJob(jobId) {
    try {
      if (!jobId) {
        throw new Error('Job ID is required');
      }

      // In real implementation, resume in database
      const resumed = {
        jobId,
        status: 'Active',
        resumedAt: new Date(),
      };

      logger.info('Report job resumed successfully', { jobId });

      return resumed;
    } catch (error) {
      logger.error('Error resuming report job', { error: error.message, jobId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Delete report job
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} - Deletion result
   */
  static async deleteReportJob(jobId) {
    try {
      if (!jobId) {
        throw new Error('Job ID is required');
      }

      // In real implementation, delete from database
      const deleted = {
        jobId,
        status: 'Deleted',
        deletedAt: new Date(),
      };

      logger.info('Report job deleted successfully', { jobId });

      return deleted;
    } catch (error) {
      logger.error('Error deleting report job', { error: error.message, jobId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get job execution statistics
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} - Execution statistics
   */
  static async getJobExecutionStatistics(jobId) {
    try {
      if (!jobId) {
        throw new Error('Job ID is required');
      }

      // In real implementation, aggregate from execution history
      const stats = {
        jobId,
        totalExecutions: 30,
        successfulExecutions: 28,
        failedExecutions: 2,
        successRate: 93.33,
        averageExecutionTime: 2.4, // seconds
        averageRecipientsPerExecution: 5,
        totalEmailsSent: 140,
        lastExecutionTime: new Date(new Date().getTime() - 1 * 24 * 60 * 60 * 1000),
        nextScheduledExecution: new Date(new Date().getTime() + 1 * 24 * 60 * 60 * 1000),
        uptime: 99.8,
      };

      logger.info('Job execution statistics retrieved', {
        jobId,
        successRate: stats.successRate,
      });

      return stats;
    } catch (error) {
      logger.error('Error retrieving job statistics', { error: error.message, jobId });
      const err = new Error(error.message);
      err.status = 404;
      throw err;
    }
  }

  /**
   * Set up job retry on failure
   * @param {string} jobId - Job ID
   * @param {Object} retryConfig - { enabled, attempts, delaySeconds }
   * @returns {Promise<Object>} - Updated retry configuration
   */
  static async configureJobRetry(jobId, retryConfig) {
    try {
      if (!jobId) {
        throw new Error('Job ID is required');
      }

      const { enabled, attempts, delaySeconds } = retryConfig;

      if (attempts && (attempts < 1 || attempts > 5)) {
        throw new Error('Retry attempts must be between 1 and 5');
      }

      // In real implementation, save to database
      const config = {
        jobId,
        retryEnabled: enabled !== undefined ? enabled : true,
        retryAttempts: attempts || 3,
        retryDelaySeconds: delaySeconds || 60,
        configuredAt: new Date(),
      };

      logger.info('Job retry configuration updated', {
        jobId,
        retryEnabled: config.retryEnabled,
        retryAttempts: config.retryAttempts,
      });

      return config;
    } catch (error) {
      logger.error('Error configuring job retry', { error: error.message, jobId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Calculate next execution time based on frequency and trigger time
   * @param {string} frequency - Frequency
   * @param {string} triggerTime - Trigger time (HH:MM)
   * @returns {Date} - Next execution time
   */
  static calculateNextExecutionTime(frequency, triggerTime) {
    const [hours, minutes] = triggerTime.split(':').map(Number);
    const now = new Date();
    let next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);

    // If the trigger time has already passed today, move to the next occurrence
    if (next <= now) {
      if (frequency === 'Daily') {
        next.setDate(next.getDate() + 1);
      } else if (frequency === 'Weekly') {
        next.setDate(next.getDate() + 7);
      } else if (frequency === 'Monthly') {
        next.setMonth(next.getMonth() + 1);
      }
    }

    return next;
  }
}

export default ReportSchedulerService;
