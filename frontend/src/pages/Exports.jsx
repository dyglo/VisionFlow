import React, { useState, useEffect } from 'react';
import { Download, FileText, Archive, Trash2, Calendar, Filter, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';

const Exports = () => {
  const { processedFiles, addNotification } = useApp();
  const [exports, setExports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFormat, setFilterFormat] = useState('all');
  const [selectedExports, setSelectedExports] = useState([]);

  const exportFormats = [
    { value: 'json', label: 'JSON', icon: FileText, color: 'text-blue-400' },
    { value: 'yolo', label: 'YOLO', icon: FileText, color: 'text-green-400' },
    { value: 'coco', label: 'COCO', icon: FileText, color: 'text-purple-400' },
    { value: 'voc', label: 'VOC', icon: Archive, color: 'text-orange-400' }
  ];

  useEffect(() => {
    // Load export history from localStorage
    const savedExports = localStorage.getItem('visionflow-exports');
    if (savedExports) {
      try {
        setExports(JSON.parse(savedExports));
      } catch (error) {
        console.error('Failed to load export history:', error);
      }
    }
  }, []);

  const saveExports = (newExports) => {
    setExports(newExports);
    localStorage.setItem('visionflow-exports', JSON.stringify(newExports));
  };

  const handleExport = async (fileId, format) => {
    try {
      const file = processedFiles.find(f => f.id === fileId);
      if (!file) return;

      addNotification('info', `Exporting ${file.name} as ${format.toUpperCase()}...`);
      
      const blob = await apiService.exportResults(fileId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.split('.')[0]}_results.${format === 'json' ? 'json' : 'zip'}`;
      a.click();
      window.URL.revokeObjectURL(url);

      // Add to export history
      const newExport = {
        id: Date.now(),
        fileId,
        fileName: file.name,
        format,
        exportedAt: new Date().toISOString(),
        size: blob.size,
        detectionCount: file.detections?.length || 0
      };

      const updatedExports = [newExport, ...exports];
      saveExports(updatedExports);

      addNotification('success', `${file.name} exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      addNotification('error', `Failed to export ${format.toUpperCase()} format`);
    }
  };

  const handleBulkExport = async (format) => {
    if (selectedExports.length === 0) return;

    try {
      addNotification('info', `Bulk exporting ${selectedExports.length} files as ${format.toUpperCase()}...`);
      
      for (const exportId of selectedExports) {
        const exportItem = exports.find(e => e.id === exportId);
        if (exportItem) {
          await handleExport(exportItem.fileId, format);
        }
      }
      
      setSelectedExports([]);
      addNotification('success', `Bulk export completed for ${selectedExports.length} files`);
    } catch (error) {
      addNotification('error', 'Bulk export failed');
    }
  };

  const handleDeleteExport = (exportId) => {
    const updatedExports = exports.filter(e => e.id !== exportId);
    saveExports(updatedExports);
    addNotification('success', 'Export record deleted');
  };

  const toggleExportSelection = (exportId) => {
    setSelectedExports(prev => 
      prev.includes(exportId) 
        ? prev.filter(id => id !== exportId)
        : [...prev, exportId]
    );
  };

  const filteredExports = exports.filter(exportItem => {
    const matchesSearch = exportItem.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFormat = filterFormat === 'all' || exportItem.format === filterFormat;
    return matchesSearch && matchesFormat;
  });

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFormatInfo = (format) => {
    return exportFormats.find(f => f.value === format) || exportFormats[0];
  };

  return (
    <div className="flex-1 bg-black min-h-screen">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Exports</h1>
            <p className="text-gray-400 mt-1">Download and manage your detection results</p>
          </div>
          
          {selectedExports.length > 0 && (
            <div className="flex items-center space-x-2">
              {exportFormats.map((format) => (
                <button
                  key={format.value}
                  onClick={() => handleBulkExport(format.value)}
                  className="btn-secondary px-3 py-2 rounded-lg flex items-center space-x-2 text-white text-sm"
                >
                  <format.icon className="w-4 h-4" />
                  <span>{format.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search exports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={filterFormat}
            onChange={(e) => setFilterFormat(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Formats</option>
            {exportFormats.map((format) => (
              <option key={format.value} value={format.value}>
                {format.label}
              </option>
            ))}
          </select>
        </div>

        {/* Export New Files */}
        {processedFiles.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Export Processed Files</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {processedFiles.slice(0, 6).map((file) => (
                <div key={file.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                      {file.type === 'image' ? '🖼️' : '🎥'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{file.name}</p>
                      <p className="text-gray-400 text-sm">{file.detections?.length || 0} objects</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {exportFormats.map((format) => (
                      <button
                        key={format.value}
                        onClick={() => handleExport(file.id, format.value)}
                        className={`flex items-center justify-center space-x-1 px-3 py-2 rounded text-sm transition-colors bg-gray-700 hover:bg-gray-600 text-white`}
                      >
                        <format.icon className="w-3 h-3" />
                        <span>{format.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Export History */}
        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Export History</h2>
              <div className="text-sm text-gray-400">
                {filteredExports.length} exports
                {selectedExports.length > 0 && ` • ${selectedExports.length} selected`}
              </div>
            </div>
          </div>

          {filteredExports.length > 0 ? (
            <div className="divide-y divide-gray-800">
              {filteredExports.map((exportItem) => {
                const formatInfo = getFormatInfo(exportItem.format);
                const isSelected = selectedExports.includes(exportItem.id);
                
                return (
                  <div key={exportItem.id} className={`p-6 hover:bg-gray-800 transition-colors ${isSelected ? 'bg-gray-800' : ''}`}>
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleExportSelection(exportItem.id)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gray-800`}>
                        <formatInfo.icon className={`w-5 h-5 ${formatInfo.color}`} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="text-white font-medium">{exportItem.fileName}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${formatInfo.color} bg-gray-800`}>
                            {formatInfo.label}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(exportItem.exportedAt).toLocaleDateString()}
                          </span>
                          <span>{formatFileSize(exportItem.size)}</span>
                          <span>{exportItem.detectionCount} objects</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleExport(exportItem.fileId, exportItem.format)}
                          className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                          title="Re-download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDeleteExport(exportItem.id)}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No exports yet</h3>
              <p className="text-gray-400">Export your processed files to download detection results</p>
            </div>
          )}
        </div>

        {/* Format Information */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">Export Formats</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {exportFormats.map((format) => (
              <div key={format.value} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center space-x-3 mb-2">
                  <format.icon className={`w-5 h-5 ${format.color}`} />
                  <h4 className="text-white font-medium">{format.label}</h4>
                </div>
                <p className="text-gray-400 text-sm">
                  {format.value === 'json' && 'Standard JSON format with bounding boxes and labels'}
                  {format.value === 'yolo' && 'YOLO format for training and inference'}
                  {format.value === 'coco' && 'COCO dataset format for research'}
                  {format.value === 'voc' && 'Pascal VOC XML format'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Exports;
