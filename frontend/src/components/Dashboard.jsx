import React, { useState } from 'react';
import UploadPanel from './UploadPanel';
import FileGrid from './FileGrid';
import { Plus } from 'lucide-react';

const Dashboard = ({ 
  files, 
  onFileSelect, 
  onFileDelete, 
  dragActive, 
  setDragActive, 
  uploadQueue,
  onCancelUpload 
}) => {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Manage your images and videos for object detection
          </p>
        </div>
        
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Files</span>
        </button>
      </div>

      {/* Upload Panel */}
      {showUpload && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <UploadPanel
            onFileSelect={onFileSelect}
            dragActive={dragActive}
            setDragActive={setDragActive}
            uploadQueue={uploadQueue}
            onCancelUpload={onCancelUpload}
          />
        </div>
      )}

      {/* Files Grid */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">
            Your Files ({files?.length || 0})
          </h2>
          
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Images</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Videos</span>
            </div>
          </div>
        </div>
        
        <FileGrid
          files={files}
          onFileSelect={onFileSelect}
          onFileDelete={onFileDelete}
        />
      </div>
    </div>
  );
};

export default Dashboard;
