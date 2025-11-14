# Prescription Module - inputs a multispectral orthophoto and outputs a prescription map.
# Copyright (C) 2025 Drone-Based Developers

library(FIELDimageR)
library(FIELDimageR.Extra)
library(raster)
library(terra)
library(mapview)
library(sf)
library(stars)
library(dbscan)

source("fieldShapeModified.R")

generate_prescription <- function (orthophoto, heading = 0, boomSizeFt = 15)
{
  # obtain the NDVI values from the orthophoto
  multispectral <- rast(orthophoto)
  multispectral_indices <- fieldIndex(multispectral,Red=1,Green=2,Blue=3,RedEdge=4,NIR=5,
                               index = c("NDVI","NDRE"))
  # convert boom size feet to meters
  boomSize <- boomSizeFt / 3.281
  
  # obtain our field grid
  field_grid<-fieldShapeAuto(mosaic = multispectral_indices$NDVI, heading = heading)
  
  # convert our grid into a table
  NDVI_cell_info <- fieldInfo_extra(mosaic = multispectral_indices$NDVI, fieldShape = field_grid$plots, fun="max")
  NDVI_cell_info <- na.omit(NDVI_cell_info)
  
  # create our dataset to be clustered
  NDVI_cluster_data <- NDVI_cell_info %>%
    mutate(
      centerpoint = st_centroid(geometry),
      easting = st_coordinates(centerpoint)[, 1],
      northing = st_coordinates(centerpoint)[, 2]
    ) %>%
    mutate(NDVI_max = NDVI_max * 10) %>%  # 3-dimensional radius means we need to spread out our NDVI Values more
    select(NDVI_max, easting, northing) %>%
    st_drop_geometry()
  
  # run dbscan in 3-dimensions (latitude, longitude, NDVI)
  dbscan_result <- dbscan(NDVI_cluster_data, eps = 6, minPts = 4)
  table(dbscan_result$cluster) # view the cluster results
  
  return(as.data.frame(NDVI_cluster_data))
}

NDVI_Cells <- generate_prescription("../data/odm_orthophoto.tif", heading = 45)
