import React from 'react';
import { FileImage, FileVideo, Eye, Trash2, Play, Loader } from 'lucide-react';

const FileGrid = ({ files, onFileSelect, onFileDelete, analyzing = new Set() }) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      return FileImage;
    } else if (['mp4', 'avi', 'mov', 'wmv'].includes(extension)) {
      return FileVideo;
    }
    return FileImage;
  };

  const isImage = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension);
  };

  if (!files || files.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <FileImage className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No files uploaded yet</h3>
        <p className="text-gray-400">Upload your first image or video to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {files.map((file, index) => {
        const FileIcon = getFileIcon(file.name);
        const isAnalyzing = analyzing.has(file.id);
        
        return (
          <div
            key={index}
            className="group bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-750 transition-all duration-200 hover:scale-105"
          >
            {/* File Preview */}
            <div className="aspect-square bg-gray-700 relative overflow-hidden">
              {isImage(file.name) && file.preview ? (
                <img
                  src={file.preview}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FileIcon className="w-12 h-12 text-gray-400" />
                </div>
              )}
              
              {/* Overlay Actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                <button
                  onClick={() => onFileSelect && onFileSelect(file)}
                  disabled={isAnalyzing}
                  className={`p-2 text-white rounded-lg transition-colors ${
                    isAnalyzing 
                      ? 'bg-gray-600 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  title={isAnalyzing ? 'Analyzing...' : 'Analyze Image'}
                >
                  {isAnalyzing ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => onFileDelete && onFileDelete(index)}
                  disabled={isAnalyzing}
                  className={`p-2 text-white rounded-lg transition-colors ${
                    isAnalyzing 
                      ? 'bg-gray-600 cursor-not-allowed' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* File Info */}
            <div className="p-3">
              <h4 className="text-white font-medium text-sm truncate mb-1">
                {file.name}
              </h4>
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-xs">
                  {formatFileSize(file.size)}
                </p>
                {isAnalyzing && (
                  <span className="text-xs text-blue-400 font-medium">
                    Analyzing...
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FileGrid;
