## Prescription module setup (R + Docker)

This project uses an R-based prescription module (`prescription_module.R`) located under:

- `code/backend/app/services/field_map_generator/prescription_module.R`

The backend invokes this script via `Rscript` after orthophoto processing completes to generate a `prescription.geojson` file alongside the orthophoto results.

### 1. Local R installation (Ubuntu / WSL)

1. **Install R and system dependencies**:

   ```bash
   sudo apt update
   sudo apt install -y \
     r-base \
     gdal-bin \
     libgdal-dev \
     libgeos-dev \
     libproj-dev \
     libudunits2-dev \
     libfftw3-dev \
     libcurl4-openssl-dev \
     libssl-dev \
     libxml2-dev
   ```

2. **Install required R packages** (from an R console):

   ```r
   install.packages(c(
     "FIELDimageR",
     "FIELDimageR.Extra",
     "imager",
     "optparse",
     "stars",
     "terra",
     "sf",
     "dplyr",
     "oce",
     "viridisLite"
   ))
   ```

3. **Verify `Rscript` is available**:

   ```bash
   Rscript --version
   ```

4. **Test the prescription module manually** (from the `field_map_generator` directory):

   ```bash
   cd code/backend/app/services/field_map_generator
   Rscript prescription_module.R \
     --orthophoto="../../../../../data/odm_orthophoto_updated.tif" \
     --boundary="../../../../../data/boundaries.shp" \
     --maximum_vertices=50000
   ```

   Adjust the `--orthophoto` and `--boundary` paths to point at real test data.

### 2. Backend environment configuration

The backend locates and runs the R script with:

- Binary: `Rscript` (overridable with the `PRESCRIPTION_RSCRIPT_PATH` environment variable).
- Script path: `code/backend/app/services/field_map_generator/prescription_module.R`.
- Working directory: `code/backend/app/services/field_map_generator`.

Environment variables:

- `PRESCRIPTION_RSCRIPT_PATH` (optional): full path or command name for the Rscript binary.
- `RESULTS_DIR`: root directory where NodeODM and prescription outputs are stored (configured in `app/core/config.py`).

Ensure `Rscript` is on `PATH` for the backend process or set `PRESCRIPTION_RSCRIPT_PATH` accordingly.

### 3. Docker setup notes

When containerizing the backend, you will need R and the required R packages inside the backend image.
Below is an example snippet you can adapt into your backend Dockerfile (assuming a Debian/Ubuntu base):

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    r-base \
    gdal-bin \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    libudunits2-dev \
    libfftw3-dev \
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev && \
    R -q -e "install.packages(c('FIELDimageR','FIELDimageR.Extra','imager','optparse','stars','terra','sf','dplyr','oce','viridisLite'), repos='https://cloud.r-project.org')" && \
    rm -rf /var/lib/apt/lists/*
```

Recommended practices:

- Use a **single layer** to install system libs and R packages to benefit from Docker layer caching.
- Consider a **multi-stage build** if image size becomes an issue (e.g., build R packages in a builder image and copy the R library directory into the runtime image).
- Ensure that the backend container has access to the `RESULTS_DIR` volume so that R can read the orthophoto/shape files and write `prescription.geojson`.

