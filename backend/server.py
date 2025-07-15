from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import cv2
import numpy as np
from ultralytics import YOLO
import base64
import tempfile
import zipfile
import json
import io
from PIL import Image
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize YOLO model
model = YOLO("yolov8n.pt")

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class DetectionResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    class_name: str
    confidence: float
    bbox: List[float]  # [x1, y1, x2, y2]
    color: str

class AnalysisResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    file_type: str
    image_data: str  # base64 encoded image
    detections: List[DetectionResult]
    total_objects: int
    processing_time: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Color palette for different classes
COLORS = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", 
    "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"
]

def get_color_for_class(class_index: int) -> str:
    return COLORS[class_index % len(COLORS)]

def encode_image_to_base64(image_array: np.ndarray) -> str:
    """Convert image array to base64 string"""
    is_success, buffer = cv2.imencode(".jpg", image_array)
    if not is_success:
        raise ValueError("Failed to encode image")
    return base64.b64encode(buffer).decode('utf-8')

def process_image_detections(results, original_image: np.ndarray) -> List[DetectionResult]:
    """Process YOLO results and return detection objects"""
    detections = []
    
    if results[0].boxes is not None:
        for i, box in enumerate(results[0].boxes):
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            confidence = float(box.conf[0].cpu().numpy())
            class_id = int(box.cls[0].cpu().numpy())
            class_name = model.names[class_id]
            
            detection = DetectionResult(
                class_name=class_name,
                confidence=confidence,
                bbox=[float(x1), float(y1), float(x2), float(y2)],
                color=get_color_for_class(class_id)
            )
            detections.append(detection)
    
    return detections

def draw_detections_on_image(image: np.ndarray, detections: List[DetectionResult]) -> np.ndarray:
    """Draw bounding boxes and labels on image"""
    result_image = image.copy()
    
    for detection in detections:
        x1, y1, x2, y2 = [int(coord) for coord in detection.bbox]
        
        # Convert hex color to BGR
        color_hex = detection.color.lstrip('#')
        color_rgb = tuple(int(color_hex[i:i+2], 16) for i in (0, 2, 4))
        color_bgr = color_rgb[::-1]  # Convert RGB to BGR
        
        # Draw rectangle
        cv2.rectangle(result_image, (x1, y1), (x2, y2), color_bgr, 2)
        
        # Draw label background
        label = f"{detection.class_name}: {detection.confidence:.2f}"
        label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
        cv2.rectangle(result_image, (x1, y1 - label_size[1] - 10), 
                     (x1 + label_size[0], y1), color_bgr, -1)
        
        # Draw label text
        cv2.putText(result_image, label, (x1, y1 - 5), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
    
    return result_image

@api_router.post("/detect", response_model=AnalysisResult)
async def detect_objects(file: UploadFile = File(...)):
    """Detect objects in uploaded image using YOLOv8"""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Only image files are supported")
        
        # Read image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Run YOLO detection
        start_time = datetime.now()
        results = model(image)
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Process detections
        detections = process_image_detections(results, image)
        
        # Create annotated image
        annotated_image = draw_detections_on_image(image, detections)
        
        # Convert to base64
        image_base64 = encode_image_to_base64(annotated_image)
        
        # Create result object
        result = AnalysisResult(
            filename=file.filename,
            file_type=file.content_type,
            image_data=image_base64,
            detections=detections,
            total_objects=len(detections),
            processing_time=processing_time
        )
        
        # Save to database
        await db.analyses.insert_one(result.dict())
        
        return result
        
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@api_router.get("/analyses", response_model=List[AnalysisResult])
async def get_analyses():
    """Get all analysis results"""
    try:
        analyses = await db.analyses.find().sort("timestamp", -1).to_list(100)
        return [AnalysisResult(**analysis) for analysis in analyses]
    except Exception as e:
        logger.error(f"Error fetching analyses: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching analyses")

@api_router.get("/analyses/{analysis_id}", response_model=AnalysisResult)
async def get_analysis(analysis_id: str):
    """Get specific analysis result"""
    try:
        analysis = await db.analyses.find_one({"id": analysis_id})
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        return AnalysisResult(**analysis)
    except Exception as e:
        logger.error(f"Error fetching analysis: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching analysis")

@api_router.post("/export/{analysis_id}")
async def export_analysis(analysis_id: str, format: str = "yolo"):
    """Export analysis results in specified format"""
    try:
        analysis = await db.analyses.find_one({"id": analysis_id})
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        # Create temporary directory
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Save original image
            image_data = base64.b64decode(analysis["image_data"])
            image_path = temp_path / f"{analysis['filename']}"
            with open(image_path, 'wb') as f:
                f.write(image_data)
            
            # Generate annotations based on format
            if format == "yolo":
                annotations_path = temp_path / f"{Path(analysis['filename']).stem}.txt"
                with open(annotations_path, 'w') as f:
                    for det in analysis["detections"]:
                        # Convert to YOLO format (normalized coordinates)
                        # Note: This is a simplified conversion - in real implementation,
                        # you'd need image dimensions for proper normalization
                        f.write(f"0 {det['bbox'][0]} {det['bbox'][1]} {det['bbox'][2]} {det['bbox'][3]}\n")
            
            elif format == "coco":
                coco_data = {
                    "images": [{"id": 1, "file_name": analysis['filename']}],
                    "annotations": [],
                    "categories": []
                }
                
                for i, det in enumerate(analysis["detections"]):
                    annotation = {
                        "id": i,
                        "image_id": 1,
                        "category_id": 1,
                        "bbox": det['bbox'],
                        "area": (det['bbox'][2] - det['bbox'][0]) * (det['bbox'][3] - det['bbox'][1]),
                        "iscrowd": 0
                    }
                    coco_data["annotations"].append(annotation)
                
                annotations_path = temp_path / "annotations.json"
                with open(annotations_path, 'w') as f:
                    json.dump(coco_data, f, indent=2)
            
            # Create ZIP file
            zip_path = temp_path / f"export_{analysis_id}.zip"
            with zipfile.ZipFile(zip_path, 'w') as zipf:
                for file_path in temp_path.glob("*"):
                    if file_path != zip_path:
                        zipf.write(file_path, file_path.name)
            
            # Return ZIP file - read the file content before the temp directory is deleted
            with open(zip_path, 'rb') as f:
                zip_content = f.read()
            
            return StreamingResponse(
                io.BytesIO(zip_content),
                media_type="application/zip",
                headers={"Content-Disposition": f"attachment; filename=export_{analysis_id}.zip"}
            )
            
    except Exception as e:
        logger.error(f"Error exporting analysis: {str(e)}")
        raise HTTPException(status_code=500, detail="Error exporting analysis")

# Original routes
@api_router.get("/")
async def root():
    return {"message": "VisionFlow API - YOLOv8 Object Detection Service"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()