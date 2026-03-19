# Sprint 5 Report (Dates from Feb 17 to Mar 17, 2026)
## YouTube link of Sprint 5 Video TBD

## What's New (User Facing)
* **End-to-end “pathing → preview” workflow**: Users can upload a field boundary shapefile, configure robot + coverage parameters, and preview a generated navigation path directly in the UI.
* **Configurable boustrophedon (snake-pattern) paths** via Fields2Cover: Generate coverage-style paths from boundary shapefiles, including **headlands** and **path width** configuration.
* **Amiga-ready waypoint output**: Generated paths are converted into Farm-ng/Amiga-compatible waypoint data and stored as JSON for downstream robot use.
* **Prescription module closer to production**: Prescription clustering output is converted into **polygons** (not just points), with metadata suitable for robot interpretation.
* **Farmer-specified boundaries for prescriptions**: Prescription generation now uses a **user-provided boundary shapefile** as the field boundary.
* **More reliable development & QA**:
  * **Backend CI workflow** for automated testing
  * Expanded **unit test coverage** (88 tests as of Sprint 5 presentation)
* **Dockerized application**: Dockerfile setup added so the system can be built/run more consistently across environments.

## Work Summary (Developer Facing)
Sprint 5 focused on linking together the core “robot can traverse + robot can spray” pipeline and improving quality and deployability. On the pathing side, we implemented and refined a Fields2Cover-based path generator that produces boustrophedon (snake-pattern) coverage paths from a field boundary shapefile, with support for configurable swath/path widths and headlands. The generated path is converted into Farm-ng/Amiga waypoint format and stored in JSON so it can be used downstream by the robot, and the frontend now supports visualizing and previewing these paths.

On the prescription side, we improved clustering output by converting equivalent clusters into polygons and treating the field boundary as a farmer-specified shapefile. We also progressed prescription integration into the Python backend by enabling the R script to be invoked with command-line parameters (callable directly) and by wiring the backend to call the module through `subprocess.run`. In addition, we added/expanded backend endpoints for prescription workflows and strengthened testability by establishing CI for automated tests and expanding unit test coverage across endpoints and services (using mocks for I/O-heavy services like file storage).

Finally, we improved deployability by dockerizing the application and documenting/reporting the new modules and test posture as part of the sprint deliverables.

## Unfinished Work
* **Full end-to-end integration testing** across upload → processing → prescription → pathing → robot export is still TBD.
* **Real robot/path validation** is blocked by RTK and hardware integration issues encountered during parking-lot testing.
* **Prescription “last mile”**: remaining wiring to reliably upload/transfer final artifacts to the Amiga robot and validate interpretation on-device.
* **Frontend Jest tests** are planned but not yet implemented.
* **Environment friction**:
  * WSL usage remains challenging
  * R tooling on Linux caused issues during late-stage testing

## Completed Issues/User Stories
Here are links to the issues/PRs that we completed in this sprint (representative, based on merge history):
* [Merge PR #55 – EPIC/dockerized](https://github.com/LoganSutton13/DBD/pull/55) – Dockerized application setup
* [Merge PR #52 – feat/prescription-api](https://github.com/LoganSutton13/DBD/pull/52) – Prescription endpoints and backend integration work
* [Merge PR #51 – feature/clean-field_map_generator](https://github.com/LoganSutton13/DBD/pull/51) – Field map generator cleanup/refactors supporting prescription pipeline
* [Merge PR #50 – refac/updated-endpoints](https://github.com/LoganSutton13/DBD/pull/50) – Endpoint refactors and service updates supporting pathing/prescription stability
* [Merge PR #53 – feat/add-mom-3-12-2026](https://github.com/LoganSutton13/DBD/pull/53) – Meeting minutes updates during Sprint 5 period

## Open Issues/User Stories
* Hardware integration + RTK stability for field testing
* End-to-end pipeline validation (integration tests)
* Uploading/exporting artifacts to the Amiga robot in a repeatable workflow
* Frontend test coverage (Jest)
* Remaining platform issues noted in prior reports (database persistence, deeper field map integration, etc.)

## Code Files for Review
Please review the following areas that were actively developed during this sprint, for quality:
* `code/backend/app/services/path_planning_module/` – Fields2Cover-based path generation, waypoint conversion, storage format
* `code/backend/app/api/v1/prescription.py` – Prescription endpoints and integration surface
* `code/backend/app/services/field_map_generator/` – Prescription polygon generation + boundary handling
* `code/backend/tests/` – Expanded unit tests (endpoints + services; mocks for I/O)
* Dockerization artifacts (Dockerfile / related configuration)

## Retrospective Summary
Here's what went well:
* Pathing is now integrated and previewable end-to-end in the UI using Fields2Cover
* Prescription module is close to fully integrated, with polygon output and backend invocation via subprocess
* Substantial unit test coverage added and automated via CI
* Dockerization improves consistency and reduces “works on my machine” drift

Here's what we'd like to improve:
* Earlier and more frequent full-system integration tests (not just unit tests)
* Better cross-platform (WSL/Linux) reliability for R tooling and developer setup
* Earlier hardware/RTK validation cycles to reduce last-week bottlenecks

Here are changes we plan to implement in the next sprint(s):
* Full end-to-end testing and validation on real hardware (pathing + prescription interpretation on the robot)
* Additional unit + integration tests (including frontend Jest tests)
* Reliable artifact export/upload to the Amiga robot
* Address remaining deployment + environment friction and finalize production workflow

