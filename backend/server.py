from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Request, Response, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from fastapi import Depends
from database import get_db
from models import File as FileModel, Detection, User, Export
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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize YOLO model
model = YOLO("yolov8n.pt")

# Custom CORS middleware for additional debugging and fallback
class CustomCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Log request details for debugging
        logger.info(f"Request: {request.method} {request.url} - Origin: {request.headers.get('origin')}")
        
        # Handle preflight OPTIONS requests
        if request.method == "OPTIONS":
            response = Response()
            origin = request.headers.get("origin")
            
            # Allow specific origins
            allowed_origins = [
                "http://localhost:3000",
                "https://vision-flow-alpha.vercel.app"
            ]
            
            if origin and (origin in allowed_origins or origin.endswith(".vercel.app")):
                response.headers["Access-Control-Allow-Origin"] = origin
            else:
                response.headers["Access-Control-Allow-Origin"] = "*"
                
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "*"
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Max-Age"] = "3600"
            
            logger.info(f"CORS preflight response headers: {dict(response.headers)}")
            return response
        
        # Process the request
        response = await call_next(request)
        
        # Add CORS headers to all responses as fallback
        origin = request.headers.get("origin")
        if origin:
            allowed_origins = [
                "http://localhost:3000",
                "https://vision-flow-alpha.vercel.app"
            ]
            
            if origin in allowed_origins or origin.endswith(".vercel.app"):
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
            else:
                response.headers["Access-Control-Allow-Origin"] = "*"
        
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        
        logger.info(f"Response headers: {dict(response.headers)}")
        return response

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
        cv2.rectangle(result_image, (x1, y1), (x2, y2), color_bgr, 8)
        
        # Draw label background
        label = f"{detection.class_name}: {detection.confidence:.2f}"
        label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
        cv2.rectangle(result_image, (x1, y1 - label_size[1] - 10), 
                     (x1 + label_size[0], y1), color_bgr, -1)
        
        # Draw label text
        cv2.putText(result_image, label, (x1, y1 - 5), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
    
    return result_image

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """Upload image and store it without running YOLO analysis."""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Only image files are supported")
        
        # Read file contents
        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded")
        
        logger.info(f"Uploading file: {file.filename}, size: {len(contents)} bytes, type: {file.content_type}")
        
        # Encode image to base64 for storage
        image_base64 = base64.b64encode(contents).decode('utf-8')
        
        # Create file record matching the database schema
        file_record = FileModel(
            filename=file.filename,
            filetype=file.content_type,  # Match database field name
            size=str(len(contents)),     # Match database field name and type
            image_data=image_base64      # Store base64 encoded image
        )
        
        # Save to database
        db.add(file_record)
        await db.commit()
        await db.refresh(file_record)
        
        logger.info(f"File uploaded successfully with ID: {file_record.id}")
        
        return {
            "status": "success",
            "file_id": str(file_record.id),
            "filename": file.filename,
            "message": "File uploaded and stored"
        }
        
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Old synchronous analyze endpoint removed - now using background processing

@api_router.post("/detect", response_model=AnalysisResult)
async def detect_objects(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
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
        
        # Persist to PostgreSQL
        file_record = FileModel(
            filename=file.filename,
            file_type=file.content_type,
            file_size=len(contents),
            image_data=image_base64,
            processing_time=processing_time
        )
        db.add(file_record)
        await db.flush()

        for det in detections:
            det_row = Detection(
                file_id=file_record.id,
                class_name=det.class_name,
                confidence=det.confidence,
                x_min=det.bbox[0],
                y_min=det.bbox[1],
                x_max=det.bbox[2],
                y_max=det.bbox[3]
            )
            db.add(det_row)

        await db.commit()

        return result
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@api_router.post("/export")
async def export_file(payload: Dict[str, Any], db: AsyncSession = Depends(get_db)):
    """Export annotated image or detections.
    Expected JSON payload: {"file_id": str, "format": "jpg|json|yolo"}
    """
    file_id = payload.get("file_id")
    export_format = payload.get("format", "jpg").lower()
    if not file_id:
        raise HTTPException(status_code=400, detail="file_id required")
    try:
        file_uuid = uuid.UUID(file_id)
        stmt = select(FileModel).where(FileModel.id == file_uuid)
        result = await db.execute(stmt)
        file = result.scalar_one_or_none()
        if not file:
            raise HTTPException(status_code=404, detail="File not found")

        det_stmt = select(Detection).where(Detection.file_id == file_uuid)
        det_res = await db.execute(det_stmt)
        detections = det_res.scalars().all()

        # JPG/PNG returns annotated image stored in image_data
        if export_format in ["jpg", "jpeg", "png"]:
            if not file.image_data:
                raise HTTPException(status_code=400, detail="Annotated image not available")
            image_bytes = base64.b64decode(file.image_data)
            headers = {"Content-Disposition": f"attachment; filename={file.filename}_annotated.jpg"}
            return StreamingResponse(io.BytesIO(image_bytes), media_type="image/jpeg", headers=headers)

        elif export_format == "json":
            det_json = [
                {
                    "class_name": d.class_name,
                    "confidence": d.confidence,
                    "bbox": d.box_coordinates,
                }
                for d in detections
            ]
            return JSONResponse(content={"file_id": file_id, "filename": file.filename, "detections": det_json})

        elif export_format == "yolo":
            lines = []
            for d in detections:
                x1, y1, x2, y2 = d.box_coordinates
                lines.append(f"{d.class_name} {x1} {y1} {x2} {y2} {d.confidence}")
            yolo_bytes = "\n".join(lines).encode()
            headers = {"Content-Disposition": f"attachment; filename={file.filename}.txt"}
            return StreamingResponse(io.BytesIO(yolo_bytes), media_type="text/plain", headers=headers)
        else:
            raise HTTPException(status_code=400, detail="Unsupported format")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Export error: {e}")
        raise HTTPException(status_code=500, detail="Error exporting results")

@api_router.get("/analyses", response_model=List[AnalysisResult])
async def get_analyses(db: AsyncSession = Depends(get_db)):
    """Get all analysis results"""
    try:
        # Get files with their detections, ordered by created_at desc
        stmt = select(FileModel).order_by(desc(FileModel.created_at)).limit(100)
        result = await db.execute(stmt)
        files = result.scalars().all()
        
        analyses = []
        for file in files:
            # Convert file and detections to AnalysisResult format
            detections = [
                DetectionResult(
                    id=str(det.id),
                    class_name=det.class_name,
                    confidence=det.confidence,
                    bbox=[det.x_min, det.y_min, det.x_max, det.y_max],
                    color=get_color_for_class(hash(det.class_name) % len(COLORS))
                ) for det in file.detections
            ]
            
            analysis = AnalysisResult(
                id=str(file.id),
                filename=file.filename,
                file_type=file.file_type,
                image_data=file.image_data,
                detections=detections,
                total_objects=len(detections),
                processing_time=file.processing_time or 0.0,
                timestamp=file.created_at
            )
            analyses.append(analysis)
            
        return analyses
    except Exception as e:
        logger.error(f"Error fetching analyses: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching analyses")

@api_router.get("/analyses/{analysis_id}", response_model=AnalysisResult)
async def get_analysis(analysis_id: str, db: AsyncSession = Depends(get_db)):
    """Get specific analysis result"""
    try:
        # Get file by ID with its detections
        stmt = select(FileModel).where(FileModel.id == analysis_id)
        result = await db.execute(stmt)
        file = result.scalar_one_or_none()
        
        if not file:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        # Convert file and detections to AnalysisResult format
        detections = [
            DetectionResult(
                id=str(det.id),
                class_name=det.class_name,
                confidence=det.confidence,
                bbox=[det.x_min, det.y_min, det.x_max, det.y_max],
                color=get_color_for_class(hash(det.class_name) % len(COLORS))
            ) for det in file.detections
        ]
        
        analysis = AnalysisResult(
            id=str(file.id),
            filename=file.filename,
            file_type=file.file_type,
            image_data=file.image_data,
            detections=detections,
            total_objects=len(detections),
            processing_time=file.processing_time or 0.0,
            timestamp=file.created_at
        )
        
        return analysis
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching analysis: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching analysis")

@api_router.post("/export/{analysis_id}")
async def export_analysis(analysis_id: str, format: str = "yolo", db: AsyncSession = Depends(get_db)):
    """Export analysis results in specified format"""
    try:
        # Get file by ID with its detections
        stmt = select(FileModel).where(FileModel.id == analysis_id)
        result = await db.execute(stmt)
        file = result.scalar_one_or_none()
        
        if not file:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        # Create temporary directory
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Save original image
            image_data = base64.b64decode(file.image_data)
            image_path = temp_path / f"{file.filename}"
            with open(image_path, 'wb') as f:
                f.write(image_data)
            
            # Generate annotations based on format
            if format == "yolo":
                annotations_path = temp_path / f"{Path(file.filename).stem}.txt"
                with open(annotations_path, 'w') as f:
                    for det in file.detections:
                        # Convert to YOLO format (normalized coordinates)
                        # Note: This is a simplified conversion - in real implementation,
                        # you'd need image dimensions for proper normalization
                        f.write(f"0 {det.x_min} {det.y_min} {det.x_max} {det.y_max}\n")
            
            elif format == "coco":
                coco_data = {
                    "images": [{"id": 1, "file_name": file.filename}],
                    "annotations": [],
                    "categories": []
                }
                
                for i, det in enumerate(file.detections):
                    annotation = {
                        "id": i,
                        "image_id": 1,
                        "category_id": 1,
                        "bbox": [det.x_min, det.y_min, det.x_max, det.y_max],
                        "area": (det.x_max - det.x_min) * (det.y_max - det.y_min),
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

# Add root endpoint for health checks and CORS verification
@app.get("/")
async def app_root():
    return {"message": "VisionFlow API - YOLOv8 Object Detection Service", "status": "healthy"}

# Original API routes
@api_router.get("/")
async def root():
    return {"message": "VisionFlow API - YOLOv8 Object Detection Service"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate, db: AsyncSession = Depends(get_db)):
    """Create a status check entry"""
    try:
        # For now, just return the status check without storing it
        # You can implement User model storage if needed
        status_obj = StatusCheck(**input.dict())
        return status_obj
    except Exception as e:
        logger.error(f"Error creating status check: {str(e)}")
        raise HTTPException(status_code=500, detail="Error creating status check")

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks(db: AsyncSession = Depends(get_db)):
    """Get status checks - simplified implementation"""
    try:
        # Return empty list for now - implement User-based storage if needed
        return []
    except Exception as e:
        logger.error(f"Error fetching status checks: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching status checks")

# Add custom CORS middleware first for debugging and fallback
app.add_middleware(CustomCORSMiddleware)

# Configure standard CORS middleware as backup
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://vision-flow-alpha.vercel.app",
    ],
    # Allow any *.vercel.app deployment previews
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Add explicit OPTIONS handler for CORS preflight requests
@app.options("/{path:path}")
async def options_handler(path: str):
    """Handle CORS preflight requests"""
    return JSONResponse(
        content={"message": "CORS preflight OK"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600",
        }
    )

# In-memory caches for analysis status and results (for demo/free tier only)
analysis_status: Dict[str, str] = {}
analysis_results: Dict[str, Any] = {}

# ---------------- Background Analysis Helpers -----------------
async def analyze_file_internal(file_id: str, db: AsyncSession):
    """Internal function to run YOLO analysis - used by both sync and async endpoints"""
    import time
    start_time = time.time()
    
    # Convert string file_id to UUID
    file_uuid = uuid.UUID(file_id)
    
    # Get the file from database
    stmt = select(FileModel).where(FileModel.id == file_uuid)
    result = await db.execute(stmt)
    file = result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Delete existing detections for this file
    delete_stmt = delete(Detection).where(Detection.file_id == file.id)
    await db.execute(delete_stmt)
    
    # Decode base64 image
    image_data = base64.b64decode(file.image_data)
    image_array = np.frombuffer(image_data, np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    
    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image data")
    
    # Run YOLO detection
    results = model(image)
    detections = process_image_detections(results, image)
    
    # Draw bounding boxes on image
    annotated_image = draw_detections_on_image(image.copy(), detections)
    annotated_base64 = encode_image_to_base64(annotated_image)
    
    # Store detections in database
    for det in detections:
        detection = Detection(
            file_id=file.id,
            class_name=det.class_name,
            confidence=str(det.confidence),
            box_coordinates=det.bbox
        )
        db.add(detection)
    
    # Update file with annotated image
    file.image_data = annotated_base64
    
    await db.commit()
    await db.refresh(file)
    
    processing_time = time.time() - start_time
    
    # Return AnalysisResult
    return AnalysisResult(
        id=str(file.id),
        filename=file.filename,
        file_type=file.filetype,
        image_data=annotated_base64,
        detections=detections,
        total_objects=len(detections),
        processing_time=processing_time,
        timestamp=file.created_at
    )

async def _run_analysis(file_id: str):
    """Background task that runs YOLO detection and stores result in cache and DB."""
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
    # Create a new session because the background task has no request context
    engine = create_async_engine(os.getenv("DATABASE_URL"))
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with async_session() as db:
        try:
            logger.info(f"[BG] Running analysis for {file_id}")
            # Re-use existing analyze logic via internal function
            result = await analyze_file_internal(file_id, db)
            analysis_results[file_id] = result.dict()  # Convert to dict for JSON serialization
            analysis_status[file_id] = "done"
            logger.info(f"[BG] Analysis complete for {file_id}")
        except Exception as e:
            analysis_status[file_id] = "error"
            analysis_results[file_id] = {"detail": str(e)}
            logger.error(f"[BG] Analysis failed for {file_id}: {e}")

# ---------------- API Endpoints -----------------

@api_router.post("/analyze/{file_id}")
async def start_analysis(file_id: str, background_tasks: BackgroundTasks):
    """Kick off background analysis and return immediately"""
    # If already processing or done, short-circuit
    status = analysis_status.get(file_id)
    if status in {"processing", "done"}:
        return {"status": status, "file_id": file_id}

    analysis_status[file_id] = "processing"
    background_tasks.add_task(_run_analysis, file_id)
    return {"status": "processing", "file_id": file_id}

@api_router.get("/analysis/{file_id}")
async def get_analysis_status(file_id: str):
    status = analysis_status.get(file_id, "not_found")
    if status == "done":
        return {"status": "done", "result": analysis_results.get(file_id)}
    elif status == "error":
        return {"status": "error", "detail": analysis_results.get(file_id, {}).get("detail", "Unknown error")}
    elif status == "processing":
        return {"status": "processing"}
    else:
        return {"status": "not_found"}

# Include the router in the main app
app.include_router(api_router)

# Database connections are handled by SQLAlchemy engine