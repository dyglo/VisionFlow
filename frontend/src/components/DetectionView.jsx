import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Text } from 'react-konva';
import { 
  Download, 
  Eye, 
  EyeOff, 
  ArrowLeft,
  Clock,
  Target,
  Cpu
} from 'lucide-react';

const DetectionView = ({ 
  file, 
  analysisResult, 
  onBack, 
  onExport,
  exportFormat,
  setExportFormat 
}) => {
  const [imageObj, setImageObj] = useState(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [visibleClasses, setVisibleClasses] = useState({});
  const stageRef = useRef(null);
  const containerRef = useRef(null);

  // Initialize visible classes
  useEffect(() => {
    if (analysisResult) {
      const classes = {};
      analysisResult.detections.forEach(det => {
        classes[det.class_name] = true;
      });
      setVisibleClasses(classes);
    }
  }, [analysisResult]);

  // Load image
  useEffect(() => {
    if (file) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setImageObj(img);
        updateStageSize(img);
      };
      
      if (typeof file === 'string') {
        img.src = file;
      } else if (file instanceof File) {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    }
  }, [file]);

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (imageObj) {
        updateStageSize(imageObj);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageObj]);

  const updateStageSize = (img) => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const containerWidth = container.offsetWidth - 32; // padding
    const containerHeight = container.offsetHeight - 32;
    
    const scale = Math.min(
      containerWidth / img.width,
      containerHeight / img.height,
      1
    );
    
    setStageSize({
      width: img.width * scale,
      height: img.height * scale
    });
  };

  const toggleClassVisibility = (className) => {
    setVisibleClasses(prev => ({
      ...prev,
      [className]: !prev[className]
    }));
  };

  const getClassColor = (className) => {
    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e', 
      '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
    ];
    const index = className.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const uniqueClasses = analysisResult 
    ? [...new Set(analysisResult.detections.map(det => det.class_name))]
    : [];

  if (!analysisResult) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <Target className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Analysis Results</h3>
          <p className="text-gray-400">Upload and analyze an image to see detection results</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-semibold text-white">Detection Results</h2>
              <p className="text-gray-400 text-sm">
                {file?.name || 'Uploaded Image'} • {analysisResult.total_objects} objects detected
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="yolo">YOLO Format</option>
              <option value="coco">COCO Format</option>
              <option value="voc">VOC Format</option>
            </select>
            
            <button
              onClick={onExport}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Image Canvas */}
        <div ref={containerRef} className="flex-1 p-4 overflow-hidden">
          <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg">
            {imageObj && (
              <Stage
                ref={stageRef}
                width={stageSize.width}
                height={stageSize.height}
                className="border border-gray-700 rounded-lg"
              >
                <Layer>
                  <KonvaImage
                    image={imageObj}
                    width={stageSize.width}
                    height={stageSize.height}
                  />
                  
                  {analysisResult.detections
                    .filter(det => visibleClasses[det.class_name])
                    .map((detection, index) => {
                      const scaleX = stageSize.width / imageObj.width;
                      const scaleY = stageSize.height / imageObj.height;
                      const color = getClassColor(detection.class_name);
                      
                      return (
                        <React.Fragment key={index}>
                          <Rect
                            x={detection.bbox[0] * scaleX}
                            y={detection.bbox[1] * scaleY}
                            width={detection.bbox[2] * scaleX}
                            height={detection.bbox[3] * scaleY}
                            stroke={color}
                            strokeWidth={3}
                            fill="transparent"
                          />
                          <Text
                            x={detection.bbox[0] * scaleX}
                            y={detection.bbox[1] * scaleY - 25}
                            text={`${detection.class_name} (${(detection.confidence * 100).toFixed(1)}%)`}
                            fontSize={14}
                            fontFamily="Arial"
                            fill={color}
                            padding={4}
                            background="rgba(0,0,0,0.7)"
                          />
                        </React.Fragment>
                      );
                    })}
                </Layer>
              </Stage>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 bg-gray-900 border-l border-gray-800 p-6 space-y-6">
        {/* Stats */}
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <h3 className="text-lg font-semibold text-white mb-4">Analysis Summary</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-blue-500" />
              <span className="text-gray-400">Total Objects</span>
            </div>
            <span className="text-white font-semibold">{analysisResult.total_objects}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-green-500" />
              <span className="text-gray-400">Processing Time</span>
            </div>
            <span className="text-white font-semibold">{analysisResult.processing_time.toFixed(2)}s</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-purple-500" />
              <span className="text-gray-400">Model Used</span>
            </div>
            <span className="text-white font-semibold">YOLOv8</span>
          </div>
        </div>

        {/* Detected Classes */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Detected Classes</h3>
          <div className="space-y-2">
            {uniqueClasses.map((className) => {
              const count = analysisResult.detections.filter(det => det.class_name === className).length;
              const color = getClassColor(className);
              
              return (
                <div key={className} className="flex items-center justify-between">
                  <button
                    onClick={() => toggleClassVisibility(className)}
                    className="flex items-center space-x-3 flex-1 text-left hover:bg-gray-700 p-2 rounded-lg transition-colors"
                  >
                    {visibleClasses[className] ? (
                      <Eye className="w-4 h-4" style={{ color }} />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-500" />
                    )}
                    <div className="flex-1">
                      <div className="text-white font-medium">{className}</div>
                      <div className="text-gray-400 text-sm">{count} object{count !== 1 ? 's' : ''}</div>
                    </div>
                  </button>
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: visibleClasses[className] ? color : '#6b7280' }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetectionView;
