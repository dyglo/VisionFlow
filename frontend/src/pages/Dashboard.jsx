import React, { useState } from 'react';
import { Plus, TrendingUp, Image, Video, Target, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import EnhancedUpload from '../components/EnhancedUpload';
import FileGrid from '../components/FileGrid';
import apiService from '../services/apiService';

const Dashboard = () => {
  const { uploadedFiles, processedFiles, credits, dispatch, addNotification } = useApp();
  const [showUpload, setShowUpload] = useState(false);
  const [analyzing, setAnalyzing] = useState(new Set());

  const stats = {
    totalImages: uploadedFiles.filter(f => f.type === 'image').length,
    totalVideos: uploadedFiles.filter(f => f.type === 'video').length,
    totalProcessed: processedFiles.length,
    totalObjects: processedFiles.reduce((acc, file) => acc + (file.detections?.length || 0), 0)
  };

  const recentActivity = processedFiles
    .sort((a, b) => new Date(b.processedAt) - new Date(a.processedAt))
    .slice(0, 5);

  // Handle file selection (analyze)
  const handleFileSelect = async (file) => {
    try {
      // Check if file is already processed
      const isProcessed = processedFiles.some(p => p.id === file.id);
      if (isProcessed) {
        addNotification('info', `${file.name} has already been analyzed`);
        return;
      }

      setAnalyzing(prev => new Set([...prev, file.id]));
      addNotification('info', `Analyzing ${file.name}...`);
      
      const result = await apiService.analyzeFile(file.id);
      
      // Add to processed files
      dispatch({
        type: 'ADD_PROCESSED_FILE',
        payload: {
          ...file,
          ...result,
          preview: `data:image/jpeg;base64,${result.image_data}`,
          processedAt: new Date().toISOString()
        }
      });
      
      addNotification('success', `Analysis completed for ${file.name}`);
    } catch (error) {
      console.error('Analysis failed:', error);
      addNotification('error', `Failed to analyze ${file.name}: ${error.message}`);
    } finally {
      setAnalyzing(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.id);
        return newSet;
      });
    }
  };

  // Handle file deletion
  const handleFileDelete = async (fileIndex) => {
    try {
      const file = uploadedFiles[fileIndex];
      if (!file) return;
      
      addNotification('info', `Deleting ${file.name}...`);
      
      // Remove from uploaded files
      dispatch({
        type: 'REMOVE_FILE',
        payload: file.id
      });
      
      addNotification('success', `${file.name} deleted successfully`);
    } catch (error) {
      console.error('Delete failed:', error);
      addNotification('error', `Failed to delete file: ${error.message}`);
    }
  };

  return (
    <div className="flex-1 bg-black min-h-screen">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 mt-1">Manage your images and videos for object detection</p>
          </div>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="btn-primary px-4 py-2 rounded-lg flex items-center space-x-2 text-white font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Files</span>
          </button>
        </div>

        {/* Upload Section */}
        {showUpload && (
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <EnhancedUpload />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Images</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.totalImages}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Image className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Videos</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.totalVideos}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Video className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Processed Files</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.totalProcessed}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Objects Detected</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.totalObjects}</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Recent Activity
            </h2>
            <div className="space-y-3">
              {recentActivity.map((file) => (
                <div key={file.id} className="flex items-center space-x-4 p-3 bg-gray-800 rounded-lg">
                  <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                    {file.type === 'image' ? (
                      <Image className="w-6 h-6 text-gray-400" />
                    ) : (
                      <Video className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{file.name}</p>
                    <p className="text-gray-400 text-sm">
                      {file.detections?.length || 0} objects detected • {new Date(file.processedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-green-400 text-sm font-medium">
                    Completed
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* File Grid */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Your Files ({uploadedFiles.length})</h2>
            <div className="flex items-center space-x-2 text-sm">
              <span className="flex items-center text-blue-400">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                Images
              </span>
              <span className="flex items-center text-purple-400">
                <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                Videos
              </span>
            </div>
          </div>
          
          {uploadedFiles.length > 0 ? (
            <FileGrid 
              files={uploadedFiles} 
              onFileSelect={handleFileSelect}
              onFileDelete={handleFileDelete}
              analyzing={analyzing}
            />
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No files uploaded yet</h3>
              <p className="text-gray-400 mb-4">Upload your first image or video to get started</p>
              <button
                onClick={() => setShowUpload(true)}
                className="btn-primary px-6 py-2 rounded-lg text-white font-medium"
              >
                Upload Files
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
