import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Text } from 'react-konva';
import { 
  Upload, 
  Download, 
  Eye, 
  EyeOff, 
  Loader, 
  AlertCircle,
  CheckCircle,
  Trash2,
  Settings,
  Zap
} from 'lucide-react';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VisionFlow = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [visibleClasses, setVisibleClasses] = useState({});
  const [exportFormat, setExportFormat] = useState('yolo');
  const [imageObj, setImageObj] = useState(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [notifications, setNotifications] = useState([]);
  
  const fileInputRef = useRef(null);
  const stageRef = useRef(null);
  const containerRef = useRef(null);

  // Initialize visible classes when analysis result changes
  useEffect(() => {
    if (analysisResult) {
      const classes = {};
      analysisResult.detections.forEach(det => {
        classes[det.class_name] = true;
      });
      setVisibleClasses(classes);
    }
  }, [analysisResult]);

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setStageSize({
          width: Math.min(rect.width - 40, 1200),
          height: Math.min(rect.height - 40, 800)
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showNotification = (message, type = 'success') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileSelect = (file) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG)');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }
    
    setSelectedFile(file);
    setError(null);
    setAnalysisResult(null);
    
    // Create image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        setImageObj(img);
        
        // Adjust stage size to fit image
        const maxWidth = 1200;
        const maxHeight = 800;
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        
        setStageSize({
          width: img.width * scale,
          height: img.height * scale
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await axios.post(`${API}/detect`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setAnalysisResult(response.data);
      showNotification(`Analysis complete! Found ${response.data.total_objects} objects in ${response.data.processing_time.toFixed(2)}s`);
      
      // Load the annotated image
      const img = new window.Image();
      img.onload = () => setImageObj(img);
      img.src = `data:image/jpeg;base64,${response.data.image_data}`;
      
    } catch (error) {
      console.error('Analysis error:', error);
      setError(error.response?.data?.detail || 'Failed to analyze image');
      showNotification('Analysis failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!analysisResult) return;
    
    try {
      const response = await axios.post(`${API}/export/${analysisResult.id}?format=${exportFormat}`, {}, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `visionflow_export_${analysisResult.id}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      showNotification('Export downloaded successfully!');
    } catch (error) {
      console.error('Export error:', error);
      showNotification('Export failed', 'error');
    }
  };

  const toggleClassVisibility = (className) => {
    setVisibleClasses(prev => ({
      ...prev,
      [className]: !prev[className]
    }));
  };

  const clearAll = () => {
    setSelectedFile(null);
    setAnalysisResult(null);
    setImageObj(null);
    setError(null);
    setVisibleClasses({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getClassStats = () => {
    if (!analysisResult) return {};
    
    const stats = {};
    analysisResult.detections.forEach(det => {
      stats[det.class_name] = (stats[det.class_name] || 0) + 1;
    });
    return stats;
  };

  const classStats = getClassStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 ${
              notification.type === 'success' 
                ? 'bg-green-500 text-white' 
                : 'bg-red-500 text-white'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span className="text-sm">{notification.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">VisionFlow</h1>
                <p className="text-sm text-gray-300">AI-Powered Object Detection</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={clearAll}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear</span>
              </button>
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">YOLOv8</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Upload Area */}
            {!selectedFile && (
              <div
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                  dragActive 
                    ? 'border-purple-400 bg-purple-500/10' 
                    : 'border-gray-600 hover:border-gray-500'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Drop your image here or click to browse
                </h3>
                <p className="text-gray-400 mb-6">
                  Supports JPG, PNG • Max 10MB
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105"
                >
                  Select Image
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
              </div>
            )}

            {/* Analysis Area */}
            {selectedFile && (
              <div className="bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">
                      {selectedFile.name}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    {!analysisResult && (
                      <button
                        onClick={handleAnalyze}
                        disabled={loading}
                        className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {loading ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            <span>Analyzing...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4" />
                            <span>Analyze</span>
                          </>
                        )}
                      </button>
                    )}
                    {analysisResult && (
                      <button
                        onClick={handleExport}
                        className="flex items-center space-x-2 px-6 py-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Export</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Image Display */}
                <div ref={containerRef} className="bg-black/30 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
                  {imageObj && (
                    <Stage width={stageSize.width} height={stageSize.height} ref={stageRef}>
                      <Layer>
                        <KonvaImage
                          image={imageObj}
                          width={stageSize.width}
                          height={stageSize.height}
                        />
                      </Layer>
                    </Stage>
                  )}
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <span className="text-red-400">{error}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Results Panel */}
            {analysisResult && (
              <>
                <div className="bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">Detection Results</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Total Objects</span>
                      <span className="text-white font-semibold">{analysisResult.total_objects}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Processing Time</span>
                      <span className="text-white font-semibold">{analysisResult.processing_time.toFixed(2)}s</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Model</span>
                      <span className="text-white font-semibold">YOLOv8</span>
                    </div>
                  </div>
                </div>

                {/* Class Toggle Panel */}
                <div className="bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">Detected Classes</h3>
                  <div className="space-y-2">
                    {Object.entries(classStats).map(([className, count]) => (
                      <div key={className} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => toggleClassVisibility(className)}
                            className="flex items-center space-x-2 hover:bg-white/10 p-1 rounded transition-colors"
                          >
                            {visibleClasses[className] ? (
                              <Eye className="w-4 h-4 text-green-400" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-gray-400" />
                            )}
                            <span className="text-sm text-white">{className}</span>
                          </button>
                        </div>
                        <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Export Options */}
                <div className="bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">Export Options</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Format</label>
                      <select
                        value={exportFormat}
                        onChange={(e) => setExportFormat(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                      >
                        <option value="yolo">YOLO</option>
                        <option value="coco">COCO</option>
                        <option value="pascal">Pascal VOC</option>
                      </select>
                    </div>
                    <button
                      onClick={handleExport}
                      disabled={!analysisResult}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Results</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Quick Stats */}
            <div className="bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Start</h3>
              <div className="space-y-3 text-sm text-gray-400">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Upload an image (JPG/PNG)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Click "Analyze" to detect objects</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Toggle class visibility</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Export results in your format</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisionFlow;