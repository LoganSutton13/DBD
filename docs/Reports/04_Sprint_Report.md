# Sprint 4 Report (Dates from Jan 15 to Feb 16, 2026)
## YouTube link of Sprint 4 Video https://www.youtube.com/watch?v=bDVNzX5XTXw&feature=youtu.be
## What's New (User Facing)
* Path planning integrated into the application with boundary file upload and path preview in the Upload view
* Path preview with Start and End markers for robot navigation tracks
* Configurable path parameters: heading, grid size, boundary file, robot width, and coverage width
* Path generation API: upload shapefile components, adjust heading/parameters, and regenerate until satisfied
* Prescription module now outputs ESRI Shapefile instead of GeoJSON for compatibility with pathfinding and GIS tools
* Automatic field resolution option in prescription workflow
* Improved Upload button label consistency across Navigation and Sidebar
* Meeting minutes (MoM) documentation added for Jan–Feb 2026

## Work Summary (Developer Facing)
This sprint focused on integrating path planning with the frontend and refining the prescription pipeline. We implemented a PathGenerator class that produces boustrophedon paths from shapefiles using Fields2Cover, with configurable heading, robot width, and coverage width. The path planning module was wired to a new pathing API that accepts shapefile uploads, runs path generation in the background, and returns waypoints for preview. The frontend UploadView was enhanced with boundary file handling, path preview (including Start/End markers), and support for robot and coverage width parameters. Empty input handling for heading, grid size, and boundary was refactored for robustness. The prescription module was rewritten to cluster on bucketed points rather than unsupervised ML, and output was switched from GeoJSON to ESRI Shapefile. We cleaned up and documented the prescription module, updated identifiers per R style guide, and added an automatic field resolution option. We reverted some fieldShapeModified changes for simplification. Backend path generation tests and test track data were added. FastAPI server startup in package.json was updated to use virtual environment paths. The Turf.js @turf/area dependency was added for frontend area calculations. Requirements were updated with clearer Fields2Cover installation instructions. Meeting minutes for the sprint period were added under docs/Mom.

## Unfinished Work
Field maps view still requires full backend integration to fetch real processed field maps. NDVI analysis API endpoints are not yet exposed for frontend consumption. Pesticide prescription generation remains partially integrated (shapefile output and prescription logic improved; full end-to-end API integration pending). Database persistence for tasks and results is still pending. Settings button functionality on the UI is not yet implemented. Some open GitHub issues (e.g., image upload counts, processing UI, GET route for processed files) remain.

## Completed Issues/User Stories
Here are links to the issues/PRs that we completed in this sprint:
* [Merge PR #35 – feat/add-path-finding-functionality](https://github.com/LoganSutton13/DBD/pull/35) – PathGenerator class, boustrophedon path generation from shapefiles, Fields2Cover integration, path generation tests
* [Merge PR #36 – feat/integrate-path-with-UI-and-api](https://github.com/LoganSutton13/DBD/pull/36) – Path generation in app, pathing API, UploadView boundary handling and path preview, robot/coverage width, Start/End markers
* Path planning frontend integration – Path preview and boundary file handling in UploadView
* Pathing API – Shapefile upload, heading/robot/coverage width, preview-only path jobs
* Prescription module – Shapefile output, bucketed-point clustering, automatic field resolution, cleanup and documentation
* R style guide and fieldShapeModified simplification
* Meeting minutes (MoM) for Sprint 4 period

## Open Issues/User Stories
Here are the current open issues that need to be addressed:
* [Test FIELDimageR](https://github.com/LoganSutton13/DBD/issues/9)
* [Test DINOv2 proof-of-concept](https://github.com/LoganSutton13/DBD/issues/8)
* [Fix image total upload counts, does not make sense in context of jobs](https://github.com/LoganSutton13/DBD/issues/7)
* [Currently Processing UI sometimes does not show current processing task](https://github.com/LoganSutton13/DBD/issues/6)
* [Add GET route for retrieving processed files in backend](https://github.com/LoganSutton13/DBD/issues/5) – Partially completed, needs field maps integration
* [Add functionality to settings button on UI](https://github.com/LoganSutton13/DBD/issues/2)
* [Develop backend routes and field map stitching](https://github.com/LoganSutton13/DBD/issues/1) – Partially completed, needs full integration
* NDVI analysis API endpoints for frontend
* Full pesticide prescription backend integration (end-to-end)
* Database integration for task and result persistence

## Code Files for Review
Please review the following code files, which were actively developed during this sprint, for quality:
* [path_generator.py](https://github.com/LoganSutton13/DBD/tree/main/code/backend/app/services/path_planning_module/path_generator.py) – PathGenerator class for boustrophedon path from shapefiles, Fields2Cover, FarmNG track conversion
* [pathing.py](https://github.com/LoganSutton13/DBD/tree/main/code/backend/app/api/v1/pathing.py) – Pathing API for shapefile upload and path preview
* [UploadView.tsx](https://github.com/LoganSutton13/DBD/tree/main/code/frontend/src/components/UploadView.tsx) – Boundary file handling, path preview, Start/End markers, robot/coverage width, empty input handling
* [prescription_module.R](https://github.com/LoganSutton13/DBD/tree/main/code/backend/app/services/field_map_generator/prescription_module.R) – Prescription map generation with shapefile output and bucketed-point clustering
* [fieldShapeModified.R](https://github.com/LoganSutton13/DBD/tree/main/code/backend/app/services/field_map_generator/fieldShapeModified.R) – Field shape processing (simplified)
* [test_path_generator.py](https://github.com/LoganSutton13/DBD/tree/main/code/backend/tests/test_path_generator.py) – Path generation tests
* [main.py](https://github.com/LoganSutton13/DBD/tree/main/code/backend/app/main.py) – Pathing router integration
* [Sidebar/Navigation components](https://github.com/LoganSutton13/DBD/tree/main/code/frontend/src/components/) – Upload button label consistency and sticky behavior

## Retrospective Summary
Here's what went well:
* Successfully integrated path planning with the frontend: boundary upload, path preview, and configurable parameters
* PathGenerator and pathing API provide a clear path from shapefile to FarmNG track with minimal friction
* Prescription module output aligned with pathfinding and GIS (shapefile) and logic simplified (bucketed-point clustering)
* Meeting minutes (MoM) added for better project documentation
* Backend path generation tests improve confidence in path logic

Here's what we'd like to improve:
* Expose NDVI analysis via API for frontend use
* Complete field maps backend integration
* Add end-to-end prescription API from orthophoto to prescription map
* Implement settings button functionality
* Address open issues (upload counts, processing UI, GET route enhancements)
* Add database persistence for tasks and results

Here are changes we plan to implement in the next sprint(s):
* NDVI analysis API endpoints and frontend integration
* Field maps backend integration with real processed data
* Full pesticide prescription backend integration
* Settings UI and configuration
* Database integration for tasks and results
* Resolve remaining open GitHub issues
* Enhanced error handling and testing for path and prescription workflows
