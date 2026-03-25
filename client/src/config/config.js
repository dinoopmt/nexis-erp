let API_URL = import.meta.env.VITE_API_URL;

// If not set, build from window location (for runtime deployment)
if (!API_URL && typeof window !== 'undefined') {
  const protocol = window.location.protocol;
  const host = window.location.host;
  API_URL = `${protocol}//${host}/api/v1`;
  console.log('🌐 API_URL auto-configured from window location:', API_URL);
}

// Fallback for build-time or missing config
if (!API_URL) {
  API_URL = '/api/v1';
  console.warn('⚠️  VITE_API_URL not set. Using relative path:', API_URL);
}

// Ensure /api/v1 is in the URL path
if (!API_URL.includes('/api/v1')) {
  // Remove trailing slash and append /api/v1
  API_URL = API_URL.replace(/\/$/, '') + '/api/v1';
}

console.log('✅ API_URL:', API_URL);

export { API_URL };

