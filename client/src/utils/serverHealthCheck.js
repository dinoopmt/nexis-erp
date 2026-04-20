/**
 * Server Health Check Utility
 * Waits for server to be available before allowing app to load
 * Includes exponential backoff retry logic
 */

import { API_URL } from '../config/config';

class ServerHealthCheck {
  constructor(maxRetries = 30, initialDelay = 500) {
    this.maxRetries = maxRetries;
    this.initialDelay = initialDelay;
  }

  /**
   * Check if server is reachable
   * Tries multiple endpoints to ensure server is responsive
   */
  async isServerAvailable() {
    try {
      // Try the root health endpoint first (no auth required)
      const healthUrl = `${API_URL.replace('/api/v1', '')}/health`;
      const response = await fetch(healthUrl, {
        method: 'GET',
        timeout: 5000,
      });
      return response.ok || response.status === 404; // Server is up even if endpoint doesn't exist
    } catch (error) {
      // If health check fails, try a simple connection to verify server is reachable
      try {
        const testUrl = `${API_URL}/settings/naming-rules`;
        const response = await fetch(testUrl, {
          method: 'GET',
          timeout: 5000,
        });
        // Server is available if we get any response (including 401/403)
        return response.status !== 0; // 0 means connection refused
      } catch {
        return false;
      }
    }
  }

  /**
   * Wait for server with exponential backoff retry
   * Returns true when server is available, false if max retries exceeded
   */
  async waitForServer(onStatus) {
    let retryCount = 0;
    let delay = this.initialDelay;

    while (retryCount < this.maxRetries) {
      if (onStatus) {
        onStatus({
          status: 'checking',
          attempt: retryCount + 1,
          maxAttempts: this.maxRetries,
        });
      }

      const isAvailable = await this.isServerAvailable();
      if (isAvailable) {
        console.log('✅ Server is available');
        if (onStatus) {
          onStatus({ status: 'ready' });
        }
        return true;
      }

      retryCount++;
      
      if (retryCount < this.maxRetries) {
        console.log(
          `⏳ Server not available, retrying in ${delay}ms... (${retryCount}/${this.maxRetries})`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
        // Exponential backoff: increase delay but cap at 5 seconds
        delay = Math.min(delay * 1.5, 5000);
      }
    }

    console.error('❌ Server not available after max retries');
    if (onStatus) {
      onStatus({ status: 'failed' });
    }
    return false;
  }
}

// Export singleton instance
export const serverHealthCheck = new ServerHealthCheck();

export default ServerHealthCheck;
