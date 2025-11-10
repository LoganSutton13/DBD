# Sprint 2 Report (Dates from Oct 6 to Nov 6)
## YouTube link of Sprint 2 Video (to be added)
## What's New (User Facing)
* Complete results API with endpoints for retrieving processed orthophotos and PDF reports
* Gallery view now displays real processed tasks from the backend with dynamic image loading
* PDF report viewing functionality with full-screen preview and page navigation
* Task naming capability during upload for better organization and identification
* Enhanced upload interface with configurable heading and grid size parameters
* Spray map functionality in pesticide prescriptions view with color-coded spray levels
* Automatic background polling for task completion and asset downloading
* Improved error handling and user feedback throughout the application
* Task metadata storage and retrieval via manifest files
* Real-time task status updates and progress tracking

## Work Summary (Developer Facing)
This sprint focused on completing the end-to-end workflow from file upload to result viewing. We successfully implemented a comprehensive results API that enables users to retrieve and view processed orthophotos and PDF reports. The file storage service was enhanced with automatic polling for NodeODM task completion, manifest file management for metadata storage, and robust asset downloading capabilities. The frontend Gallery view was fully integrated with the backend API, replacing mock data with real processed tasks. We added PDF viewing functionality using react-pdf, allowing users to preview processing reports directly in the browser. Task naming functionality was implemented to improve user organization, and the upload interface was enhanced with additional parameters for heading and grid size configuration. The pesticide prescriptions view received spray map functionality with interactive grid-based spray level selection. Key technical achievements included implementing async polling for task completion, creating a manifest-based metadata system, and establishing a robust file storage and retrieval system. We also improved error handling across the application and enhanced the user experience with better loading states and feedback mechanisms.

## Unfinished Work
The field maps view still requires backend integration to fetch real processed imagery data instead of mock data. The pesticide prescription generation feature needs backend integration to generate actual prescription maps from processed orthophotos. Robot path generation functionality is planned but not yet implemented. The spray map functionality in pesticide prescriptions view is currently frontend-only and needs backend integration for persistence and processing. Database integration for persistent task and result storage is still pending, as the current implementation relies on file-based storage.

## Completed Issues/User Stories
Here are links to the issues that we completed in this sprint:
* [Backend Development - Results API](https://github.com/LoganSutton13/DBD/pull/23) - Added complete results API with endpoints for retrieving processed files, file storage service with polling and manifest management
* [UI Modifications](https://github.com/LoganSutton13/DBD/pull/24) - Enhanced Gallery view with backend integration, PDF viewing functionality, and UI improvements
* [Add Sliders to Frontend](https://github.com/LoganSutton13/DBD/pull/22) - Added heading and grid size configuration sliders to upload interface
* Results API Implementation - Added endpoints for retrieving processed orthophotos and PDF reports
* Gallery View Backend Integration - Integrated Gallery view with real backend API, replacing mock data
* File Storage Service Enhancement - Implemented polling for task completion, manifest management, and asset downloading
* PDF Report Viewing - Added PDF viewing functionality with react-pdf library
* Task Naming Functionality - Implemented task naming during upload for better organization
* Spray Map Functionality - Added spray map features to pesticide prescriptions view with color-coded spray levels

## Open Issues/User Stories
Here are the current open issues that need to be addressed:
* [Test FIELDimageR](https://github.com/LoganSutton13/DBD/issues/9)
* [Test DINOv2 proof-of-concept](https://github.com/LoganSutton13/DBD/issues/8)
* [Fix image total upload counts, does not make sense in context of jobs](https://github.com/LoganSutton13/DBD/issues/7)
* [Currently Processing UI sometimes does not show current processing task](https://github.com/LoganSutton13/DBD/issues/6)
* [Add GET route for retrieving processed files in backend](https://github.com/LoganSutton13/DBD/issues/5) - Partially completed, needs enhancement
* [Add functionality to settings button on UI](https://github.com/LoganSutton13/DBD/issues/2)
* [Develop backend routes and field map stitching](https://github.com/LoganSutton13/DBD/issues/1) - Partially completed, needs field maps integration

## Code Files for Review
Please review the following code files, which were actively developed during this sprint, for quality:
* [results.py](https://github.com/LoganSutton13/DBD/tree/main/code/backend/app/api/v1/results.py) - Results API endpoints for retrieving processed files
* [file_storage.py](https://github.com/LoganSutton13/DBD/tree/main/code/backend/app/services/file_storage.py) - File storage service with polling and manifest management
* [upload.py](https://github.com/LoganSutton13/DBD/tree/main/code/backend/app/api/v1/upload.py) - Enhanced upload API with task naming and background polling
* [GalleryView.tsx](https://github.com/LoganSutton13/DBD/tree/main/code/frontend/src/components/GalleryView.tsx) - Gallery component with backend integration and PDF viewing
* [api.ts](https://github.com/LoganSutton13/DBD/tree/main/code/frontend/src/services/api.ts) - Enhanced API service with results endpoints
* [PesticidePrescriptionsView.tsx](https://github.com/LoganSutton13/DBD/tree/main/code/frontend/src/components/PesticidePrescriptionsView.tsx) - Pesticide prescriptions view with spray map functionality
* [UploadView.tsx](https://github.com/LoganSutton13/DBD/tree/main/code/frontend/src/components/UploadView.tsx) - Enhanced upload view with task naming and parameter configuration
* [main.py](https://github.com/LoganSutton13/DBD/tree/main/code/backend/app/main.py) - Main application with results router integration

## Retrospective Summary
Here's what went well:
* Successfully implemented complete results API with robust file storage and retrieval
* Integrated Gallery view with real backend data, replacing all mock data
* Implemented automatic background polling for task completion, improving user experience
* Added PDF viewing functionality with react-pdf, enhancing report accessibility
* Created manifest-based metadata system for better task organization
* Enhanced upload functionality with task naming and additional parameters
* Improved error handling and user feedback throughout the application
* Established a scalable file storage architecture for future enhancements

Here's what we'd like to improve:
* Should add comprehensive unit tests for the new results API and file storage service
* Need to implement field maps backend integration to replace mock data
* Should add pesticide prescription backend integration for actual map generation
* Need to improve error handling for file download failures and network issues
* Need to add task deletion functionality for managing stored results
* Should implement pagination for results listing when dealing with large numbers of tasks

Here are changes we plan to implement in the next sprint(s):
* Add field maps backend integration to replace mock data in FieldMapsView
* Implement pesticide prescription backend integration for actual map generation
* Create comprehensive test suite for results API and file storage service
* Add task deletion and management functionality
* Implement pagination for results listing
* Add caching mechanisms for improved performance
* Develop robot path generation functionality
* Implement user authentication and authorization
* Add real-time notifications for processing completion
* Enhance error handling and recovery mechanisms
* Implement task scheduling and queue management
