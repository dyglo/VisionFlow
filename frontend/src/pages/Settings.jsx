import React, { useState } from 'react';
import { Save, RefreshCw, Trash2, Settings as SettingsIcon, Sliders, Palette, Bell, Shield } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Settings = () => {
  const { settings, dispatch, addNotification } = useApp();
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

  const yoloClasses = [
    'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
    'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
    'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
    'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
    'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
    'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
    'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake',
    'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop',
    'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
    'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
  ];

  const updateSetting = (key, value) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: localSettings });
    setHasChanges(false);
    addNotification('success', 'Settings saved successfully');
  };

  const handleReset = () => {
    const defaultSettings = {
      confidenceThreshold: 0.5,
      enabledClasses: yoloClasses,
      exportFormat: 'json',
      theme: 'dark',
      notifications: true,
      autoSave: true,
      maxFileSize: 50,
      processingQuality: 'high'
    };
    
    setLocalSettings(defaultSettings);
    dispatch({ type: 'UPDATE_SETTINGS', payload: defaultSettings });
    setHasChanges(false);
    addNotification('info', 'Settings reset to defaults');
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      localStorage.removeItem('visionflow-credits');
      localStorage.removeItem('visionflow-uploaded-files');
      localStorage.removeItem('visionflow-processed-files');
      localStorage.removeItem('visionflow-settings');
      localStorage.removeItem('visionflow-exports');
      
      dispatch({ type: 'CLEAR_ALL_DATA' });
      addNotification('success', 'All data cleared successfully');
    }
  };

  const toggleClass = (className) => {
    const updatedClasses = localSettings.enabledClasses.includes(className)
      ? localSettings.enabledClasses.filter(c => c !== className)
      : [...localSettings.enabledClasses, className];
    
    updateSetting('enabledClasses', updatedClasses);
  };

  const toggleAllClasses = () => {
    const allEnabled = localSettings.enabledClasses.length === yoloClasses.length;
    updateSetting('enabledClasses', allEnabled ? [] : yoloClasses);
  };

  return (
    <div className="flex-1 bg-black min-h-screen">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-gray-400 mt-1">Configure your VisionFlow preferences</p>
          </div>
          
          <div className="flex items-center space-x-3">
            {hasChanges && (
              <button
                onClick={handleSave}
                className="btn-primary px-4 py-2 rounded-lg flex items-center space-x-2 text-white font-medium"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            )}
            
            <button
              onClick={handleReset}
              className="btn-secondary px-4 py-2 rounded-lg flex items-center space-x-2 text-white"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Detection Settings */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Sliders className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Detection Settings</h2>
              <p className="text-gray-400 text-sm">Configure object detection parameters</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Confidence Threshold */}
            <div>
              <label className="block text-white font-medium mb-2">
                Confidence Threshold: {(localSettings.confidenceThreshold * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={localSettings.confidenceThreshold}
                onChange={(e) => updateSetting('confidenceThreshold', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>10%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Processing Quality */}
            <div>
              <label className="block text-white font-medium mb-2">Processing Quality</label>
              <select
                value={localSettings.processingQuality}
                onChange={(e) => updateSetting('processingQuality', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low (Faster)</option>
                <option value="medium">Medium (Balanced)</option>
                <option value="high">High (Better Accuracy)</option>
              </select>
            </div>

            {/* Max File Size */}
            <div>
              <label className="block text-white font-medium mb-2">
                Max File Size: {localSettings.maxFileSize} MB
              </label>
              <input
                type="range"
                min="10"
                max="200"
                step="10"
                value={localSettings.maxFileSize}
                onChange={(e) => updateSetting('maxFileSize', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>10 MB</span>
                <span>200 MB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Object Classes */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <SettingsIcon className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Object Classes</h2>
                <p className="text-gray-400 text-sm">Select which objects to detect</p>
              </div>
            </div>
            
            <button
              onClick={toggleAllClasses}
              className="btn-secondary px-4 py-2 rounded-lg text-white text-sm"
            >
              {localSettings.enabledClasses.length === yoloClasses.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-400">
              {localSettings.enabledClasses.length} of {yoloClasses.length} classes enabled
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
            {yoloClasses.map((className) => {
              const isEnabled = localSettings.enabledClasses.includes(className);
              return (
                <label
                  key={className}
                  className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    isEnabled ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-gray-800 border border-gray-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => toggleClass(className)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className={`text-sm ${isEnabled ? 'text-blue-300' : 'text-gray-300'}`}>
                    {className}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Export Settings */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Palette className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Export & UI Settings</h2>
              <p className="text-gray-400 text-sm">Configure export format and interface preferences</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-white font-medium mb-2">Default Export Format</label>
              <select
                value={localSettings.exportFormat}
                onChange={(e) => updateSetting('exportFormat', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="json">JSON</option>
                <option value="yolo">YOLO</option>
                <option value="coco">COCO</option>
                <option value="voc">Pascal VOC</option>
              </select>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Theme</label>
              <select
                value={localSettings.theme}
                onChange={(e) => updateSetting('theme', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="auto">Auto</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications & Privacy */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Notifications & Privacy</h2>
              <p className="text-gray-400 text-sm">Manage notifications and data preferences</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.notifications}
                onChange={(e) => updateSetting('notifications', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-white font-medium">Enable Notifications</span>
                <p className="text-gray-400 text-sm">Show success, error, and info messages</p>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.autoSave}
                onChange={(e) => updateSetting('autoSave', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-white font-medium">Auto-save Settings</span>
                <p className="text-gray-400 text-sm">Automatically save changes to browser storage</p>
              </div>
            </label>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Data Management</h2>
              <p className="text-gray-400 text-sm">Manage your stored data and privacy</p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Clear All Data</h3>
                <p className="text-gray-400 text-sm">Remove all uploaded files, results, and settings</p>
              </div>
              <button
                onClick={handleClearData}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear Data</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
