# VisionFlow

**VisionFlow** is a modern, AI-powered full-stack application for visual object detection and analysis. Built with React and FastAPI, it leverages YOLOv8 deep learning models to provide real-time object detection on uploaded images and videos with interactive visualization and export capabilities.

![VisionFlow Demo](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)
![Python](https://img.shields.io/badge/Python-3.8%2B-blue)
![React](https://img.shields.io/badge/React-18.2-blue)

## ✨ Features

### 🎯 Core Functionality
- **Smart Object Detection**: Powered by YOLOv8 for accurate real-time detection
- **Interactive UI**: Modern React interface with TailwindCSS styling
- **Modal Image Viewer**: Expanded view with enhanced bounding box visualization
- **Multi-format Export**: Support for annotated images, JSON metadata, and YOLO format
- **Real-time Processing**: Async backend processing with live status updates

### 🖼️ Image Analysis
- Upload images in common formats (JPG, PNG, etc.)
- Automatic object detection with confidence scores
- Enhanced bounding boxes with 4x thickness for better visibility
- Class labels with color-coded annotations
- Thumbnail grid view with analysis status

### 📊 Data Management
- PostgreSQL database for persistent storage
- File metadata tracking and analysis history
- Efficient state management with React Context
- LocalStorage optimization to prevent quota issues

## 🚀 Quick Start

### Prerequisites

- **Python 3.8+**
- **Node.js 16+**
- **PostgreSQL 12+**
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/dyglo/VisionFlow.git
cd VisionFlow
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
alembic upgrade head

# Start the server
uvicorn server:app --reload
```

The backend will be available at `http://localhost:8000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

The frontend will be available at `http://localhost:3000`

## 🏗️ Architecture

### Backend (FastAPI)
- **Framework**: FastAPI with async/await support
- **AI Model**: YOLOv8 via Ultralytics
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Image Processing**: OpenCV and Pillow
- **API Documentation**: Auto-generated Swagger UI at `/docs`

### Frontend (React)
- **Framework**: React 18 with functional components
- **Styling**: TailwindCSS for responsive design
- **State Management**: React Context API
- **Icons**: Lucide React icon library
- **HTTP Client**: Axios for API communication

### Database Schema
```sql
-- Files table
CREATE TABLE files (
    id UUID PRIMARY KEY,
    filename VARCHAR NOT NULL,
    filetype VARCHAR NOT NULL,
    size INTEGER NOT NULL,
    image_data TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Detections table
CREATE TABLE detections (
    id UUID PRIMARY KEY,
    file_id UUID REFERENCES files(id),
    class_name VARCHAR NOT NULL,
    confidence VARCHAR NOT NULL,
    box_coordinates JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 📁 Project Structure

```
VisionFlow/
├── backend/
│   ├── server.py              # FastAPI application
│   ├── models.py              # SQLAlchemy models
│   ├── requirements.txt       # Python dependencies
│   ├── alembic/              # Database migrations
│   └── .env                  # Environment variables
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable React components
│   │   ├── pages/           # Main application pages
│   │   ├── context/         # React Context providers
│   │   └── services/        # API service layer
│   ├── public/              # Static assets
│   └── package.json         # Node.js dependencies
└── README.md
```

## 🔧 Configuration

### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/visionflow

# API Settings
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True

# CORS Settings
ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend Configuration

The frontend automatically connects to the backend at `http://localhost:8000`. To change this, modify the API base URL in `src/services/apiService.js`.

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📦 Deployment

### Production Build

**Backend:**
```bash
cd backend
pip install gunicorn
gunicorn server:app --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve the build folder with your preferred web server
```

### Docker Support (Coming Soon)

Docker configurations will be added for easy containerized deployment.

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and ensure tests pass
4. **Commit your changes**: `git commit -m 'Add amazing feature'`
5. **Push to the branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Development Guidelines

- Follow PEP 8 for Python code
- Use ESLint and Prettier for JavaScript/React code
- Write tests for new features
- Update documentation as needed
- Ensure all CI checks pass

### Code Style

**Backend:**
```bash
# Format code
black .

# Lint code
flake8 .
```

**Frontend:**
```bash
# Format code
npm run format

# Lint code
npm run lint
```

## 🐛 Issues and Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/dyglo/VisionFlow/issues) page
2. Search for existing solutions
3. Create a new issue with detailed information

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Ultralytics** for the YOLOv8 model
- **FastAPI** for the excellent web framework
- **React** and **TailwindCSS** for the frontend stack
- **OpenCV** for image processing capabilities

## 🔮 Roadmap

- [ ] Video upload and frame-by-frame analysis
- [ ] Custom model training interface
- [ ] Batch processing capabilities
- [ ] Advanced export formats (COCO, VOC)
- [ ] User authentication and project management
- [ ] Real-time collaboration features
- [ ] Mobile app development

---

**Made with passion for the computer vision community**
