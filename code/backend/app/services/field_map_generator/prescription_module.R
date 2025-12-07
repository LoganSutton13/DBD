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

# Generates a prescription map from stitched orthophoto drone imagery.
# orthophoto: stitched drone image filepath, file generated with WebODM
# heading: in degrees, the heading that the robot will use on the field
# boomSizeFt: in feet, the size of the boom sprayer on the robot
# outputFilePath: the file path for the output prescription map. Defaults to data folder
# outputFileName: the file name for the output prescription map.
generate_prescription <- function (orthophoto, heading = 0, boomSizeFt = 15, 
                                   outputFilePath = "../data/", 
                                   outputFileName = paste("prescriptionMap_", format(Sys.time(), "%Y-%m-%d_%H%M%S"), ".geojson", sep=""))
{
  # obtain the NDVI values from the orthophoto
  multispectral <- rast(orthophoto)
  multispectral_indices <- fieldIndex(multispectral,Red=1,Green=2,NIR=3,RedEdge=4,
                               index = c("NDVI","NDRE"))
  # convert boom size feet to meters
  boomSize <- boomSizeFt / 3.281
  
  # obtain our field grid
  print("Setting up the field grid...")
  field_grid<-fieldShapeAuto(mosaic = multispectral_indices$NDVI, heading = heading)
  fieldView(mosaic = multispectral_indices$NDVI, fieldShape = field_grid$plots, type = 2, alpha = 0.2)
  
  # convert our grid into a table
  NDVI_cell_info <- fieldInfo_extra(mosaic = multispectral_indices$NDVI, fieldShape = field_grid$plots, fun="max")
  NDVI_cell_info <- na.omit(NDVI_cell_info)
  
  # create our dataset to be clustered
  print("Prepping our dataset...")
  NDVI_cluster_data <- NDVI_cell_info %>%
    mutate(
      boundary = geometry,
      centerpoint = st_centroid(geometry),
      easting = st_coordinates(centerpoint)[, 1],
      northing = st_coordinates(centerpoint)[, 2]
    ) %>%
    mutate(NDVI_max = NDVI_max * 1) %>%  # 3-dimensional radius means we need to spread out our NDVI Values more
    select(NDVI_max, easting, northing, boundary, PlotID) %>%
    st_drop_geometry()
  
  # normalization (PREFERRED OPTION)
  NDVI_cluster_data_normalized <- NDVI_cluster_data %>%
    mutate(
      easting = (easting - min(easting)) / (max(easting) - min(easting)),
      northing = (northing - min(northing)) / (max(northing) - min(northing)),
      NDVI_max = (NDVI_max - min(NDVI_max)) / (max(NDVI_max) - min(NDVI_max))
    ) %>%
    select(easting, northing, NDVI_max)
  
  # run dbscan in 3-dimensions (latitude, longitude, NDVI)
  print("Finding clusters...")
  dbscan_result <- hdbscan(NDVI_cluster_data_normalized, minPts = 8)
  table(dbscan_result$cluster) # view the cluster results
  
  prescription_map <- NDVI_cluster_data %>%
    mutate(
      # convert UTM easting / northing into latitude / longitude
      centerpoint_longitude = utm2lonlat(easting = easting, northing = northing, zone = 11, hemisphere = "N")$longitude,
      centerpoint_latitude = utm2lonlat(easting = easting, northing = northing, zone = 11, hemisphere = "N")$latitude,
      boundary_sfc = st_sfc(boundary, crs=32611),
      boundary_latlong = st_transform(boundary_sfc, crs=4326)
      
    ) %>%
    select(PlotID, NDVI_max, boundary_latlong, centerpoint_longitude, centerpoint_latitude)
  
  # bring dbscan results into points dataset
  prescription_map$cluster <- dbscan_result$cluster
  
  
  # convert coordinate list to a SpatVector
  print("Finishing up...")
  prescription_map_vector <- vect(prescription_map, geom = c("centerpoint_longitude", "centerpoint_latitude"), crs=4326)
  writeVector(prescription_map_vector, paste(outputFilePath, outputFileName), filetype = "GeoJSON", overwrite = TRUE)
  print(paste("prescription written to ", outputFilePath, outputFileName, sep=""))
  
  return(TRUE)
}

success <- generate_prescription("../data/odm_orthophoto_updated.tif", heading = 5)


# NDVI_Cells <- generate_prescription("../data/odm_orthophoto.tif", heading = 45)
# 
# scatterplot3d(x = NDVI_Cells$easting, y = NDVI_Cells$northing, z = NDVI_Cells$NDVI_max,
#               xlab = "easting (m)", ylab = "northing (m)", zlab = "NDVI max",
#               main = "easting vs. northing vs. NDVI max", pch = 16, color = "red")