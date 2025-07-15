import React, { useState } from 'react';
import { Search, Filter, Grid, List, Eye, Download, Trash2, Play, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';

const Videos = () => {
  const { uploadedFiles, processedFiles, dispatch, addNotification } = useApp();
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedFiles, setSelectedFiles] = useState([]);

  const videoFiles = uploadedFiles.filter(file => file.type === 'video');
  
  const filteredFiles = videoFiles.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'processed' && processedFiles.some(p => p.id === file.id)) ||
      (filterStatus === 'unprocessed' && !processedFiles.some(p => p.id === file.id));
    
    return matchesSearch && matchesFilter;
  });

  const handleAnalyze = async (file) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      addNotification('info', `Analyzing video ${file.name}... This may take a while.`);
      
      const result = await apiService.detectObjects(file.id);
      
      dispatch({
        type: 'ADD_PROCESSED_FILE',
        payload: {
          ...file,
          detections: result.detections,
          processedAt: new Date().toISOString(),
          processingTime: result.processing_time,
          confidence: result.confidence,
          frameCount: result.frame_count
        }
      });
      
      addNotification('success', `Video analysis completed for ${file.name}`);
    } catch (error) {
      console.error('Video analysis failed:', error);
      addNotification('error', `Failed to analyze ${file.name}`);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleDelete = async (fileId) => {
    try {
      await apiService.deleteFile(fileId);
      addNotification('success', 'Video deleted successfully');
    } catch (error) {
      addNotification('error', 'Failed to delete video');
    }
  };

  const handleBulkExport = async () => {
    if (selectedFiles.length === 0) return;
    
    try {
      for (const fileId of selectedFiles) {
        const blob = await apiService.exportResults(fileId, 'json');
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `video_results_${fileId}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
      addNotification('success', `Exported ${selectedFiles.length} video results`);
      setSelectedFiles([]);
    } catch (error) {
      addNotification('error', 'Export failed');
    }
  };

  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const isProcessed = (fileId) => {
    return processedFiles.some(p => p.id === fileId);
  };

  const getProcessedFile = (fileId) => {
    return processedFiles.find(p => p.id === fileId);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 bg-black min-h-screen">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Videos</h1>
            <p className="text-gray-400 mt-1">Manage and analyze your video collection</p>
          </div>
          
          <div className="flex items-center space-x-3">
            {selectedFiles.length > 0 && (
              <button
                onClick={handleBulkExport}
                className="btn-secondary px-4 py-2 rounded-lg flex items-center space-x-2 text-white"
              >
                <Download className="w-4 h-4" />
                <span>Export ({selectedFiles.length})</span>
              </button>
            )}
            
            <div className="flex items-center bg-gray-900 rounded-lg border border-gray-800">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'text-blue-400' : 'text-gray-400'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'text-blue-400' : 'text-gray-400'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search videos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Videos</option>
            <option value="processed">Processed</option>
            <option value="unprocessed">Unprocessed</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <p className="text-gray-400 text-sm">Total Videos</p>
            <p className="text-xl font-bold text-white">{videoFiles.length}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <p className="text-gray-400 text-sm">Processed</p>
            <p className="text-xl font-bold text-green-400">{processedFiles.filter(f => f.type === 'video').length}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <p className="text-gray-400 text-sm">Pending</p>
            <p className="text-xl font-bold text-yellow-400">{videoFiles.length - processedFiles.filter(f => f.type === 'video').length}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <p className="text-gray-400 text-sm">Selected</p>
            <p className="text-xl font-bold text-blue-400">{selectedFiles.length}</p>
          </div>
        </div>

        {/* Video Grid/List */}
        <div className="bg-gray-900 rounded-xl border border-gray-800">
          {filteredFiles.length > 0 ? (
            <div className={`p-6 ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}`}>
              {filteredFiles.map((file) => {
                const processed = getProcessedFile(file.id);
                const isSelected = selectedFiles.includes(file.id);
                
                return viewMode === 'grid' ? (
                  <div key={file.id} className={`file-grid-item bg-gray-800 rounded-lg overflow-hidden border ${isSelected ? 'border-blue-500' : 'border-gray-700'}`}>
                    <div className="relative">
                      <div className="w-full h-48 bg-gray-700 flex items-center justify-center relative">
                        {file.preview ? (
                          <video
                            src={file.preview}
                            className="w-full h-full object-cover"
                            muted
                            preload="metadata"
                          />
                        ) : (
                          <Play className="w-12 h-12 text-gray-400" />
                        )}
                        
                        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                          <div className="w-12 h-12 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                            <Play className="w-6 h-6 text-white ml-1" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="absolute top-2 left-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleFileSelection(file.id)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                      
                      {isProcessed(file.id) && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                          Processed
                        </div>
                      )}
                      
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {file.duration ? formatDuration(file.duration) : '--:--'}
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <h3 className="text-white font-medium truncate mb-2">{file.name}</h3>
                      <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
                        <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                      </div>
                      
                      {processed && (
                        <div className="text-xs text-gray-400 mb-3">
                          {processed.detections?.length || 0} objects detected
                          {processed.frameCount && ` • ${processed.frameCount} frames`}
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        {!isProcessed(file.id) ? (
                          <button
                            onClick={() => handleAnalyze(file)}
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-3 rounded transition-colors"
                          >
                            <Play className="w-3 h-3 inline mr-1" />
                            Analyze
                          </button>
                        ) : (
                          <button className="flex-1 bg-gray-700 text-white text-sm py-2 px-3 rounded flex items-center justify-center">
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDelete(file.id)}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={file.id} className={`flex items-center space-x-4 p-4 bg-gray-800 rounded-lg border ${isSelected ? 'border-blue-500' : 'border-gray-700'}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleFileSelection(file.id)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    
                    <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center relative">
                      {file.preview ? (
                        <video
                          src={file.preview}
                          className="w-full h-full object-cover rounded-lg"
                          muted
                          preload="metadata"
                        />
                      ) : (
                        <Play className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-white font-medium">{file.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                        <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        <span>{file.duration ? formatDuration(file.duration) : '--:--'}</span>
                        <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                        {processed && <span>{processed.detections?.length || 0} objects</span>}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {isProcessed(file.id) && (
                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">
                          Processed
                        </span>
                      )}
                      
                      {!isProcessed(file.id) ? (
                        <button
                          onClick={() => handleAnalyze(file)}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-4 rounded transition-colors"
                        >
                          Analyze
                        </button>
                      ) : (
                        <button className="bg-gray-700 text-white text-sm py-2 px-4 rounded">
                          View Results
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDelete(file.id)}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No videos found</h3>
              <p className="text-gray-400">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Videos;
