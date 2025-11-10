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
EX1.5b <- rast("../data/odm_orthophoto.tif") # Andrew's test field orthophoto

# Cropping the image using the previous shape (We probably don't need to do this)
#EX1.5b.Crop <- fieldCrop(mosaic = EX1.5b, plot = T, fast.plot = T)

# Rotating the image using the same theta (TODO: Adjust to farmer's specific heading)
heading = 2.3
EX1.5b.Rotated<-fieldRotate(EX1.5b, theta = 2.3, plot = T)
fieldView(mosaic = EX1.5b.Rotated, fieldShape = EX1.Shape, type = 2, alpha = 0.2)

# Removing the soil using index and mask
EX1.5b.RemSoil<-fieldMask(EX1.5b,Red=1,Green=2,Blue=3,index="HUE",cropValue=0,cropAbove=T,plot=T)

# Building indices (NDVI and NDRE)
EX1.5b.Indices <- fieldIndex(EX1.5b,Red=1,Green=2,Blue=3,RedEdge=4,NIR=5,
                             index = c("NDVI","NDRE"))

unitSize = 4.572 # 15ft in meters
map_cols <- ceiling((xmax(EX1.5b.Indices$NDVI) - xmin(EX1.5b.Indices$NDVI)) / unitSize)
map_rows <- ceiling((ymax(EX1.5b.Indices$NDVI) - ymin(EX1.5b.Indices$NDVI)) / unitSize)


#plot(EX1.5b.Indices)
#EX1.Shape<-fieldShape_render(mosaic = EX1.5b.Indices$NDVI,ncols = 86, nrows = 44)
source("fieldShapeModified.R")
EX1.Shape<-fieldShapeAuto(mosaic = EX1.5b.Indices$NDVI, ncols = map_cols, nrows = map_rows)
fieldView(mosaic = EX1.5b.Indices$NDVI, fieldShape = EX1.Shape, type = 2, alpha = 0.2)

# Extracting data using the same fieldShape file from step 5:
#EX1.5b.InfoNDRE <- fieldInfo_extra(mosaic = EX1.5b.Indices$NDRE, fieldShape = EX1.Shape, fun="max")
#EX1.5b.InfoNDRE <- na.omit(EX1.5b.InfoNDRE)
EX1.5b.InfoNDVI <- fieldInfo_extra(mosaic = EX1.5b.Indices$NDVI, fieldShape = EX1.Shape, fun="max")
EX1.5b.InfoNDVI <- na.omit(EX1.5b.InfoNDVI)
#EX1.5b.Info <- fieldInfo_extra(mosaic = EX1.5b.Indices, fieldShape = EX1.Shape, fun="max")
#EX1.5b.Info <- na.omit(EX1.5b.Info)

# TODO: create an exportable csv file version of this data
# CSVData <- EX1.5bInfoNDVI %>%
#   mutate(
#     lonlat <- utm2lonlat(easting = easting_coord, 
#                                 northing = northing_coord, 
#                                 zone = utm_zone, 
#                                 hemisphere = hemisphere_val)
#   )

# create our dataset to be clustered
NDVIData <- EX1.5b.InfoNDVI %>%
    mutate(
      centerpoint = st_centroid(geometry),
      easting = st_coordinates(centerpoint)[, 1],
      northing = st_coordinates(centerpoint)[, 2]
    ) %>%
    mutate(NDVI_max = NDVI_max * 10) %>%  # 3-dimensional radius means we need to spread out our NDVI Values more
    select(NDVI_max, easting, northing) %>%
    st_drop_geometry()

# run dbscan in 3-dimensions (latitude, longitude, NDVI)
dbscan_result <- dbscan(NDVIData, eps = 6, minPts = 4)
table(dbscan_result$cluster) # view the cluster results

#  



#  PRESCRIPTION MAPPING - cover field in least number of turns
# create our graph in matrix form
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
    edges <- rbind(edges, as.numeric(data) - map_cols)
  }
  if ((as.numeric(data) + map_cols) %in% rownames(NDVIData)) {
    edges <- rbind(edges, as.numeric(data))
    edges <- rbind(edges, as.numeric(data) + map_cols)
  }
}
edges <- edges[-1, ]
#hamiltonian(edges, start = as.numeric(rownames(NDVIData)[1]), cycle = FALSE)

