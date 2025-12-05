# Testing FIELDimageR workflow. This is NOT production-ready code, nor should it be run in anything other than RStudio.

# FIELDimageR:
#devtools::install_github("OpenDroneMap/FIELDimageR")
#devtools::install_github("filipematias23/FIELDimageR.Extra")


# Required libraries
library(FIELDimageR)
library(FIELDimageR.Extra)
library(raster)
library(terra)
library(mapview)
library(sf)
library(stars)
library(dbscan)

# Uploading multispectral mosaic:
# EX1.5b <- rast("../data/EX1_5band.tif") # test orthophoto from online
EX1.5b <- rast("../data/DJI_202508020944_001_Shop/DJI_20250802095421_0206_MS_R.TIF")
EX1.5b <- rast("../data/odm_orthophoto.tif") # Andrew's test field orthophoto

### Pipeline with Pix4d pre-rendered NDVI Data ###
Andrew_NDVI <- rast("../data/NDVI.data.tif") # Andrew's pre-rendered NDVI data with Pix4d
source("fieldShapeModified.R")
Field_Shape<-fieldShapeAuto(mosaic = Andrew_NDVI, heading = 0)
fieldView(mosaic = Andrew_NDVI, fieldShape = Field_Shape$plots, type = 2, alpha = 0.2)

InfoNDVI <- fieldInfo_extra(mosaic = Andrew_NDVI, fieldShape = Field_Shape$plots, fun="max")
InfoNDVI <- na.omit(InfoNDVI)

NDVIData <- InfoNDVI %>%
  mutate(
    centerpoint = st_centroid(geometry),
    easting = st_coordinates(centerpoint)[, 1],
    northing = st_coordinates(centerpoint)[, 2]
  ) %>%
  #mutate(Gray_max = Gray_max * 100) %>%  # 3-dimensional radius means we need to spread out our NDVI Values more
  select(Gray_max, easting, northing) %>%
  st_drop_geometry()

# normalization (PREFERRED OPTION)
NDVIData_Scaled <- NDVIData %>%
  mutate(
    easting = (easting - min(easting)) / (max(easting) - min(easting)),
    northing = (northing - min(northing)) / (max(northing) - min(northing)),
    Gray_max = (Gray_max - min(Gray_max)) / (max(Gray_max) - min(Gray_max))
  )

# OR Standardization
NDVIData_Scaled <- NDVIData %>%
  mutate(
    easting = (easting - mean(easting)) / sd(easting),
    northing = (northing - mean(northing)) / sd(northing),
    Gray_max = (Gray_max - mean(Gray_max)) / sd(Gray_max)
  )


dbscan_result <- dbscan(NDVIData_Scaled, eps = 0.03, minPts = 10)
table(dbscan_result$cluster) # view the cluster results
plot(NDVIData_Scaled[,2], NDVIData_Scaled[,3],
     col = dbscan_result$cluster + 1,
     pch = 20)

# view only certain clusters
idx <- dbscan_result$cluster == 8
cols <- dbscan_result$cluster[idx] + 1  # or any mapping you use

plot(NDVIData_Scaled[idx, 2], NDVIData_Scaled[idx, 3],
     col = cols,
     pch = 20)


### END NDVI PIPELINE TEST


# Cropping the image using the previous shape (We probably don't need to do this)
#EX1.5b.Crop <- fieldCrop(mosaic = EX1.5b, plot = T, fast.plot = T)

# Rotating the image using the same theta (TODO: Adjust to farmer's specific heading)
heading = 2.3
EX1.5b.Rotated<-fieldRotate(EX1.5b, theta = 40, plot = T)
#crs(EX1.5b.Rotated)<-crs(EX1.5b)
#extent(EX1.5b.Rotated)<-extent(EX1.5b)
#fieldView(mosaic = EX1.5b.Rotated, fieldShape = EX1.Shape, type = 2, alpha = 0.2)

# Removing the soil using index and mask
EX1.5b.RemSoil<-fieldMask(EX1.5b,Red=1,Green=2,Blue=3,index="HUE",cropValue=0,cropAbove=T,plot=T)

# Building indices (NDVI and NDRE)
EX1.5b.Indices <- fieldIndex(EX1.5b,Red=1,Green=2,NIR=3,RedEdge=4,
                             index = c("NDVI","NDRE"))

unitSize = 4.572 # 15ft in meters
map_cols <- ceiling((xmax(EX1.5b.Indices$NDVI) - xmin(EX1.5b.Indices$NDVI)) / unitSize)
map_rows <- ceiling((ymax(EX1.5b.Indices$NDVI) - ymin(EX1.5b.Indices$NDVI)) / unitSize)


#plot(EX1.5b.Indices)
#EX1.Shape<-fieldShape_render(mosaic = EX1.5b.Indices$NDVI,ncols = 86, nrows = 44)
#EX1.Shape<-fieldShape_render(mosaic = EX1.5b,ncols = 86, nrows = 44)
source("fieldShapeModified.R")
EX1.Shape<-fieldShapeAuto(mosaic = EX1.5b.Indices$NDVI, heading = 45)
fieldView(mosaic = EX1.5b.Indices$NDVI, fieldShape = EX1.Shape$plots, type = 2, alpha = 0.2)

# Extracting data using the same fieldShape file from step 5:
#EX1.5b.InfoNDRE <- fieldInfo_extra(mosaic = EX1.5b.Indices$NDRE, fieldShape = EX1.Shape, fun="max")
#EX1.5b.InfoNDRE <- na.omit(EX1.5b.InfoNDRE)
EX1.5b.InfoNDVI <- fieldInfo_extra(mosaic = EX1.5b.Indices$NDVI, fieldShape = EX1.Shape$plots, fun="max")
EX1.5b.InfoNDVI <- na.omit(EX1.5b.InfoNDVI)
#EX1.5b.Info <- fieldInfo_extra(mosaic = EX1.5b.Indices, fieldShape = EX1.Shape, fun="max")
#EX1.5b.Info <- na.omit(EX1.5b.Info)

# create our dataset to be clustered
NDVIData <- EX1.5b.InfoNDVI %>%
    mutate(
      centerpoint = st_centroid(geometry),
      easting = st_coordinates(centerpoint)[, 1],
      northing = st_coordinates(centerpoint)[, 2]
    ) %>%
    mutate(Gray_max = Gray_max * 100) %>%  # 3-dimensional radius means we need to spread out our NDVI Values more
    select(Gray_max, easting, northing) %>%
    st_drop_geometry()

NDVIDataCSV <- EX1.5b.InfoNDVI %>%
  mutate(
    centerpoint = st_centroid(geometry),
    easting = st_coordinates(centerpoint)[, 1],
    northing = st_coordinates(centerpoint)[, 2],
    longitude = utm2lonlat(easting = easting,
                         northing = northing,
                         zone = 11,
                         hemisphere = "N")$longitude,
    latitude = utm2lonlat(easting = easting,
                            northing = northing,
                            zone = 11,
                            hemisphere = "N")$latitude,
    ) %>%
  select(PlotID, NDVI_max, latitude, longitude) %>%
  st_drop_geometry()
write.csv(NDVIDataCSV, file = "NDVI_Test-Field.csv", row.names=FALSE)

# run dbscan in 3-dimensions (latitude, longitude, NDVI)
dbscan_result <- dbscan(NDVIData, eps = 6, minPts = 4)
table(dbscan_result$cluster) # view the cluster results
plot(NDVIData_Scaled[,2], NDVIData_Scaled[,3],
     +      col = dbscan_result$cluster + 1,
     +      pch = 20)

plot(dbscan_result$cluster, NDVIData_Scaled)
#  



#  PRESCRIPTION MAPPING - cover field in least number of turns
# create our graph in matrix form

# Identify edges of our field

edges <- matrix()
for (data in rownames(NDVIData)) {
  if ((as.numeric(data) - 1) %in% rownames(NDVIData)) {
    edges <- rbind(edges, as.numeric(data))
    edges <- rbind(edges, as.numeric(data) - 1)
  }
  if ((as.numeric(data) + 1) %in% rownames(NDVIData)) {
    edges <- rbind(edges, as.numeric(data))
    edges <- rbind(edges, as.numeric(data) + 1)
  }
  if ((as.numeric(data) - map_cols) %in% rownames(NDVIData)) {
    edges <- rbind(edges, as.numeric(data))
    edges <- rbind(edges, as.numeric(data) - EX1.Shape$rows)
  }
  if ((as.numeric(data) + map_cols) %in% rownames(NDVIData)) {
    edges <- rbind(edges, as.numeric(data))
    edges <- rbind(edges, as.numeric(data) + EX1.Shape$rows)
  }
}
edges <- edges[-1, ]
#hamiltonian(edges, start = as.numeric(rownames(NDVIData)[1]), cycle = FALSE)

