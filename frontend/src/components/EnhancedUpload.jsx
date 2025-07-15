import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, FileImage, FileVideo, AlertCircle, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import apiService from '../services/apiService';

const EnhancedUpload = () => {
  const { dispatch, addNotification } = useApp();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const fileInputRef = useRef(null);

  const supportedFormats = {
    image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
    video: ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv']
  };

  const isValidFile = (file) => {
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    const isImage = supportedFormats.image.includes(extension);
    const isVideo = supportedFormats.video.includes(extension);
    return { isValid: isImage || isVideo, type: isImage ? 'image' : 'video' };
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
    e.target.value = ''; // Reset input
  }, []);

  const handleFiles = async (files) => {
    const validFiles = files.filter(file => {
      const { isValid } = isValidFile(file);
      if (!isValid) {
        addNotification('error', `Unsupported file format: ${file.name}`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Add files to upload queue
    const newUploads = validFiles.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: isValidFile(file).type,
      status: 'uploading',
      progress: 0,
      preview: null
    }));

    setUploadQueue(prev => [...prev, ...newUploads]);

    // Process uploads
    for (const upload of newUploads) {
      try {
        // Create preview
        const preview = await createPreview(upload.file, upload.type);
        updateUploadStatus(upload.id, { preview });

        // Upload to backend (store only)
        const result = await apiService.uploadOnly(upload.file);
        
        // Update status to ready (waiting analysis)
        updateUploadStatus(upload.id, { 
          status: 'ready', 
          progress: 100,
          fileId: result.file_id 
        });

        // Add to app state
        dispatch({
          type: 'ADD_UPLOADED_FILE',
          payload: {
            id: result.file_id,
            name: upload.name,
            size: upload.size,
            type: upload.type,
            preview,
            uploadedAt: new Date().toISOString(),
            status: 'ready'
          }
        });

        addNotification('success', `${upload.name} uploaded successfully!`);
        
        // Remove from queue after delay
        setTimeout(() => {
          setUploadQueue(prev => prev.filter(u => u.id !== upload.id));
        }, 2000);

      } catch (error) {
        console.error('Upload failed:', error);
        updateUploadStatus(upload.id, { 
          status: 'error', 
          error: error.message 
        });
        addNotification('error', `Failed to upload ${upload.name}`);
      }
    }
  };

  const createPreview = (file, type) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  };

  const updateUploadStatus = (id, updates) => {
    setUploadQueue(prev => 
      prev.map(upload => 
        upload.id === id ? { ...upload, ...updates } : upload
      )
    );
  };

  const handleAnalyze = async (upload) => {
    try {
      updateUploadStatus(upload.id, { status: 'processing' });
      const analysis = await apiService.analyzeFile(upload.fileId || upload.file_id || upload.id);
      // Dispatch analysis result to global state or handle accordingly
      dispatch({ type: 'SET_CURRENT_ANALYSIS', payload: analysis });
      updateUploadStatus(upload.id, { status: 'completed' });
      addNotification('success', `${upload.name} analyzed successfully!`);
    } catch (err) {
      console.error(err);
      updateUploadStatus(upload.id, { status: 'error', error: err.message });
      addNotification('error', `Failed to analyze ${upload.name}`);
    }
  };

  const removeFromQueue = (id) => {
    setUploadQueue(prev => prev.filter(upload => upload.id !== id));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        className={`drop-zone relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
          isDragOver 
            ? 'border-blue-500 bg-blue-500/10 active' 
            : 'border-gray-700 bg-gray-900/50 hover:border-gray-600 hover:bg-gray-900/70'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={[...supportedFormats.image, ...supportedFormats.video].join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-gray-400" />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Upload Images or Videos
            </h3>
            <p className="text-gray-400 mb-4">
              Drag and drop your files here, or click to browse
            </p>
            
            <div className="text-sm text-gray-500">
              <p>Supported formats:</p>
              <p className="mt-1">
                <span className="text-blue-400">Images:</span> JPG, PNG, GIF, WebP, BMP
              </p>
              <p>
                <span className="text-purple-400">Videos:</span> MP4, AVI, MOV, MKV, WebM
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Queue */}
      {uploadQueue.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300">Upload Queue</h4>
          
          {uploadQueue.map((upload) => (
            <div key={upload.id} className="upload-item bg-gray-900 rounded-lg p-4 border border-gray-800">
              <div className="flex items-center space-x-4">
                {/* Preview */}
                <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  {upload.preview ? (
                    <img 
                      src={upload.preview} 
                      alt={upload.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    upload.type === 'image' ? 
                      <FileImage className="w-6 h-6 text-gray-400" /> :
                      <FileVideo className="w-6 h-6 text-gray-400" />
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-white truncate">
                      {upload.name}
                    </p>
                    <div className="flex items-center space-x-2">
                      {upload.status === 'completed' && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                      {upload.status === 'error' && (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      <button
                        onClick={() => removeFromQueue(upload.id)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{formatFileSize(upload.size)}</span>
                    {upload.status === 'ready' ? (
                      <button
                        onClick={() => handleAnalyze(upload)}
                        className="text-blue-400 hover:text-blue-600 transition-colors text-xs"
                      >
                        Analyze
                      </button>
                    ) : (
                      <span className="capitalize">{upload.status}</span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {upload.status === 'uploading' && (
                    <div className="mt-2 w-full bg-gray-800 rounded-full h-1">
                      <div 
                        className="bg-blue-500 h-1 rounded-full progress-bar transition-all duration-300"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Error Message */}
                  {upload.status === 'error' && upload.error && (
                    <p className="mt-1 text-xs text-red-400">{upload.error}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EnhancedUpload;
