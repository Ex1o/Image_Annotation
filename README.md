# 🎯 VisionRapid - Image Annotation Platform

Build production-ready computer vision models in minutes. Upload, auto-label, train and deploy with no ML expertise required.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6?logo=typescript)
![Python](https://img.shields.io/badge/Python-3.9+-3776AB?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688?logo=fastapi)

## ✨ Features

- 🔐 **User Authentication** - Secure JWT-based authentication with login/signup
- 🖼️ **Image Upload & Management** - Drag-and-drop interface for uploading images
- 🏷️ **Auto-Labeling** - Automatic image annotation using YOLOv8 segmentation
- ✏️ **Manual Annotation** - Interactive annotation tools for precise labeling
- 🤖 **Model Training** - Train custom computer vision models
- 🚀 **Quick Deployment** - Deploy models with a single click
- 🎨 **Modern UI** - Beautiful, responsive interface built with Shadcn/UI
- 🔄 **Real-time Processing** - Fast image processing with Python backend

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **Shadcn/UI** - High-quality React components
- **React Router** - Client-side routing
- **TanStack Query** - Server state management
- **Framer Motion** - Smooth animations

### Backend
- **FastAPI** - High-performance Python API
- **Ultralytics YOLOv8** - State-of-the-art object detection and segmentation
- **OpenCV** - Computer vision operations
- **Uvicorn** - ASGI server

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Python** (v3.9 or higher)
- **pip** (Python package manager)

## 🚀 Getting Started

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/Ex1o/Image_Annotation.git
cd image-annotation
```

### 2️⃣ Frontend Setup

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 4️⃣ Authentication Setup

The application now includes JWT-based authentication. For detailed setup instructions, see [AUTH_SETUP.md](AUTH_SETUP.md).

**Quick Start:**
1. Start both frontend and backend servers
2. Navigate to `http://localhost:5173/login`
3. Create an account using the Sign Up tab
4. Login with your credentials

The home page and other routes are now protected and require authentication.

### 3️⃣ Backend Setup

```bash
# Navigate to backend directory
cd Backend

# Create a virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
python Server.py
```

The backend API will be available at `http://localhost:8000`

## 📁 Project Structure

```
Image_Annotation/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── contexts/          # React contexts
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Utility functions
│   └── assets/            # Static assets
├── Backend/               # Backend source code
│   ├── Server.py          # FastAPI application
│   ├── requirements.txt   # Python dependencies
│   ├── outputs/           # Model outputs
│   └── yolov8n-seg.pt    # YOLOv8 model weights
├── public/                # Public static files
├── dist/                  # Production build
└── package.json           # Node dependencies
```

## 🎮 Usage

1. **Upload Images**: Navigate to the home page and drag-and-drop images or click to upload
2. **Auto-Label**: Use the auto-labeling feature powered by YOLOv8 for instant annotations
3. **Manual Annotation**: Refine annotations using the annotation tools
4. **Build Model**: Navigate to `/build` to train your custom model
5. **Deploy**: Export and deploy your trained model

## 📝 Available Scripts

### Frontend

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
```

### Backend

```bash
python Server.py     # Start FastAPI server
uvicorn Server:app --reload  # Start with auto-reload
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Frontend
VITE_API_URL=http://localhost:8000

# Backend
BACKEND_PORT=8000
MODEL_PATH=./yolov8n-seg.pt
```

## 🧪 Testing

```bash
# Run frontend tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 📦 Building for Production

```bash
# Build frontend
npm run build

# The build output will be in the dist/ directory
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Known Issues

- Model files (*.pt) are large and excluded from git. Download YOLOv8 weights separately.
- First-time model loading may take longer due to initialization.

## 🗺️ Roadmap

- [x] User authentication and authorization (JWT-based)
- [ ] Multi-user collaboration
- [ ] Cloud storage integration
- [ ] Export annotations in multiple formats (COCO, YOLO, Pascal VOC)
- [ ] Advanced model training options
- [ ] Real-time collaboration features
- [ ] Mobile app support

## 📧 Contact

For questions or support, please open an issue on GitHub or contact the maintainers.

---

**Made with ❤️ by VisionRapid Team**
