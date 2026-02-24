# Stage 1: Build Fields2Cover from source
FROM osgeo/gdal:ubuntu-full-3.6.3 AS builder

ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /workspaces/

# Reorganize GDAL headers into expected layout
RUN mkdir -p /usr/include/new_gdal && \
    cp -r /usr/include/gdal* /usr/include/new_gdal/ && \
    cp /usr/include/ogr* /usr/include/new_gdal/ && \
    cp /usr/include/cpl* /usr/include/new_gdal/ && \
    mv /usr/include/new_gdal/ /usr/include/gdal/

RUN apt-get update --allow-insecure-repositories -y && \
    apt-get install -y --allow-unauthenticated --no-install-recommends ca-certificates

# Install cmake (use packaged version for GDAL >= 3.3)
RUN if gdalinfo --version | grep -o " 3\.[0-2]\."; then \
      apt-get install -y wget && \
      wget https://github.com/Kitware/CMake/releases/download/v3.17.2/cmake-3.17.2-Linux-x86_64.sh \
        -q -O /tmp/cmake-install.sh && \
      chmod u+x /tmp/cmake-install.sh && \
      mkdir /usr/bin/cmake && \
      /tmp/cmake-install.sh --skip-license --prefix=/usr/bin/cmake && \
      rm /tmp/cmake-install.sh; \
    else \
      apt install -y --allow-unauthenticated --no-install-recommends cmake; \
    fi

ENV PATH="/usr/bin/cmake/bin:${PATH}"

# Install build dependencies for Fields2Cover
RUN apt-get install -y --allow-unauthenticated --no-install-recommends \
    build-essential \
    doxygen \
    g++ \
    git \
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
    libtinyxml2-dev \
    nlohmann-json3-dev \
    swig \
    wget

# Install OR-Tools
RUN wget https://github.com/google/or-tools/releases/download/v9.9/or-tools_amd64_ubuntu-22.04_cpp_v9.9.3963.tar.gz \
      -q -O /tmp/ortools.tar.gz && \
    mkdir -p /tmp/ortools && \
    tar -zxf /tmp/ortools.tar.gz -C /tmp/ortools --strip-components=1 && \
    cp -r /tmp/ortools/bin/. /usr/bin && \
    cp -r /tmp/ortools/include/. /usr/include && \
    cp -r /tmp/ortools/lib/. /usr/lib && \
    cp -r /tmp/ortools/lib/cmake/. /usr/share && \
    cp -r /tmp/ortools/share/. /usr/share/ortools && \
    rm -rf /tmp/ortools /tmp/ortools.tar.gz

# Build gtest
RUN cd /usr/src/gtest && \
    cmake CMakeLists.txt && \
    make && \
    (cp *.a /usr/lib/ 2>/dev/null || :) && \
    (cp lib/*.a /usr/lib/ 2>/dev/null || :)

# Clone and build Fields2Cover with Python bindings
RUN git clone https://github.com/Fields2Cover/Fields2Cover.git /workspace/fields2cover && \
    mkdir -p /workspace/fields2cover/build && \
    cd /workspace/fields2cover/build && \
    cmake -DBUILD_PYTHON=ON \
          -DBUILD_TUTORIALS=OFF \
          -DBUILD_TESTING=OFF \
          -DBUILD_DOC=OFF \
          -DCMAKE_BUILD_TYPE=Release .. && \
    make -j$(nproc) install

# Stage 2: Final runtime image
FROM osgeo/gdal:ubuntu-full-3.6.3

ENV DEBIAN_FRONTEND=noninteractive

# Reorganize GDAL headers (needed at runtime for some Python geo packages)
RUN mkdir -p /usr/include/new_gdal && \
    cp -r /usr/include/gdal* /usr/include/new_gdal/ && \
    cp /usr/include/ogr* /usr/include/new_gdal/ && \
    cp /usr/include/cpl* /usr/include/new_gdal/ && \
    mv /usr/include/new_gdal/ /usr/include/gdal/

# Install runtime dependencies
RUN apt-get update --allow-insecure-repositories -y && \
    apt-get install -y --allow-unauthenticated --no-install-recommends \
    python3 \
    python3-pip \
    python3-dev \
    libboost-dev \
    libgeos-dev \
    libtbb-dev \
    libeigen3-dev \
    libtinyxml2-dev \
    libpython3-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy Fields2Cover build artifacts from builder stage
COPY --from=builder /usr/local/lib/ /usr/local/lib/
COPY --from=builder /usr/local/include/ /usr/local/include/
COPY --from=builder /usr/lib/python3/dist-packages/fields2cover* /usr/lib/python3/dist-packages/
# Copy OR-Tools runtime libs
COPY --from=builder /usr/lib/libortools* /usr/lib/
COPY --from=builder /usr/lib/libprotobuf* /usr/lib/

RUN ldconfig

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create required directories
RUN mkdir -p uploads results path_jobs

EXPOSE 8001

CMD ["python3", "run.py"]
