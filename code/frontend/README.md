# Drone Imagery Hub - Frontend

A React-based web interface for uploading, processing, and viewing drone imagery with image stitching capabilities.

## 🎨 Design Theme

- **Color Scheme**: Red and Black
- **Primary Colors**: Red accents (`#dc2626`) on dark backgrounds (`#0f172a`)
- **Typography**: Inter font family for modern, clean appearance
- **Style**: Dark theme with glass effects and smooth transitions

## 🚀 Getting Started

### Prerequisites

- Node.js (version 14 or higher recommended)
- npm or yarn package manager

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd code/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open your browser to view the app. The default URL is [http://localhost:3000](http://localhost:3000).

### Port Configuration

The development server runs on port 3000 by default. To use a different port:

1. Create a `.env` file in the `code/frontend` directory
2. Add your desired port:
   ```
   PORT=3001
   ```
3. Restart the development server with `npm start`

The app will then be available at `http://localhost:YOUR_PORT`.

## 🛠️ Tech Stack

- **React 18** - UI library with TypeScript support
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Create React App** - Build tooling and development server
- **react-pdf** - PDF viewing and rendering library
- **react-dropzone** - Drag-and-drop file upload functionality

## 📁 Project Structure

```
src/
├── components/
│   ├── Header.tsx          # Application header
│   ├── Sidebar.tsx         # Sidebar navigation
│   ├── UploadView.tsx      # File upload interface
│   ├── ProcessingView.tsx  # Processing queue monitoring
│   ├── GalleryView.tsx     # Image gallery with backend integration
│   ├── FieldMapsView.tsx   # Field maps visualization
│   └── PesticidePrescriptionsView.tsx  # Pesticide prescriptions with spray maps
├── services/
│   └── api.ts             # API service for backend communication
├── types/
│   ├── upload.ts          # Upload-related type definitions
│   └── index.ts           # General type definitions
├── App.tsx                 # Main application component
├── App.css                 # Custom styles and utilities
├── index.tsx              # Application entry point
└── index.css              # Global styles and Tailwind imports
```

## 🎯 Current Features

### ✅ Implemented (Sprint 2)
- **Navigation System**: Tab-based navigation between Upload, Gallery, Processing, Field Maps, and Pesticides views
- **Dark Theme**: Red and black color scheme throughout
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Upload Interface**: Drag-and-drop area with visual feedback, task naming, and parameter configuration
- **Gallery View**: Backend-integrated gallery with real processed images, PDF report viewing, and full-screen previews
- **Processing View**: Real-time processing queue monitoring with status updates
- **Field Maps View**: Field maps visualization interface (UI ready, backend integration pending)
- **Pesticide Prescriptions**: Spray map functionality with color-coded levels and grid editing
- **Backend Integration**: Complete API service for upload, processing, and results retrieval
- **PDF Viewing**: PDF report viewing with react-pdf library and page navigation
- **Task Management**: Task naming, metadata display, and organization
- **Real-time Updates**: Automatic status polling and progress tracking

## 🎨 UI Components

### Navigation
- Clean tab-style navigation
- Active state highlighting with red accent
- Smooth hover effects and transitions

### Upload View
- Large drag-and-drop upload area
- Upload queue management
- File format validation (JPEG, PNG, TIFF)
- Progress indicators

### Gallery View
- Responsive image grid layout with backend integration
- Real-time task listing from backend API
- Image metadata display with task names
- Lightbox viewer for full-screen image previews
- PDF report viewing with page navigation
- Download functionality for orthophotos and reports
- Empty state handling for no processed tasks

### Processing View
- Real-time processing queue monitoring
- Task status indicators and progress tracking
- Automatic status polling
- Error handling and display
- Task history and management

### Pesticide Prescriptions View
- Spray map functionality with interactive grid
- Color-coded spray level selection
- Bulk apply options for spray levels
- Grid initialization based on prescriptions
- Prescription metadata display

## 🎨 Color Palette

```css
/* Primary Red Colors */
primary-500: #dc2626  /* Main red */
primary-400: #f87171  /* Light red */
primary-600: #b91c1c  /* Dark red */

/* Dark Theme Colors */
dark-900: #0f172a     /* Background */
dark-800: #1e293b     /* Cards */
dark-700: #334155     /* Borders */
dark-600: #475569     /* Text secondary */
dark-300: #cbd5e1     /* Text primary */
```

## 📱 Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px
- **Large Desktop**: > 1280px

## 🔧 Available Scripts

- `npm start` - Runs the app in development mode
- `npm build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm eject` - Ejects from Create React App (one-way operation)

## 🚀 Development Workflow

1. **Component Development**: Create new components in `src/components/`
2. **Styling**: Use Tailwind classes with custom red/black theme
3. **State Management**: Currently using React useState (can be upgraded to Redux/Zustand)
4. **API Integration**: Complete backend integration via `src/services/api.ts`
5. **Type Safety**: TypeScript types defined in `src/types/` directory
6. **Backend Communication**: API service handles all backend requests with error handling

## 🔮 Future Enhancements

- Field maps backend integration
- Pesticide prescription backend integration
- Advanced gallery filters and sorting
- Image annotation tools
- Offline support
- Keyboard shortcuts
- Batch operations for tasks
- Task deletion functionality
- Advanced search and filtering
- User authentication and authorization

## Sprint 2 Updates

### New Features
- **Gallery Backend Integration**: Gallery view now fetches and displays real processed tasks from backend
- **PDF Report Viewing**: Full PDF viewing functionality with react-pdf library
- **Task Naming**: Users can name tasks during upload for better organization
- **Enhanced Upload**: Added heading and grid size parameter configuration
- **Spray Map Functionality**: Interactive spray map editing in pesticide prescriptions view
- **Results API Integration**: Complete integration with backend results API
- **Full-Screen Previews**: Lightbox viewer for images and PDF reports
- **Download Functionality**: Download orthophotos and reports directly from gallery

### Improvements
- Replaced all mock data in Gallery view with real backend data
- Enhanced error handling and user feedback
- Improved loading states and empty state handling
- Better task organization with task names
- Real-time status updates and progress tracking
- Enhanced API service with comprehensive error handling

## 🤝 Contributing

1. Follow the existing code style and component structure
2. Use TypeScript for type safety
3. Maintain the red/black theme consistency
4. Test responsive design on multiple screen sizes
5. Add proper error handling and loading states

## 📄 License

This project is part of the DroneBasedDevelopment repository.
