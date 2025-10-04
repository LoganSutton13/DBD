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

## 📁 Project Structure

```
src/
├── components/
│   ├── Navigation.tsx      # Tab navigation component
│   ├── UploadView.tsx      # File upload interface
│   └── GalleryView.tsx     # Image gallery display
├── App.tsx                 # Main application component
├── App.css                 # Custom styles and utilities
├── index.tsx              # Application entry point
└── index.css              # Global styles and Tailwind imports
```

## 🎯 Current Features

### ✅ Implemented
- **Navigation System**: Tab-based navigation between Upload and Gallery views
- **Dark Theme**: Red and black color scheme throughout
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Upload Interface**: Drag-and-drop area with visual feedback
- **Gallery View**: Grid layout ready for image display
- **Empty States**: Clear placeholders for future functionality

### 🚧 In Progress
- File upload functionality (drag & drop, file validation)
- Image processing and stitching integration
- Gallery image display and management

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
- Responsive image grid layout
- Filter and sort controls
- Image metadata display
- Lightbox viewer for full-screen viewing

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
4. **API Integration**: Ready for backend integration with Python API

## 🔮 Future Enhancements

- Real-time upload progress
- Image preview before upload
- Batch image processing
- Advanced gallery filters
- Export functionality
- Offline support
- Keyboard shortcuts
- Image annotation tools

## 🤝 Contributing

1. Follow the existing code style and component structure
2. Use TypeScript for type safety
3. Maintain the red/black theme consistency
4. Test responsive design on multiple screen sizes
5. Add proper error handling and loading states

## 📄 License

This project is part of the DroneBasedDevelopment repository.
