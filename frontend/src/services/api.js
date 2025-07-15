import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const apiService = {
  // Upload file
  uploadFile: async (file, type = 'image') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    const response = await api.post('/api/detect', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  // Detect objects in uploaded file
  // detectObjects now fetches analysis by ID
  detectObjects: async (analysisId) => {
    const response = await api.get(`/api/analyses/${analysisId}`);
    return response.data;
  },


  // Get detection results
  getResults: async (fileId) => {
    const response = await api.get(`/api/results/${fileId}`);
    return response.data;
  },

  // Export results
  exportResults: async (fileId, format = 'json') => {
    const response = await api.post('/api/export', {
      file_id: fileId,
      format: format,
    }, {
      responseType: 'blob',
    });
    
    return response.data;
  },

  // Get all processed files
  getProcessedFiles: async () => {
    const response = await api.get('/api/files');
    return response.data;
  },

  // Delete file
  deleteFile: async (fileId) => {
    const response = await api.delete(`/api/files/${fileId}`);
    return response.data;
  },

  // Get analytics data
  getAnalytics: async () => {
    const response = await api.get('/api/analytics');
    return response.data;
  },

  // Health check
  healthCheck: async () => {
    const response = await api.get('/api/health');
    return response.data;
  },
};

export default apiService;
