import axios from 'axios';

// Determine backend URL based on environment
// 1. Use explicit env variable when provided.\n// 2. In production (e.g., on Vercel) fall back to the Render backend URL.
// 3. Default to localhost during local development.
let backendURL = process.env.REACT_APP_BACKEND_URL;

if (!backendURL) {
  // If not set, choose sensible default based on host
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app')) {
    backendURL = 'https://visionflow-w6ur.onrender.com';
  } else {
    backendURL = 'http://127.0.0.1:8000';
  }
}

const API_BASE_URL = backendURL;

// Create axios instance with default config
// Ensure baseURL does not end with a trailing slash to avoid duplication
const normalizedBase = API_BASE_URL.replace(/\/$/, '');

const api = axios.create({
  baseURL: normalizedBase,
  timeout: 30000, // 30 seconds timeout for file uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('API Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return Promise.reject(error);
  }
);

const apiService = {
  // Helper to build endpoint paths while avoiding duplicate `/api`
  _path: (suffix) => {
    // If base already includes /api at the end, don't repeat it
    if (normalizedBase.endsWith('/api')) {
      return suffix.startsWith('/') ? suffix : `/${suffix}`;
    }
    // Otherwise prepend /api
    return suffix.startsWith('/') ? `/api${suffix}` : `/api/${suffix}`;
  },
  // Upload file only (no analysis)
  uploadOnly: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await api.post(apiService._path('/upload'), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data; // { file_id, filename }
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.message || 'Upload failed');
    }
  },

  // Trigger analysis on an uploaded file
  analyzeFile: async (fileId) => {
    try {
      // Increase timeout for potentially long-running analysis (YOLO inference)
      const response = await api.post(
        apiService._path(`/analyze/${fileId}`),
        null,
        { timeout: 120000 } // 2-minute timeout
      );
      return response.data; // AnalysisResult
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.message || 'Analysis failed');
    }
  },

  // Upload and detect objects in file
  uploadFile: async (file, fileType) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post(apiService._path('/detect'), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.message || 'Upload failed');
    }
  },

  // Get all analysis results
  getAnalyses: async () => {
    try {
      const response = await api.get(apiService._path('/analyses'));
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch analyses');
    }
  },

  // Get specific analysis result
  getAnalysis: async (analysisId) => {
    try {
      const response = await api.get(apiService._path(`/analyses/${analysisId}`));
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch analysis');
    }
  },

  // Export analysis results
  exportAnalysis: async (analysisId, format = 'yolo') => {
    try {
      const response = await api.get(apiService._path(`/export/${analysisId}`), {
        params: { format },
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.message || 'Export failed');
    }
  },

  // Delete file (if backend supports it)
  deleteFile: async (fileId) => {
    try {
      const response = await api.delete(apiService._path(`/files/${fileId}`));
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.message || 'Delete failed');
    }
  },

  // Health check
  healthCheck: async () => {
    try {
      const response = await api.get('/');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.message || 'Health check failed');
    }
  },

  // Create status check
  createStatusCheck: async (clientName) => {
    try {
      const response = await api.post(apiService._path('/status-check'), { client_name: clientName });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.message || 'Status check failed');
    }
  },

  // Get status checks
  getStatusChecks: async () => {
    try {
      const response = await api.get(apiService._path('/status-checks'));
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch status checks');
    }
  },
};

export default apiService;
