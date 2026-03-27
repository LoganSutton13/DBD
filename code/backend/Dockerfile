############################
# Stage 0: Fields2Cover base
############################
# Heavy geospatial base with GDAL, plus build Fields2Cover from source
FROM osgeo/gdal:ubuntu-full-3.6.3 AS fields2cover_base

LABEL NAME="fields2cover" \
      VERSION="2.0.0" \
      DESC="Fields2Cover build stage with GDAL and Python bindings" \
      MAINTAINER="DBD Dockerized Image"

ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /workspaces/

# Workaround for GDAL include directory layout expected by Fields2Cover
RUN mkdir -p /usr/include/new_gdal && \
    cp -r /usr/include/gdal* /usr/include/new_gdal/ || true && \
    cp /usr/include/ogr* /usr/include/new_gdal/ || true && \
    cp /usr/include/cpl* /usr/include/new_gdal/ || true && \
    mv /usr/include/new_gdal/ /usr/include/gdal/ || true

RUN apt-get update --allow-insecure-repositories -y && \
    apt-get install -y --allow-unauthenticated --no-install-recommends ca-certificates wget git

# Install CMake – if GDAL version is 3.0–3.2, use Kitware installer, otherwise system cmake
RUN if gdalinfo --version | grep -o " 3\.[0-2]\." ; then \
      wget https://github.com/Kitware/CMake/releases/download/v3.17.2/cmake-3.17.2-Linux-x86_64.sh \
      -q -O /tmp/cmake-install.sh && \
      chmod u+x /tmp/cmake-install.sh && \
      mkdir -p /usr/bin/cmake && \
      /tmp/cmake-install.sh --skip-license --prefix=/usr/bin/cmake && \
      rm /tmp/cmake-install.sh ; \
    else \
      apt-get install -y --allow-unauthenticated --no-install-recommends cmake ; \
    fi

ENV PATH="/usr/bin/cmake/bin:${PATH}"

# Core build dependencies for Fields2Cover and Python bindings
RUN apt-get install -y --allow-unauthenticated --no-install-recommends \
                    build-essential \
                    doxygen \
                    g++ \
                    gnuplot \
                    lcov \
                    libboost-dev \
                    libgeos-dev \
                    libgtest-dev \
                    libtbb-dev \
                    libeigen3-dev \
                    libpython3-dev \
                    python3 \
                    python3-pip \
                    python3-matplotlib \
                    python3-pytest \
                    python3-tk \
                    ranger \
                    vim \
                    libtinyxml2-dev \
                    nlohmann-json3-dev

RUN python3 -m pip install --no-cache-dir gcovr setuptools

# Build gtest static libs
RUN apt-get install -y libgtest-dev && \
    cd /usr/src/gtest && \
    cmake CMakeLists.txt && \
    make && \
    (cp *.a /usr/lib/ 2>/dev/null || :) && \
    (cp lib/*.a /usr/lib/ 2>/dev/null || :)

# Install SWIG depending on GDAL version
RUN if gdalinfo --version | grep -o " 3\.[0-2]\." ; then \
      apt-get install -y --no-install-recommends --allow-unauthenticated \
        autoconf automake autotools-dev libpcre2-dev bison && \
      git clone https://github.com/swig/swig.git /tmp/swig && \
      cd /tmp/swig && \
      ./autogen.sh && \
      ./configure && \
      make -j8 && \
      make install && \
      rm -rf /tmp/swig ; \
    else \
      apt-get install -y --no-install-recommends --allow-unauthenticated swig ; \
    fi

# Install OR-Tools C++ distribution
RUN wget https://github.com/google/or-tools/releases/download/v9.9/or-tools_amd64_ubuntu-22.04_cpp_v9.9.3963.tar.gz -q -O /tmp/ortools.tar.gz && \
    mkdir -p /tmp/ortools && \
    tar -zxf /tmp/ortools.tar.gz -C /tmp/ortools --strip-components=1 && \
    cp -r /tmp/ortools/bin/. /usr/bin && \
    cp -r /tmp/ortools/include/. /usr/include && \
    cp -r /tmp/ortools/lib/. /usr/lib && \
    cp -r /tmp/ortools/lib/cmake/. /usr/share && \
    mkdir -p /usr/share/ortools && \
    cp -r /tmp/ortools/share/. /usr/share/ortools && \
    rm -rf /tmp/ortools /tmp/ortools.tar.gz

# Clone and build Fields2Cover from the official repository, enabling Python bindings
WORKDIR /workspace
RUN git clone https://github.com/Fields2Cover/Fields2Cover.git fields2cover && \
    rm -rf /workspace/fields2cover/build && mkdir /workspace/fields2cover/build

WORKDIR /workspace/fields2cover/build

RUN cmake -DBUILD_PYTHON=ON \
          -DBUILD_TUTORIALS=OFF \
          -DBUILD_TESTING=ON \
          -DBUILD_DOC=OFF \
          -DCMAKE_BUILD_TYPE=Release .. && \
    make -j"$(nproc)" install && \
    ldconfig


###################################
# Stage 1: R + FIELDimageR layer
###################################
FROM fields2cover_base AS r_fieldimager

LABEL maintainer="DBD Dockerized Image"

WORKDIR /workspaces

# R and geospatial dependencies used by FIELDimageR
RUN apt-get update && apt-get install -y --no-install-recommends \
    gfortran \
    libfftw3-dev \
    libgdal-dev \
    libgit2-dev \
    libgeos++-dev \
    libcurl4-openssl-dev \
    libssl-dev \
    libssh2-1-dev \
    libxml2-dev \
    libproj-dev \
    libsqlite3-dev \
    libudunits2-dev \
    libfontconfig1-dev \
    libfreetype6-dev \
    libharfbuzz-dev \
    libfribidi-dev \
    libpng-dev \
    libjpeg-dev \
    libtiff-dev \
    libglpk40 \
    libx11-dev \
    r-cran-caret \
    r-cran-s2 \
    r-cran-sf \
    r-cran-units \
    r-base \
    r-base-dev && \
    rm -rf /var/lib/apt/lists/*

# Install R/Bioconductor and FIELDimageR dependencies
RUN Rscript -e 'if (!requireNamespace("BiocManager", quietly = TRUE)) install.packages("BiocManager", repos = "https://cloud.r-project.org")' && \
    Rscript -e 'BiocManager::install(version = "3.13", ask = FALSE)' && \
    Rscript -e 'BiocManager::install("EBImage", version = "3.13", ask = FALSE)'

RUN Rscript -e 'install.packages(c("remotes", "leafsync", "git2r"), repos = "https://cloud.r-project.org", Ncpus = max(1, parallel::detectCores() - 1))'

# Install/verify DescTools explicitly.
# Your Dockerfile uses R 4.1.2, but DescTools releases now require R >= 4.2.0.
# Pin to an older CRAN archive version that works with R 4.1.x, and install its
# dependencies explicitly.
RUN Rscript -e 'install.packages(c("mvtnorm", "expm", "rstudioapi", "Exact", "gld", "BH"), repos = "https://cloud.r-project.org", Ncpus = max(1, parallel::detectCores() - 1), quiet = FALSE)'

RUN Rscript -e 'u="https://cran.r-project.org/src/contrib/Archive/DescTools/DescTools_0.99.44.tar.gz"; \
    install.packages(u, repos = NULL, type = "source", quiet = FALSE); \
    library(DescTools); \
    cat("DescTools installed successfully. Version:", as.character(utils::packageVersion("DescTools")), "\n")'

# Install FIELDimageR and geospatial dependencies explicitly (avoids remotes pulling
# incompatible CRAN versions like the latest DescTools). Keep these in a dedicated
# layer so Docker can cache them independently from GitHub package installs below.
RUN Rscript -e 'install.packages(c("attempt", "config", "DT", "xml2", "doParallel", "processx", "fields"), repos = "https://cloud.r-project.org", Ncpus = max(1, parallel::detectCores() - 1), quiet = FALSE)'

# Install exactextractr (used by some geospatial workflows)
RUN Rscript -e 'install.packages("exactextractr", repos = "https://cloud.r-project.org", Ncpus = max(1, parallel::detectCores() - 1), quiet = FALSE)'

# Verbose install so docker build logs clearly show failures.
RUN Rscript -e 'remotes::install_github("OpenDroneMap/FIELDimageR", dependencies = FALSE, upgrade = "never", quiet = FALSE)' && \
    Rscript -e 'library(FIELDimageR); cat("FIELDimageR installed successfully. Version:", as.character(utils::packageVersion("FIELDimageR")), "\n")'

RUN Rscript -e 'install.packages("leafem", repos = "https://cloud.r-project.org", Ncpus = max(1, parallel::detectCores() - 1), quiet = FALSE)'
RUN Rscript -e 'install.packages("lwgeom", repos = "https://cloud.r-project.org", Ncpus = max(1, parallel::detectCores() - 1), quiet = FALSE)'
RUN Rscript -e 'install.packages("systemfonts", repos = "https://cloud.r-project.org", Ncpus = max(1, parallel::detectCores() - 1), quiet = FALSE)'
RUN Rscript -e 'install.packages("textshaping", repos = "https://cloud.r-project.org", Ncpus = max(1, parallel::detectCores() - 1), quiet = FALSE)'
RUN Rscript -e 'install.packages("svglite", repos = "https://cloud.r-project.org", Ncpus = max(1, parallel::detectCores() - 1), quiet = FALSE)'
RUN Rscript -e 'install.packages("leafpop", repos = "https://cloud.r-project.org", Ncpus = max(1, parallel::detectCores() - 1), quiet = FALSE)'
RUN Rscript -e 'install.packages("mapview", repos = "https://cloud.r-project.org", Ncpus = max(1, parallel::detectCores() - 1), quiet = FALSE)'
RUN Rscript -e 'install.packages("mapedit", repos = "https://cloud.r-project.org", dependencies = TRUE, Ncpus = max(1, parallel::detectCores() - 1), quiet = FALSE, verbose = TRUE)'
RUN Rscript -e 'if (!requireNamespace("mapedit", quietly = TRUE)) { ap <- available.packages(repos = "https://cloud.r-project.org"); deps <- tools::package_dependencies("mapedit", db = ap, recursive = TRUE)[[1]]; needed <- unique(c("mapedit", deps)); missing <- needed[!vapply(needed, requireNamespace, logical(1), quietly = TRUE)]; stop(paste("mapedit installation failed; missing packages:", paste(missing, collapse = ", "))) } else { cat("mapedit installed successfully.\n") }'

# Verify required R packages are installed before FIELDimageR.Extra.
RUN Rscript -e 'pkgs <- c("FIELDimageR", "exactextractr", "fields", "DescTools", "plyr", "leafem", "lwgeom", "mapedit"); missing <- pkgs[!vapply(pkgs, requireNamespace, logical(1), quietly = TRUE)]; if (length(missing) > 0) { stop(paste("Missing R packages:", paste(missing, collapse = ", "))) } else { cat("All pre-FIELDimageR.Extra R packages installed successfully.\n") }'



# Install companion package FIELDimageR.Extra (required by some workflows)
RUN Rscript -e 'remotes::install_github("filipematias23/FIELDimageR.Extra", dependencies = FALSE, upgrade = "never", quiet = FALSE)' && \
    Rscript -e 'library(FIELDimageR.Extra); cat("FIELDimageR.Extra installed successfully. Version:", as.character(utils::packageVersion("FIELDimageR.Extra")), "\n")'

RUN Rscript -e 'install.packages("imager", repos = "https://cloud.r-project.org", Ncpus = max(1, parallel::detectCores() - 1), quiet = FALSE)'
RUN Rscript -e 'install.packages("optparse", repos = "https://cloud.r-project.org", Ncpus = max(1, parallel::detectCores() - 1), quiet = FALSE)'
RUN Rscript -e 'install.packages("stars", repos = "https://cloud.r-project.org", Ncpus = max(1, parallel::detectCores() - 1), quiet = FALSE)'
RUN Rscript -e 'install.packages("terra", repos = "https://cloud.r-project.org", Ncpus = max(1, parallel::detectCores() - 1), quiet = FALSE)'
RUN Rscript -e 'install.packages("oce", repos = "https://cloud.r-project.org", Ncpus = max(1, parallel::detectCores() - 1), quiet = FALSE)'

##########################################
# Stage 2: Final runtime (backend only)
##########################################
FROM r_fieldimager AS runtime

ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Ensure Python, NumPy and BLAS/LAPACK are available in final image
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-numpy \
    libopenblas-dev \
    liblapack-dev && \
    ln -sf /usr/bin/python3 /usr/bin/python && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies for backend
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy backend source code (rest of backend directory)
COPY . /app/

# Environment defaults (can be overridden at runtime)
ENV PORT=8001 \
    HOST=0.0.0.0 \
    PYTHONUNBUFFERED=1

EXPOSE 8001

# Use uvicorn to run the FastAPI application
CMD ["sh", "-c", "uvicorn app.main:app --host ${HOST:-0.0.0.0} --port ${PORT:-8001}"]

