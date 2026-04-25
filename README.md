# DroneBasedDevelopment

## Project summary

### One-sentence description

A full-stack web application that ingests drone imagery, runs **OpenDroneMap / NodeODM** orthomosaic jobs, and serves **gallery**, **NDVI-driven prescription maps**, and **robot path planning** (Fields2Cover + farm-ng style outputs) through a React UI and a FastAPI backend.

### Additional information about the project

**DroneBasedDevelopment** is a drone imagery processing platform aimed at **agricultural** use cases. A **React** frontend (TypeScript, Tailwind, Leaflet) talks to a **FastAPI** backend that stages uploads, forwards jobs to **NodeODM**, polls for completion, downloads orthophotos and reports, and orchestrates **prescription generation** (R / FIELDimageR-style workflow invoked from Python) plus **path preview** and **robot-oriented exports**.

Typical flow: name a field and optionally attach a **boundary shapefile**, queue **RGB or multispectral** imagery (with optional GNSS sidecars such as `.nav` / `.obs` / `.bin` / `.mrk`), upload in **chunks** with **per-file progress**, monitor processing on the **Upload** tab, then use **View Gallery** for orthophotos and PDFs, **Prescriptions** for spray maps and regeneration, and **Field Maps** for map-centric path editing, **GeoJSON export**, **robot file ZIP** download, and **deleting stored results** for a task when you need to reclaim space.

The project ships a **Docker Compose** stack (NodeODM + API + nginx-hosted UI) so installs are repeatable on a lab or farm PC, plus an optional **GitHub Container Registry (GHCR)** path for teams that want pre-built images without cloning source.

## Installation

### Prerequisites

- **Node.js** 16 or newer (the frontend pins `@types/node` 16.x; LTS 18 or 20 is fine)
- **Python 3.8+** for the FastAPI backend
- **NodeODM** — Docker image `opendronemap/nodeodm:stable` (recommended) or any reachable NodeODM instance compatible with **PyODM**
- **Git** — to clone this repository (not required for the Docker-only “application package” install if you use the compose bundle without source)
- **Poetry** (recommended) or **pip** with `requirements.txt` for Python dependencies
- **Docker Engine** and **Docker Compose v2** — for the full-stack container workflow (e.g. Docker Desktop on Windows or macOS)

### Add-ons and major dependencies

**Backend** (exact pins in `code/backend/requirements.txt`; geospatial stack is heavy — use Docker or `pip install -r requirements.txt` after Poetry):

| Area | Packages / tools |
|------|------------------|
| Web stack | **FastAPI**, **Uvicorn**, **Pydantic Settings**, **python-multipart**, **httpx**, **aiofiles** |
| NodeODM | **PyODM** |
| Rasters & GIS | **rasterio**, **rioxarray**, **xarray**, **geopandas**, **shapely**, **rasterstats**, **pyproj** |
| Analysis | **numpy** (pinned below 2.x), **pandas**, **matplotlib**, **scikit-learn** |
| Robot / path | **farm-ng-amiga**, **protobuf**; **Fields2Cover** is wired via the Docker build (not a simple `pip` one-liner on all hosts) |
| Testing | **pytest**, **pytest-asyncio** |

**Frontend** (`code/frontend/package.json`):

| Area | Packages |
|------|----------|
| UI | **React 18**, **TypeScript**, **Tailwind CSS**, **react-scripts** |
| Uploads | **react-dropzone** |
| Maps & geometry | **Leaflet**, **react-leaflet**, **@turf/area** |
| Reports | **react-pdf**, **pdfjs-dist** |

> **Poetry vs pip:** `code/backend/pyproject.toml` carries a **minimal** Poetry set suitable for lightweight development. For prescription, NDVI, and path-generation code paths, install **`requirements.txt`** (or run the **backend Dockerfile**) so rasterio, farm-ng, and related libraries match production.

### Installation steps

#### 1. Clone the repository

```bash
git clone <repository-url>
cd DBD
```

#### 2. Backend setup (Python / FastAPI)

**Option A — Poetry (recommended), then full requirements**

```bash
cd code/backend
poetry install
pip install -r requirements.txt
cp env.example .env
# Edit .env: PORT=8001, NODEODM_URL, UPLOAD_DIR, RESULTS_DIR, ALLOWED_ORIGINS (include http://localhost:8000 if you override the list)
poetry run python run.py
```

**Option B — pip only**

```bash
cd code/backend
python -m venv venv
# Windows:
#   venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate
pip install -r requirements.txt
cp env.example .env
python run.py
```

The backend defaults to **port 8001** in `app/core/config.py`. The bundled `env.example` uses **`PORT=8001`** so it matches the frontend’s default `REACT_APP_API_BASE_URL=http://localhost:8001`.

#### 3. Frontend setup (React)

```bash
cd code/frontend
npm install
npm start
```

`npm start` binds **port 8000** (`PORT=8000` in `package.json`). Set **`REACT_APP_API_BASE_URL`** if the API is not on `http://localhost:8001`. With **`DEBUG=True`**, the backend uses permissive CORS; if you turn **`DEBUG=False`**, ensure **`ALLOWED_ORIGINS`** lists every origin your browser uses (including `http://localhost:8000`).

#### 4. NodeODM

```bash
docker run -p 3000:3000 opendronemap/nodeodm:stable
```

Point **`NODEODM_URL`** / **`NODEODM_HOST`** and **`NODEODM_PORT`** in `.env` at that service.

#### 5. Docker Compose (full stack — farmer / offline-capable)

You **do not need Git** for every deployment if you ship an **application package** (ZIP or USB) that contains **`docker-compose.yml`**, **`code/`**, and **`scripts/`** at the top level of one folder.

1. Install **Docker Engine** and **Docker Compose v2** on the target machine.
2. Open a terminal in the folder that contains `docker-compose.yml`.
3. Run:

```bash
./scripts/install-dbd.sh
# same as:
# docker compose up -d --build
```

This starts **NodeODM**, the **FastAPI** backend, and a **production build of the UI** (nginx). Data persists in the named volume **`dbd_app_data`** (see comments in `docker-compose.yml` for backup examples using `docker run … tar`).

**URLs when Docker runs on the same machine as the browser**

| Service | URL |
|---------|-----|
| Web app | http://localhost:8000 |
| API / OpenAPI | http://localhost:8001/docs |
| NodeODM (optional debugging) | http://localhost:3000 |

**Working offline:** pull or build images while online, then use [`docker save`](https://docs.docker.com/reference/cli/docker/image/save/) and transfer the tarball (e.g. USB). On the air-gapped host, [`docker load`](https://docs.docker.com/reference/cli/docker/image/load/) then `./scripts/install-dbd.sh` (use `docker compose up -d` without `--build` if you are not rebuilding).

**Access from another device on the LAN:** the default frontend image is built with **`REACT_APP_API_BASE_URL=http://localhost:8001`**, which only works when the **browser runs on the same host as Docker**. For a phone or second PC, set `REACT_APP_API_BASE_URL` under `frontend.build.args` in `docker-compose.yml` to `http://<this-machine-LAN-IP>:8001`, then `docker compose up -d --build frontend`.

**Publishing pre-built images (maintainers):** [`.github/workflows/publish-docker.yml`](.github/workflows/publish-docker.yml) builds and pushes **`dbd-backend`** and **`dbd-frontend`** to [**GitHub Container Registry**](https://docs.github.com/packages/working-with-a-github-packages-registry/working-with-the-container-registry) (`ghcr.io`). Names follow `ghcr.io/<github-owner-lowercase>/dbd-backend` and `ghcr.io/<github-owner-lowercase>/dbd-frontend`. Pushes to **`main`** tag **`latest`** (and **`main`**); Git tags like **`v1.2.3`** tag **`1.2.3`** and **`latest`**. After the first successful run, set package visibility to **Public** on GitHub if you want unauthenticated **`docker pull`**.

**Thin GHCR install (no `code/` checkout):** use **`docker-compose.ghcr.yml`** and **`./scripts/install-dbd-ghcr.sh`** (defaults often point at `ghcr.io/logansutton13/...:main`; adjust owner and tag as needed). The same **LAN / localhost API URL** caveats apply as above.

#### 6. Access the application (native dev, steps 2–4)

| Service | URL |
|---------|-----|
| Frontend (CRA) | http://localhost:8000 |
| Backend API | http://localhost:8001 |
| Swagger UI | http://localhost:8001/docs |
| ReDoc | http://localhost:8001/redoc |
| NodeODM | http://localhost:3000 |

---

## Application structure (UI)

The SPA exposes **four** primary areas from the sidebar:

| Tab | Purpose |
|-----|---------|
| **Upload** | Multi-step wizard: field name, optional boundary shapefile, imagery queue, **chunked upload with per-file progress**, NodeODM finalize, embedded **processing queue** (`UploadQueueBoard` + polling), optional **path preview** and **save path to task** |
| **View Gallery** | Lists processed tasks with orthophoto thumbnails; lightbox for images and in-browser **PDF** viewing |
| **Field Maps** | Tasks with **prescription GeoJSON** from the API; Leaflet map (optional **OpenStreetMap** when online), NDVI-oriented popups, **path-from-task**, save path, GeoJSON download, **delete task results**, **robot ZIP** |
| **Prescriptions** | List and detail from the same prescription API: **spray levels**, **GPA** thresholds, **config** edit, **regenerate** |

> **`ProcessingView.tsx`** still exists under `code/frontend/src/components/` but is **not** mounted in `App.tsx`. Live NodeODM status for recent uploads is handled on the **Upload** tab via **`useProcessingQueue`** and **`UploadQueueBoard`**.

---

## Core functionality

### 1. Image upload and management

- **Drag-and-drop** and file picker, with a **wizard** that separates naming, boundary upload, imagery queue, and finalize.
- **Chunked uploads** (`init` → `chunk` → `finalize`) with a default **5 MiB** chunk size; **XHR upload progress** per file.
- Supported imagery types are driven by backend MIME and extension rules (e.g. **JPEG**, **PNG**, **TIFF**); **100 MB** default per-file cap (`MAX_FILE_SIZE`).
- Optional **auxiliary** GNSS / sensor files: **`.nav`**, **`.obs`**, **`.bin`**, **`.mrk`** (see `ALLOWED_AUXILIARY_EXTENSIONS` in `app/core/config.py`).
- **System-wide defaults** via **`GET/PUT /api/v1/upload/settings`** (NodeODM heading/grid size, robot and coverage width, prescription parameters) and scoped **reset** endpoints.

### 2. Automated image processing (NodeODM)

- Jobs are submitted to **NodeODM** after finalize; options such as **heading** and **grid size** flow from upload init and settings.
- The backend **polls** NodeODM and **downloads** orthophoto and report assets into per-task folders under **`results/`**.
- Large batches are supported in principle; practical limits depend on **disk**, **NodeODM**, and **timeout** settings (`NODEODM_TIMEOUT`).

### 3. Processing monitoring

- The **Upload** tab shows an active **queue** of tasks with status and progress polling (not a separate top-level “Processing” route).
- Status comes from **`GET /api/v1/upload/{task_id}/status`** tied to the NodeODM task.

### 4. Gallery and reports

- **View Gallery** loads real task rows from **`GET /api/v1/results`**.
- **Orthophoto** PNGs and **PDF** reports open in the UI; URLs are built from the API’s summary payloads.

### 5. Field maps (backend-backed)

- **Field Maps** lists prescriptions via **`GET /api/v1/prescription`**, loads GeoJSON per task, and can overlay **saved display paths** from **`GET /api/v1/results/{task_id}/display-path`**.
- **Leaflet** map: optional basemap when online; blank background when offline tile fetch fails.
- **Path-from-task** uses pathing **`POST …/from-task`** (and aliases); **save** persists the preview to the task.
- **Export** prescription GeoJSON from the UI; **download robot ZIP** via **`GET /api/v1/results/{task_id}/robot-files.zip`** (bundles whatever exists among robot path JSON, prescription GeoJSON, and prescription config — see API response headers for included vs missing files).
- **Delete results** for a task via **`DELETE /api/v1/results/{task_id}`** (used from Field Maps with a confirmation step).

### 6. Pesticide prescriptions and spray maps

- **Prescriptions** tab: list, open detail map, edit **spray** levels per cluster/feature, save with **`PUT`**, adjust **GPA**-related config, open **regenerate** flow (**`POST …/generate`** returns **202** while the R pipeline runs).
- Backend merges **config** into stored GeoJSON where applicable (spray rates on features).

### 7. NDVI analysis and path planning (where they live today)

- **NDVI** (and related plot statistics) appear in **prescription GeoJSON** produced by the **FIELDimageR**-style R pipeline — there is **no separate public HTTP API** that only returns “NDVI rasters” independent of prescriptions.
- **Path planning** uses **Fields2Cover**-based generation in the backend (**shapefile** upload or **from-task** boundary), **Farm-ng / Amiga**-oriented track conversion, **RTK base** JSON under **`/api/v1/pathing/rtk-base`**, and persistence through **save** and results **robot-path** / **display-path** files.

### 8. Testing and CI

- **`pytest`** in `code/backend/tests/` — **116** collected test functions across routes, handlers, file storage, path generator, schemas, and legacy API tests (re-run `pytest --collect-only` after large edits).
- **[`.github/workflows/backend-tests.yml`](.github/workflows/backend-tests.yml)** runs on push and pull request.
- **[`.github/workflows/publish-docker.yml`](.github/workflows/publish-docker.yml)** publishes container images.

---

## API surface (quick reference)

For authoritative request/response shapes, use **http://localhost:8001/docs** when the backend is running. In short:

| Prefix | Role |
|--------|------|
| `/api/v1/upload` | Chunked upload, settings, boundary, status (**note:** list and delete **upload** routes return **501** today) |
| `/api/v1/results` | List tasks, orthophoto, PDF, **robot-path**, **display-path**, **robot-files.zip**, **DELETE** results |
| `/api/v1/pathing` | Path jobs (multipart shapefile or **from-task**), poll, result, **save**, RTK base |
| `/api/v1/prescription` | List, GeoJSON get/put, **config**, **status**, **generate** |

---

## Usage walkthrough

1. **Start services** — NodeODM (e.g. Docker on port 3000), backend (`python run.py` or Poetry equivalent), frontend (`npm start`), or bring up **Docker Compose** from the repo root.
2. **Upload** — Open **Upload**, enter a field name, attach a **boundary** shapefile if you need path/prescription geometry early, add images (and optional GNSS sidecars), then run through **chunked upload** and **finalize**.
3. **Monitor** — Stay on **Upload** to watch the **processing queue** until NodeODM completes; fix any reported errors (503 if NodeODM is down, validation errors, etc.).
4. **Gallery** — Open **View Gallery** to preview orthophotos and open **PDF** reports.
5. **Prescriptions** — Open **Prescriptions**, pick a task with a completed orthophoto pipeline, review the map, set **spray** levels and **GPA**-related settings, save, and **regenerate** when you change parameters.
6. **Field maps and paths** — Use **Field Maps** for map-centric workflows: preview **paths from task**, **save** when satisfied, **export GeoJSON**, or **download robot ZIP**; use **delete results** if you must remove a task’s stored output from disk.
7. **Settings** — Use the **settings** entry point in the header on **Upload** (increments `openSettingsTick`) to adjust **global defaults** for NodeODM and prescription modules.

---

## Known issues and limitations

### Operational

1. **NodeODM must be running** — Finalize and status calls assume a reachable NodeODM instance; otherwise uploads fail or stall with HTTP errors (`503` when the client cannot reach NodeODM is common).
2. **Upload router gaps** — **`DELETE /api/v1/upload/{task_id}`** and **`GET /api/v1/upload/`** return **501** (not implemented). Cleaning **finished** artifacts is done via **`DELETE /api/v1/results/{task_id}`**, not via cancelling an upload session in the API.
3. **Disk usage** — Failed or abandoned runs can leave data under **`uploads/`** and **`path_jobs/`**; operators should monitor disk; some temp cleanup helpers exist on the backend but there is no full automatic janitor for every failure mode.
4. **CORS** — If you customize **`ALLOWED_ORIGINS`**, list every dev and production browser origin explicitly (include **`http://localhost:8000`** for CRA).

### Product / architecture

5. **No database** — Task metadata lives in **manifests** and directory layout; there is no SQL layer for history or multi-tenant isolation.
6. **No built-in authentication** — Treat deployments as **trusted single-operator** unless you add a reverse proxy or VPN.
7. **Fields2Cover on bare metal** — Non-Docker Python environments may still need manual setup matching the **Dockerfile**; Compose remains the supported path for path generation.
8. **Frontend test depth** — **`npm test`** is configured, but component coverage is thin compared to backend **`pytest`**.

### Historical notes (fixed in recent sprints)

Earlier READMEs mentioned **mock** field maps or prescriptions; as of **Sprint 6**, **Field Maps** and **Prescriptions** use **live** prescription and results APIs. **Path preview** is integrated in **Upload** and **Field Maps**, not only “backend-only.”

---

## Sprint and documentation history

### Sprint highlights (condensed)

- **Sprint 1** — Drone upload UX, early processing concepts, NodeODM wiring.
- **Sprint 2** — **Results API**, gallery backed by real orthophotos and PDFs, manifests, **background polling**, task naming, richer upload parameters.
- **Sprint 3** — **NDVI / FIELDimageR** port and field analysis services, **DBSCAN** / soil masking concepts, GeoJSON and CSV export paths in backend tooling, field-map UI groundwork.
- **Sprint 4** — **Pathing API**, **PathGenerator** (Fields2Cover), **Upload** boundary + preview, prescription **shapefile** output, meeting minutes.
- **Sprint 5** — **Dockerized** stack, **RTK** endpoints, deeper **path + prescription** integration, **CI** and expanded **pytest**, farmer-supplied boundaries for prescriptions.
- **Sprint 6** — **Chunked upload + progress**, prescription/field-map **production UI**, **GPA** + **regenerate**, **robot-path** / **display-path** / **robot ZIP**, **delete results**, **GHCR** install path, validation fixes — see **[06_Sprint_Report.md](docs/Reports/06_Sprint_Report.md)**.

### Sprint reports and requirements

- [Sprint 1](docs/Reports/01_Sprint_Report.md) · [Sprint 2](docs/Reports/02_Sprint_Report.md) · [Sprint 3](docs/Reports/03_Sprint_Report.md) · [Sprint 4](docs/Reports/04_Sprint_Report.md) · [Sprint 5](docs/Reports/05_Sprint_Report.md) · [Sprint 6](docs/Reports/06_Sprint_Report.md)
- [Original requirements (PDF)](docs/Reports/DBD_Assignment1_Requirements.pdf)
- [Final report (PDF)](docs/Reports/DBD_Final_Report.pdf) — semester / capstone write-up when present in the repo
- [Meeting minutes](docs/Mom/)
- [External links](resources/Links.md)
- [Tutorials placeholder](resources/Tutorials.md)

---

## Contributing

We welcome contributions. Suggested flow:

1. **Fork** the repository on GitHub.
2. **Clone** your fork:

   ```bash
   git clone https://github.com/your-username/DBD.git
   cd DBD
   ```

3. **Branch**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Environment** — Follow **Installation** above; confirm **NodeODM** is reachable for integration-style manual tests.
5. **Implement** — Match existing TypeScript / Python style; add **`pytest`** for backend behavior you touch.
6. **Test**:

   ```bash
   cd code/backend
   pytest
   # or: poetry run pytest

   cd code/frontend
   npm test
   ```

7. **Commit and push**:

   ```bash
   git commit -am "Describe the change clearly"
   git push origin feature/your-feature-name
   ```

8. **Open a pull request** with a short rationale and any screenshots for UI changes.

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for conventions.

### Development guidelines

- **Frontend:** TypeScript, functional React components, Tailwind utility classes; prefer extending **`apiService`** in `code/frontend/src/services/api.ts` for new endpoints.
- **Backend:** PEP 8–style Python, FastAPI routers thin over **`handlers/`**, Pydantic schemas for IO; add tests under **`code/backend/tests/`**.
- **Docs:** Update this README or **`code/backend/README.md`** when you change user-visible behavior or routes.

---

## Additional documentation

- **[Backend README](code/backend/README.md)** — Endpoint cheat sheet, curl examples for chunked upload, configuration tables.
- **Live OpenAPI** — `http://localhost:8001/docs` (Swagger) and `/redoc` when the server is running.

---

## License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE).

The MIT License allows commercial use, modification, distribution, and private use. Summary: [https://choosealicense.com/licenses/mit/](https://choosealicense.com/licenses/mit/).
