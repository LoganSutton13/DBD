# Sprint 1 Report (Dates from Sprint 1 to Sprint 1)
## YouTube link of Sprint 1 Video (Make this video unlisted)
## What's New (User Facing)
* Complete drone imagery upload system with drag-and-drop interface
* Real-time processing queue monitoring with automatic status polling
* Interactive gallery view for processed drone imagery with filtering and sorting
* Field maps visualization with grid/list view modes
* Pesticide prescription generation interface with robot compatibility indicators
* Backend API integration with NodeODM for image stitching and processing
* Configurable processing parameters (grid size, boom size, heading size)
* File upload progress tracking and error handling
* Backend connection status monitoring and testing

## Work Summary (Developer Facing)
This sprint focused on establishing the core foundation of our drone imagery processing application. We successfully implemented a full-stack solution with a React frontend and FastAPI backend, integrating with NodeODM for actual image processing capabilities. The team overcame significant technical challenges in setting up the NodeODM integration, implementing real-time status polling, and creating a responsive user interface. Key learnings included mastering the pyodm Python library for NodeODM communication, implementing proper error handling for file uploads, and designing a scalable component architecture for the frontend. We also established proper development workflows with TypeScript for type safety and Tailwind CSS for consistent styling.

## Unfinished Work
The pesticide prescription generation feature is currently using mock data and needs backend integration to generate actual prescription maps. The field maps view also requires backend API endpoints to fetch real processed imagery data instead of mock data. Additionally, the robot path generation functionality is planned but not yet implemented.

## Completed Issues/User Stories
Here are links to the issues that we completed in this sprint:
* [UI Development](https://github.com/LoganSutton13/DBD/pull/4)
* [Backend Begining Development](https://github.com/LoganSutton13/DBD/pull/3)

## Open Issues/User Stories
Here are the current open issues that need to be addressed:
* [Test FIELDimageR](https://github.com/LoganSutton13/DBD/issues/9)
* [Test DINOv2 proof-of-concept](https://github.com/LoganSutton13/DBD/issues/8)
* [Fix image total upload counts, does not make sense in context of jobs](https://github.com/LoganSutton13/DBD/issues/7)
* [Currently Processing UI sometimes does not show current processing task](https://github.com/LoganSutton13/DBD/issues/6)
* [Add GET route for retrieving processed files in backend](https://github.com/LoganSutton13/DBD/issues/5)
* [Add functionality to settings button on UI](https://github.com/LoganSutton13/DBD/issues/2)
* [Develop backend routes and field map stitching](https://github.com/LoganSutton13/DBD/issues/1)

## Code Files for Review
Please review the following code files, which were actively developed during this sprint, for quality:
* [UploadView.tsx](https://github.com/LoganSutton13/DBD/tree/main/code/frontend/src/components/UploadView.tsx) - Main file upload component with drag-and-drop functionality
* [ProcessingView.tsx](https://github.com/LoganSutton13/DBD/tree/main/code/frontend/src/components/ProcessingView.tsx) - Real-time processing queue monitoring
* [upload.py](https://github.com/LoganSutton13/DBD/tree/main/code/backend/app/api/v1/upload.py) - Backend API endpoints for file upload and NodeODM integration
* [api.ts](https://github.com/LoganSutton13/DBD/tree/main/code/frontend/src/services/api.ts) - Frontend API service for backend communication
* [GalleryView.tsx](https://github.com/LoganSutton13/DBD/tree/main/code/frontend/src/components/GalleryView.tsx) - Gallery component with filtering and sorting
* [FieldMapsView.tsx](https://github.com/LoganSutton13/DBD/tree/main/code/frontend/src/components/FieldMapsView.tsx) - Field maps visualization component

## Retrospective Summary
Here's what went well:
* Successfully integrated NodeODM with our FastAPI backend using the pyodm library
* Implemented comprehensive error handling and user feedback throughout the application
* Created a responsive and intuitive user interface with proper loading states
* Established proper TypeScript types and interfaces for better code maintainability
* Implemented real-time status polling for processing tasks
* Created modular component architecture that supports future feature additions

Here's what we'd like to improve:
* Need better error handling for NodeODM connection failures
* Should implement proper database format for persistence for task tracking
* Need comprehensive unit tests for both frontend and backend components
* Should implement proper logging and monitoring for production deployment

Here are changes we plan to implement in the next sprint(s):
* Implement actual pesticide prescription generation algorithms
* Add database integration for persistent task and result storage
* Create comprehensive test suite for all components
* Implement user authentication and authorization
* Add real-time notifications for processing completion
* Develop robot path generation functionality