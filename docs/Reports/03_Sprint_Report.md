# Sprint 3 Report (Dates from Nov 5 to Dec 5)
## YouTube link of Sprint 3 Video https://youtu.be/z24NleeB4Xw
## What's New (User Facing)
* Path planning module implementation for generating robot navigation tracks
* NDVI analysis functionality with DBSCAN clustering for field health assessment
* Field maps UI template with interactive map visualization capabilities
* Python port of FIELDimageR workflow for NDVI and NDRE computation
* GeoJSON export functionality for field maps with NDVI data
* CSV export with plot-level NDVI statistics and geographic coordinates
* Soil masking capabilities using HSV/HUE-based image processing
* Grid-based field analysis with configurable cell sizes
* Client demo and semester accomplishments presentation

## Work Summary (Developer Facing)
This sprint focused on implementing core field analysis and path planning capabilities. We successfully developed a path planning module using the farm-ng track builder framework, enabling generation of robot navigation paths with support for straight segments, turns, arcs, and AB line segments. The NDVI analysis functionality was implemented through a Python port of the FIELDimageR R workflow, incorporating DBSCAN clustering for spatial analysis of vegetation health. The field maps UI template was created to provide a foundation for displaying processed field data with interactive map visualization. Key technical achievements included implementing raster processing with rasterio and rioxarray, creating a grid-based analysis system with configurable cell sizes, developing soil masking algorithms using HSV color space, and integrating DBSCAN clustering for NDVI-based field segmentation. We also established GeoJSON and CSV export capabilities for field analysis results. The sprint culminated in a successful client demo where we presented semester accomplishments and received approval for optional online map view functionality. The team overcame challenges in raster processing, coordinate system transformations, and integrating multiple analysis components into a cohesive workflow.

## Unfinished Work
The path planning module needs full integration with the frontend UI for user interaction. The NDVI analysis backend needs API endpoints to be exposed for frontend consumption. The field maps view requires backend integration to fetch and display real processed field maps instead of mock data. The pesticide prescription generation feature still needs backend integration to generate actual prescription maps from processed orthophotos. Database integration for persistent task and result storage is still pending. The R script implementations (fieldShapeModified.R, prescription_module.R, pathfinding_module.R) need to be fully integrated with the Python backend services.

## Completed Issues/User Stories
Here are links to the issues that we completed in this sprint:
* Path Planning Module Implementation - Developed track planner with farm-ng integration for robot path generation
* NDVI Analysis with DBSCAN Clustering - Implemented Python port of FIELDimageR workflow with DBSCAN clustering
* Field Maps UI Template - Created template UI for displaying field maps with interactive visualization
* FIELDimageR Python Port - Ported R workflow to Python using rasterio, rioxarray, and geopandas
* GeoJSON Export Functionality - Added GeoJSON export for field maps with NDVI and cluster data
* CSV Export for Field Analysis - Implemented CSV export with plot-level statistics and coordinates
* Soil Masking Implementation - Added HSV/HUE-based soil masking for improved NDVI accuracy
* Grid-Based Field Analysis - Created configurable grid system for field segmentation and analysis
* Client Demo and Presentation - Successfully presented semester accomplishments to client

## Open Issues/User Stories
Here are the current open issues that need to be addressed:
* [Test FIELDimageR](https://github.com/LoganSutton13/DBD/issues/9)
* [Test DINOv2 proof-of-concept](https://github.com/LoganSutton13/DBD/issues/8)
* [Fix image total upload counts, does not make sense in context of jobs](https://github.com/LoganSutton13/DBD/issues/7)
* [Currently Processing UI sometimes does not show current processing task](https://github.com/LoganSutton13/DBD/issues/6)
* [Add GET route for retrieving processed files in backend](https://github.com/LoganSutton13/DBD/issues/5) - Partially completed, needs field maps integration
* [Add functionality to settings button on UI](https://github.com/LoganSutton13/DBD/issues/2)
* [Develop backend routes and field map stitching](https://github.com/LoganSutton13/DBD/issues/1) - Partially completed, needs full integration
* Path planning module frontend integration
* NDVI analysis API endpoints
* Field maps backend API integration
* R script integration with Python backend

## Code Files for Review
Please review the following code files, which were actively developed during this sprint, for quality:
* [track_planner.py](https://github.com/LoganSutton13/DBD/tree/main/code/backend/app/services/path_planning_module/track_planner.py) - Path planning module with farm-ng track builder integration
* [custom_track_maker.py](https://github.com/LoganSutton13/DBD/tree/main/code/backend/app/services/path_planning_module/custom_track_maker.py) - Custom track generation utilities
* [field_image_port.py](https://github.com/LoganSutton13/DBD/tree/main/code/backend/app/services/field_map_generator/field_image_port.py) - Python port of FIELDimageR workflow with NDVI analysis and DBSCAN clustering
* [r_wrapper.py](https://github.com/LoganSutton13/DBD/tree/main/code/backend/app/services/field_map_generator/r_wrapper.py) - R script integration wrapper
* [FieldMapsView.tsx](https://github.com/LoganSutton13/DBD/tree/main/code/frontend/src/components/FieldMapsView.tsx) - Field maps UI template component
* [fieldShapeModified.R](https://github.com/LoganSutton13/DBD/tree/main/code/backend/app/services/field_map_generator/fieldShapeModified.R) - R script for field shape processing
* [prescription_module.R](https://github.com/LoganSutton13/DBD/tree/main/code/backend/app/services/field_map_generator/prescription_module.R) - R script for prescription generation
* [pathfinding_module.R](https://github.com/LoganSutton13/DBD/tree/main/code/backend/app/services/field_map_generator/pathfinding_module.R) - R script for pathfinding algorithms

## Retrospective Summary
Here's what went well:
* Successfully implemented path planning module with farm-ng integration
* Created comprehensive NDVI analysis pipeline with DBSCAN clustering
* Ported FIELDimageR R workflow to Python, maintaining functionality while improving integration
* Developed field maps UI template providing foundation for visualization
* Implemented robust raster processing with proper coordinate system handling
* Established export capabilities for GeoJSON and CSV formats
* Successfully presented semester accomplishments to client
* Received client approval for optional online map view functionality

Here's what we'd like to improve:
* Need to integrate path planning module with frontend UI
* Should add API endpoints for NDVI analysis functionality
* Need to complete field maps backend integration
* Should fully integrate R scripts with Python backend services
* Need comprehensive testing for raster processing and coordinate transformations
* Should add error handling for edge cases in NDVI computation
* Need to optimize DBSCAN clustering performance for large fields
* Should implement caching for processed field maps

Here are changes we plan to implement in the next sprint(s):
* Integrate path planning module with frontend UI
* Add API endpoints for NDVI analysis and field map generation
* Complete field maps backend integration
* Fully integrate R scripts with Python backend
* Add comprehensive testing for field analysis components
* Implement caching mechanisms for processed field maps
* Add real-time field map processing status updates
* Develop prescription generation backend integration
* Enhance error handling and recovery mechanisms
* Optimize performance for large field processing
* Implement user authentication and authorization
* Add task scheduling and queue management for field analysis
