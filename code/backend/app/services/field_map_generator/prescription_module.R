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
library(imager)

source("fieldShapeModified.R")

# TODO: write function to set ideal field resolution with parameter for minimum cell resolution (boom sprayer size)

# RoundUp <- function(x, increment) {
#   ceiling(x / increment) * increment
# }

# calculate_cluster_likelihood <- function(df, n_cols) {
#   n <- nrow(df)
#   n_rows <- ceiling(n / n_cols)
#   
#   # Create cluster matrix
#   cluster_matrix <- matrix(NA, nrow = n_rows, ncol = n_cols)
#   cluster_matrix[seq_len(n)] <- df$cluster
#   
#   # Initialize counts
#   match_count <- integer(n)
#   total_count <- integer(n)
#   
#   # Check all 4 directions using matrix operations
#   # Below
#   valid <- seq_len(n)[seq_len(n) > n_cols]
#   match_count[valid] <- match_count[valid] + (cluster_matrix[valid] == cluster_matrix[valid - n_cols])
#   total_count[valid] <- total_count[valid] + 1
#   
#   # Above
#   valid <- seq_len(n)[seq_len(n) <= n - n_cols]
#   match_count[valid] <- match_count[valid] + (cluster_matrix[valid] == cluster_matrix[valid + n_cols])
#   total_count[valid] <- total_count[valid] + 1
#   
#   # Left
#   valid <- seq_len(n)[((seq_len(n) - 1) %% n_cols) != 0]
#   match_count[valid] <- match_count[valid] + (cluster_matrix[valid] == cluster_matrix[valid - 1])
#   total_count[valid] <- total_count[valid] + 1
#   
#   # Right
#   valid <- seq_len(n)[((seq_len(n) - 1) %% n_cols) != (n_cols - 1) & seq_len(n) < n]
#   match_count[valid] <- match_count[valid] + (cluster_matrix[valid] == cluster_matrix[valid + 1])
#   total_count[valid] <- total_count[valid] + 1
#   
#   # Calculate likelihood
#   df$cluster_likelihood <- ifelse(total_count > 0, match_count / total_count, 0)
#   
#   return(df)
# }

smoothen_field <- function(field, rows, sigma = 1) {
  # Convert to matrix
  ndvi_matrix <- matrix(field$NDVI_max, nrow = rows, ncol = rows, byrow = FALSE)
  na_mask <- is.na(ndvi_matrix)
  ndvi_matrix[is.na(ndvi_matrix)] <- 0
  
  # Use Gaussian blur (proper smoothing)
  img <- as.cimg(ndvi_matrix)
  smoothed <- blur_anisotropic(img, amplitude = sigma)
  
  smoothed_matrix <- as.matrix(smoothed)
  smoothed_matrix[na_mask] <- NA
  
  field$NDVI_max <- as.vector(as.matrix(smoothed_matrix))
  return(field)
}

# Generates a prescription map from stitched orthophoto drone imagery.
# orthophoto: stitched drone image filepath, file generated with WebODM
# heading: in degrees, the heading that the robot will use on the field
# cell_size: in meters, the size of each cell in the field (for length & width). Larger cell size means lower field resolution.
# cluster_count: the number of categories of health to divide the map into.
# smoothing_rounds: the number of time the data gets smoothed. The more smoothing, the larger the data clumps.
# smoothing_sigma: the intensity of each round of smoothing. The more smoothing, the larger the data clumps.
# ndvi_threshold: the threshold to classify a "healthy" cell - lower value results in more of the field classified as "healthy"
# outputFilePath: the file path for the output prescription map. Defaults to data folder
# outputFileName: the file name for the output prescription map.
generate_prescription <- function (orthophoto, heading = 0, cell_size = 4.571, cluster_count = 3, smoothing_rounds = 3, 
                                   smoothing_sigma = 10, ndvi_threshold = 1, outputFilePath = "../data/", 
                                   outputFileName = paste("prescriptionMap_", format(Sys.time(), "%Y-%m-%d_%H%M%S"), ".geojson", sep=""))
{
  # obtain the NDVI values from the orthophoto
  multispectral <- rast(orthophoto)
  multispectral_indices <- fieldIndex(multispectral,Red=1,Green=2,NIR=3,RedEdge=4,
                               index = c("NDVI","NDRE"))
  
  # obtain our field grid
  print("Setting up the field grid...")
  field_grid<-fieldShapeAuto(mosaic = multispectral_indices$NDVI, heading = heading, cell_size = cell_size)
  #fieldView(mosaic = multispectral_indices$NDVI, fieldShape = field_grid$plots, type = 2, alpha = 0.2)
  
  # convert our grid into a table
  NDVI_cell_info <- fieldInfo_extra(mosaic = multispectral_indices$NDVI, fieldShape = field_grid$plots, fun="max")
  
  # cleanse invalid out-of-range data
  NDVI_cell_info$NDVI_max <- pmax(NDVI_cell_info$NDVI_max, -1)
  NDVI_cell_info$NDVI_max <- pmin(NDVI_cell_info$NDVI_max, 1)
  
  for (i in 1:smoothing_rounds)
  {
    NDVI_cell_info$NDVI_max <- smoothen_field(NDVI_cell_info, field_grid$rows, sigma=smoothing_sigma)$NDVI_max
  }
  NDVI_cell_info <- na.omit(NDVI_cell_info)
  
  NDVI_cluster_data <- NDVI_cell_info %>%
    mutate(
      boundary = geometry,
      centerpoint = st_centroid(geometry),
      easting = st_coordinates(centerpoint)[, 1],
      northing = st_coordinates(centerpoint)[, 2],
    ) %>%
    select(NDVI_max, easting, northing, PlotID, boundary) %>%
    st_drop_geometry()
  
  
  #############################################################################################################
  # clustering with evenly spaced points (no ML)
  NDVI_cluster_data_ecdf <- ecdf(NDVI_cluster_data$NDVI_max)
  maximum_percentile <- NDVI_cluster_data_ecdf(ndvi_threshold)
  
  probs <- seq(from = maximum_percentile/cluster_count, to = maximum_percentile, by = maximum_percentile/cluster_count)
  intervals <- quantile(NDVI_cluster_data$NDVI_max, probs = probs)
  
  NDVI_cluster_data <- NDVI_cluster_data %>%
    rowwise() %>%
    
    # TODO: fix this, clusters should be based on max, not min
    mutate(cluster = min(min(which(intervals >= NDVI_max)), cluster_count)) %>%
    ungroup()
  
  plot(NDVI_cluster_data$easting, NDVI_cluster_data$northing,
       col = NDVI_cluster_data$cluster,
       pch = 20)
    
  
  # cluster_interval <- ((abs(min(NDVI_cell_info$NDVI_max)) + abs(max(NDVI_cell_info$NDVI_max))) / cluster_count)
  # NDVI_cell_info <- NDVI_cell_info %>%
  #   mutate(cluster = (NDVI_max + abs(min(NDVI_max))) %/% cluster_interval)
  # NDVI_cell_info$cluster <- pmin(NDVI_cell_info$cluster, cluster_count-1)
  
  ############################################################################################################
  
  
  # ############################################################################################################
  # # clustering with consensus HDBSCAN
  # 
  # #NDVI_cell_info[paste0("cluster_prob_", 1:cluster_count)] <- NA
  # 
  # # cluster our dataset multiple times over, use a consensus model
  # for (i in seq(from=0.2, to=0.3, by=0.01))
  # {
  #   NDVI_cluster_data <- NDVI_cell_info %>%
  #     mutate(
  #       boundary = geometry,
  #       centerpoint = st_centroid(geometry),
  #       easting = st_coordinates(centerpoint)[, 1],
  #       northing = st_coordinates(centerpoint)[, 2],
  #       NDVI_max = RoundUp(NDVI_max_smoothened, i)
  #       
  #     ) %>%
  #     #mutate(NDVI_max = NDVI_max * 1) %>%  # 3-dimensional radius means we need to spread out our NDVI Values more
  #     select(NDVI_max, easting, northing, PlotID) %>%
  #     st_drop_geometry()
  #   
  #   # normalization (PREFERRED OPTION)
  #   NDVI_cluster_data_normalized <- scale(NDVI_cluster_data)
  #   
  #   dbscan_result <- hdbscan(NDVI_cluster_data_normalized, minPts = 8)
  #   
  #   #TODO: get the averages for each cluster in dbscan_result
  #   cluster_results <- NDVI_cluster_data
  #   cluster_results$cluster <- dbscan_result$cluster
  #   cluster_results$cluster_likelihood_total <- 0
  #   
  #   NDVI_cluster_likelihoods <- calculate_cluster_likelihood(NDVI_cluster_data, field_grid$rows)
  #   
  #   # cluster_averages <- lapply(unique(NDVI_cluster_data[NDVI_cluster_data$cluster > 0,]$cluster), function(i) {
  #   #   mean(NDVI_cluster_data[NDVI_cluster_data$cluster == i, ]$NDVI_max)
  #   # })
  #   
  #   
  # }
  # ############################################################################################################
  # 
  # for (i in seq(from=0.2, to=0.3, by=0.01))
  # {
  #   NDVI_cluster_data <- NDVI_cell_info %>%
  #     mutate(
  #       boundary = geometry,
  #       centerpoint = st_centroid(geometry),
  #       easting = st_coordinates(centerpoint)[, 1],
  #       northing = st_coordinates(centerpoint)[, 2],
  #       NDVI_max = RoundUp(NDVI_max_smoothened, i)
  #     ) %>%
  #     mutate(NDVI_max = NDVI_max * 1) %>%  # 3-dimensional radius means we need to spread out our NDVI Values more
  #     select(NDVI_max, easting, northing) %>%
  #     st_drop_geometry()
  #   
  #   # normalization (PREFERRED OPTION)
  #   NDVI_cluster_data_normalized <- scale(NDVI_cluster_data)
  #   
  #   # run dbscan in 3-dimensions (latitude, longitude, NDVI)
  #   dbscan_result <- hdbscan(NDVI_cluster_data_normalized, minPts = 8)
  #   table(dbscan_result$cluster) # view the cluster results
  #   plot(NDVI_cluster_data$easting, NDVI_cluster_data$northing,
  #        col = dbscan_result$cluster+1,
  #        pch = 20)
  # }
  
  
  prescription_map <- NDVI_cluster_data %>%
    mutate(
      # convert UTM easting / northing into latitude / longitude
      centerpoint_longitude = utm2lonlat(easting = easting, northing = northing, zone = 11, hemisphere = "N")$longitude,
      centerpoint_latitude = utm2lonlat(easting = easting, northing = northing, zone = 11, hemisphere = "N")$latitude,
      boundary_sfc = st_sfc(boundary, crs=32611),
      boundary_latlong = st_transform(boundary_sfc, crs=4326)
      
    ) %>%
    select(PlotID, NDVI_max, boundary_latlong, cluster, centerpoint_longitude, centerpoint_latitude)
  
  # bring dbscan results into points dataset
  #prescription_map$cluster <- dbscan_result$cluster
  
  
  # convert coordinate list to a SpatVector
  print("Finishing up...")
  prescription_map_vector <- vect(prescription_map, geom = c("centerpoint_longitude", "centerpoint_latitude"), crs="EPSG:4326")
  writeVector(prescription_map_vector, paste(outputFilePath, outputFileName), filetype = "GeoJSON", overwrite = TRUE)
  print(paste("prescription written to ", outputFilePath, outputFileName, sep=""))
  
  return(TRUE)
}

success <- generate_prescription("../data/odm_orthophoto_updated.tif", heading = 20, cell_size = 6, cluster_count = 6)

## FOR TESTING PURPOSES ONLY
orthophoto <- "../data/odm_orthophoto_updated.tif"
heading <- 5
boomSizeFt <- 30
outputFilePath = "../data/"
outputFileName = paste("prescriptionMap_", format(Sys.time(), "%Y-%m-%d_%H%M%S"), ".geojson", sep="")
ndvi_threshold = 1
smoothing_rounds = 3
smoothing_sigma = 10
##

# NDVI_Cells <- generate_prescription("../data/odm_orthophoto.tif", heading = 45)
# 
# scatterplot3d(x = NDVI_Cells$easting, y = NDVI_Cells$northing, z = NDVI_Cells$NDVI_max,
#               xlab = "easting (m)", ylab = "northing (m)", zlab = "NDVI max",
#               main = "easting vs. northing vs. NDVI max", pch = 16, color = "red")