import React, { createContext, useContext, useReducer, useEffect } from 'react';

const AppContext = createContext();

const initialState = {
  credits: 0,
  uploadedFiles: [],
  processedFiles: [],
  currentView: 'dashboard',
  loading: false,
  error: null,
  notifications: [],
  settings: {
    confidence: 0.5,
    enabledClasses: [],
    exportFormat: 'json',
    theme: 'dark'
  }
};

const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_CREDITS':
      return { ...state, credits: action.payload };
    case 'INCREMENT_CREDITS':
      return { ...state, credits: state.credits + 1 };
    case 'DECREMENT_CREDITS':
      return { ...state, credits: Math.max(0, state.credits - 1) };
    case 'ADD_UPLOADED_FILE':
      return { 
        ...state, 
        uploadedFiles: [...state.uploadedFiles, action.payload],
        credits: state.credits + 1
      };
    case 'ADD_PROCESSED_FILE':
      return { 
        ...state, 
        processedFiles: [...state.processedFiles, action.payload],
        credits: state.credits - 1
      };
    case 'REMOVE_FILE':
      return {
        ...state,
        uploadedFiles: state.uploadedFiles.filter(file => file.id !== action.payload),
        processedFiles: state.processedFiles.filter(file => file.id !== action.payload)
      };
    case 'SET_CURRENT_VIEW':
      return { ...state, currentView: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'ADD_NOTIFICATION':
      return { 
        ...state, 
        notifications: [...state.notifications, { 
          id: Date.now(), 
          ...action.payload 
        }]
      };
    case 'REMOVE_NOTIFICATION':
      return { 
        ...state, 
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
    case 'UPDATE_SETTINGS':
      return { 
        ...state, 
        settings: { ...state.settings, ...action.payload }
      };
    case 'LOAD_STATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('visionflow-state');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        dispatch({ type: 'LOAD_STATE', payload: parsedState });
      } catch (error) {
        console.error('Failed to load saved state:', error);
      }
    }
  }, []);

  // Save state to localStorage whenever it changes
  // Helper to prune large data (e.g. base64 images) before persisting
  const serializeState = (state) => {
    const sanitizeUploaded = (f) => ({
      id: f.id,
      name: f.name,
      size: f.size,
      type: f.type,
      uploadedAt: f.uploadedAt,
      status: f.status,
    });

    const sanitizeProcessed = (f) => ({
      id: f.id,
      name: f.name || f.filename,
      total_objects: f.total_objects,
      processedAt: f.processedAt || f.timestamp,
    });

    return {
      credits: state.credits,
      uploadedFiles: state.uploadedFiles.map(sanitizeUploaded),
      processedFiles: state.processedFiles.map(sanitizeProcessed),
      settings: state.settings,
    };
  };

  useEffect(() => {
    try {
      localStorage.setItem('visionflow-state', JSON.stringify(serializeState(state)));
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded, clearing old data');
        // Attempt to clear the key to free space
        localStorage.removeItem('visionflow-state');
      } else {
        console.error('Failed to save state:', error);
      }
    }
  }, [state.credits, state.uploadedFiles, state.processedFiles, state.settings]);

  const addNotification = (type, message, duration = 5000) => {
    const notification = { type, message, duration };
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
    
    setTimeout(() => {
      dispatch({ type: 'REMOVE_NOTIFICATION', payload: notification.id });
    }, duration);
  };

  const contextValue = {
    ...state,
    dispatch,
    addNotification
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
