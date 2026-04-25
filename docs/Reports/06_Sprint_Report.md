# Sprint 6 Report (Mar 18 to Apr 24, 2026)

## YouTube link of Sprint 6 Video

https://www.youtube.com/watch?v=o_ejTUXjGl4

## What's New (User Facing)

* **Upload flow rework**: Multi-step upload wizard on the **Upload** tab with clearer steps, boundary shapefile handling aligned with processing tasks, and **per-file upload progress** (chunked uploads report bytes sent via XHR progress events).
* **System-wide settings**: Modal and API for **NodeODM defaults** (heading, grid size, robot width, coverage width) and **prescription defaults** (cell size, cluster count, smoothing, NDVI threshold, spray rates in GPA), including scoped resets (prescription-only or NodeODM-only).
* **Prescriptions tab (full product path)**: Lists prescription-backed tasks from the backend, opens **live GeoJSON** maps (Leaflet), supports **spray-level edits** with save, **GPA-based spray rates** on features, **config/threshold** editing, and **regenerate** with optional parameter overrides.
* **Field Maps tab**: No longer mock-driven—loads **completed prescriptions** from the API, shows NDVI-oriented popups, optional **OpenStreetMap** basemap when online (blank map offline), **path preview/regenerate from task** with RTK base overrides, **save path to task**, **GeoJSON export**, **delete task results** (typed confirmation), and **robot files ZIP** download.
* **Robot export bundle**: `GET /api/v1/results/{task_id}/robot-files.zip` packages available **`robot_path.json`**, **`prescription.geojson`**, and **`prescription_config.json`**; the UI surfaces included vs missing files via response headers.
* **Task cleanup**: **Delete processed results** for a task (results directory) from the Field Maps detail flow; backend helper to remove **temporary drone imagery** staging trees where applicable.
* **Pathing from existing tasks**: Generate preview paths from a task’s stored boundary without re-uploading standalone shapefiles (`from-task` style workflow); results API exposes **`/robot-path`** and **`/display-path`** for raw vs map-friendly coordinates.
* **Docker / distribution hardening**: **`package-lock.json`** tracked for reproducible **`npm ci`** in image builds; GitHub Actions **publish** workflow gated to **`main`** and **`v*`** tags; **`docker-compose.ghcr.yml`** and **`install-dbd-ghcr.sh`** for thin installs from **GHCR**; install script and compose comments refined for farmers/offline use.
* **Developer experience**: **NodeODM API enumeration** support in tooling/docs direction; **numeric input validation** fixes across settings and forms; obsolete Docker requirement docs removed; **April 16, 2026** meeting minutes added under `docs/Mom/`.

## Work Summary (Developer Facing)

Sprint 6 completed the product-facing integration that Sprint 5 had left as “last mile”: prescriptions and field maps now consume the same **prescription list/detail/status/config/generate** API surface, with the R-backed pipeline producing GeoJSON that includes **CRS handling** improvements and **GPA fields** propagated through config updates. The frontend normalized **GeoJSON feature identifiers** for stable cluster-based updates.

The **upload pipeline** was refactored to **chunked init/chunk/finalize** end-to-end in the UI, with the backend already aligned to that contract; progress reporting and validation hardening closed a major usability gap for large flights.

**Results and pathing** gained **display coordinates** for Leaflet, **robot-path** JSON for downstream tools, **ZIP export** for field operations, and **DELETE** for results lifecycle management. Path jobs can be started **from an existing task**, reusing uploaded boundary artifacts.

**Container publishing** moved toward production practice: reproducible frontend installs, GHCR-oriented compose, and CI gating so pre-built images track **`main`** and release tags predictably.

## Unfinished Work

* **Standalone NDVI REST API**: NDVI remains embedded in the **prescription / FIELDimageR** workflow; there is still no dedicated “run NDVI only” HTTP API separate from prescription generation.
* **NodeODM task deletion / upload listing**: `DELETE /api/v1/upload/{task_id}` and `GET /api/v1/upload/` remain **501 Not Implemented** (results deletion is implemented separately under **`/api/v1/results`**).
* **Database persistence** for tasks and metadata (still file- and manifest-based).
* **Authentication / multi-tenant** security (not started).
* **Frontend Jest coverage** beyond CRA defaults (still thin compared to backend **`pytest`** suite).
* **End-to-end hardware validation** on farm/robot (RTK, Amiga) remains environment-dependent.

## Completed Issues / User Stories (Representative)

Merge history after Sprint 5 material (`feat/add-sprint-material` / PR #56) through end of sprint; primary integration PRs:

* [Merge PR #60 – feat/UI-upload-flow-rework](https://github.com/LoganSutton13/DBD/pull/60) – Chunked upload UX, results display path, path-from-task, upload settings API/UI
* [Merge PR #59 – feat/prescription-frontend-fixes](https://github.com/LoganSutton13/DBD/pull/59) – Prescription GeoJSON ID normalization and cluster-based updates
* [Merge PR #64 – feat/add-gpa-data](https://github.com/LoganSutton13/DBD/pull/64) – Prescription config/status/generate endpoints and GPA propagation
* [Merge PR #77 – feat/expose-prescription-settings](https://github.com/LoganSutton13/DBD/pull/77) – Upload settings modal and API for prescription module parameters
* [Merge PR #78 – feat/add-prescription-regeneration](https://github.com/LoganSutton13/DBD/pull/78) – Regenerate endpoint and frontend flow
* [Merge PR #79 – feat/add-ability-to-delete-tasks-and-cleanup](https://github.com/LoganSutton13/DBD/pull/79) – Delete results, temp imagery cleanup, tests
* [Merge PR #80 – feat/make-app-installable](https://github.com/LoganSutton13/DBD/pull/80) – Docker Compose–centric install path and README updates
* [Merge PR #81 – feat/ghcr-setup](https://github.com/LoganSutton13/DBD/pull/81) – GHCR image build/publish scaffolding  
* [Merge PR #82 – feat/enumerate-nodeodm-api](https://github.com/LoganSutton13/DBD/pull/82) – NodeODM API enumeration support  
* [Merge PR #83 – feat/fix-ghcr-cd](https://github.com/LoganSutton13/DBD/pull/83) – Publish workflow fixes (gate to `main` / `v*`)  
* [Merge PR #84 – feat/add-new-install-script](https://github.com/LoganSutton13/DBD/pull/84) – `docker-compose.ghcr.yml`, `install-dbd-ghcr.sh`, compose refinements
* [Merge PR #88 – bugfix/fix-numeric-field-input](https://github.com/LoganSutton13/DBD/pull/88) – Input validation across components
* [Merge PR #89 – fix/add-upload-progress-bar](https://github.com/LoganSutton13/DBD/pull/89) – XHR upload progress; removed obsolete frontend `README` / integration markdown
* [Merge PR #90 – feat/add-download-spot-for-robot-files](https://github.com/LoganSutton13/DBD/pull/90) – Robot files ZIP endpoint and UI
* [Merge PR #91 – feat/add-meeting-minutes](https://github.com/LoganSutton13/DBD/pull/91) – MoM Apr 16, 2026

## Open Issues / User Stories

* Carry forward from prior reports where still applicable: GitHub issues on upload counts, processing UI edge cases, settings-button scope, DINOv2/FIELDimageR test tickets—**re-triage** after UI merge (some may be obsolete).
* Database layer and auth for any multi-user deployment.
* Broader integration and E2E tests (Playwright/Cypress or scripted API chains).

## Code Files for Review

* `code/frontend/src/components/UploadView.tsx` – Wizard, chunked upload, boundary and path preview
* `code/frontend/src/components/UploadSettingsModal.tsx` – NodeODM + prescription settings
* `code/frontend/src/components/PesticidePrescriptionsView.tsx` – Prescription list/detail/regenerate/GPA/download
* `code/frontend/src/components/FieldMapsView.tsx` – Maps, path-from-task, delete results, robot ZIP
* `code/frontend/src/services/api.ts` – Chunked upload with progress; prescription and results clients
* `code/backend/app/api/v1/upload.py` – Init/chunk/finalize/settings/boundary
* `code/backend/app/api/v1/prescription.py` – List, get, put, config, status, generate
* `code/backend/app/api/v1/results.py` – List, assets, robot-path, display-path, robot ZIP, delete
* `code/backend/app/api/v1/pathing.py` – Path jobs, RTK base, from-task endpoints
* `code/backend/app/handlers/results.py` – ZIP assembly, display path fallback logic
* `docker-compose.yml`, `docker-compose.ghcr.yml`, `scripts/install-dbd.sh`, `scripts/install-dbd-ghcr.sh`
* `.github/workflows/publish-docker.yml`, `.github/workflows/backend-tests.yml`

## Retrospective Summary

**What went well**

* Prescription and field-map tabs finally reflect **real backend state**, which makes demos and field handoff credible.
* **Chunked uploads + progress** materially improved reliability for large datasets.
* **Robot ZIP** and **delete results** round out an operational story (export + cleanup).
* **Docker + GHCR** documentation supports both source-based and image-based installs.

**What we'd like to improve**

* More **automated E2E** tests covering upload → NodeODM → prescription → path → export.
* **Clearer issue hygiene** after large UI merges (close or rewrite stale tickets).
* Optional: align **`env.example`** with production defaults reviewers expect (ports, `RESULTS_DIR`).

**Next steps (post–Sprint 6 / maintenance)**

* Hardening pass on open GitHub issues and any remaining **501** upload routes if product needs them.
* NDVI-as-a-service API only if stakeholders require it outside prescriptions.
* Persistence and auth if the system moves beyond single-operator installs.
