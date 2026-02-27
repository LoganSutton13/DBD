# Prescription Module - inputs a multispectral orthophoto and outputs a prescription map.
# Copyright (C) 2025 Drone-Based Developers

library(FIELDimageR)
library(FIELDimageR.Extra)
library(imager)
library(optparse)
library(stars)
library(terra)

# Precondition: current working directory must be :/code/backend/app/services/field_map_generator
source("fieldShapeModified.R")


# function: determineFieldResolution
# approximates the correct cell size so as to not surpass a farmer's vertex limit on their hardware.
# field: SpatRaster object with boundaries in UTM format.
# max_vertices: integer specifying the highest number of vertices permitted.
determineFieldResolution <- function(field, max_vertices) {
  field_cell_size <- res(field)
  field_width <- field_cell_size[1] * ncol(field)
  field_height <- field_cell_size[1] * nrow(field)
  
  # cell resolution cannot go below the width of the boom sprayer (4.572m)
  cell_width <- max(4.572, (field_width * field_height) / max_vertices)
  return(cell_width)
}

# function: smoothenField
# smoothens the data gradient of NDVI information contained within a field consisting of cells
# field: a data frame containing the column 'NDVI_max'
# rows: the number of rows contained in the field.
# sigma: the kernel size of the smoothing operation (n by n)
# Precondition: the number of rows must be the same as the number of columns.
smoothenField <- function(field, rows, sigma = 1) {
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

# function: generatePrescription
# Generates a prescription map from stitched orthophoto drone imagery.
# orthophoto: stitched drone image filepath, file generated with WebODM
# heading: in degrees, the heading that the robot will use on the field
# cell_size: in meters, the size of each cell in the field (for length & width). Larger cell size means lower field resolution. NA for automatic field resolution.
# cluster_count: the number of categories of health to divide the map into.
# smoothing_rounds: the number of time the data gets smoothed. The more smoothing, the larger the data clumps.
# smoothing_sigma: the intensity of each round of smoothing. The more smoothing, the larger the data clumps.
# maximum_vertices: the maximum number of vertices that the field should contain. Used to calculate the field resolution.
# ndvi_threshold: the threshold to automatically classify a "healthy" cell - lower value results in more of the field classified as "healthy". Note that cells below this value can still be classified similarly via the bucketing process.
# output_file_path: the file path for the output prescription map. Defaults to data folder
# output_file_name: the file name for the output prescription map.

# TODO: mask field with a boundary shapefile parameter
generatePrescription <- function (orthophoto, heading, cell_size, cluster_count, smoothing_rounds, smoothing_sigma,
                                  maximum_vertices, ndvi_threshold, output_file_path, output_file_name)
{
  if (is.null(orthophoto)) {
    stop("Please provide a valid file path to a .tif orthophoto.")
  }
  
  # obtain the NDVI values from the orthophoto
  multispectral <- rast(orthophoto)
  multispectral_indices <- fieldIndex(multispectral,Red=1,Green=2,NIR=3,RedEdge=4,
                               index = c("NDVI","NDRE"))
  
  # obtain our field grid
  print("Setting up the field grid...")
  if(is.na(cell_size)) {
    cell_size <- determineFieldResolution(multispectral_indices$NDVI, maximum_vertices)
  }
  field_grid<-fieldShapeAuto(mosaic = multispectral_indices$NDVI, heading = heading, cell_size = cell_size)
  #fieldView(mosaic = multispectral_indices$NDVI, fieldShape = field_grid$plots, type = 2, alpha = 0.2)
  
  # convert our grid into a table
  NDVI_cell_info <- fieldInfo_extra(mosaic = multispectral_indices$NDVI, fieldShape = field_grid$plots, fun="max")
  
  # clean invalid out-of-range data
  NDVI_cell_info$NDVI_max <- pmax(NDVI_cell_info$NDVI_max, -1)
  NDVI_cell_info$NDVI_max <- pmin(NDVI_cell_info$NDVI_max, 1)
  
  for (i in 1:smoothing_rounds)
  {
    NDVI_cell_info$NDVI_max <- smoothenField(NDVI_cell_info, field_grid$rows, sigma=smoothing_sigma)$NDVI_max
  }
  
  # structure the dataset for clustering
  NDVI_cluster_data <- NDVI_cell_info %>%
    mutate(
      boundary = geometry,
      centerpoint = st_centroid(geometry),
      easting = st_coordinates(centerpoint)[, 1],
      northing = st_coordinates(centerpoint)[, 2],
    ) %>%
    select(NDVI_max, easting, northing, PlotID, boundary) %>%
    st_drop_geometry()
  
  NDVI_cluster_data <- na.omit(NDVI_cluster_data)
  
  #############################################################################################################
  # clustering with evenly spaced points (no ML)
  NDVI_cluster_data_ecdf <- ecdf(NDVI_cluster_data$NDVI_max)
  maximum_percentile <- NDVI_cluster_data_ecdf(ndvi_threshold)
  
  probs <- seq(from = maximum_percentile/cluster_count, to = maximum_percentile, by = maximum_percentile/cluster_count)
  intervals <- quantile(NDVI_cluster_data$NDVI_max, probs = probs)
  
  NDVI_cluster_data <- NDVI_cluster_data %>%
    rowwise() %>%
    
    mutate(cluster = min(min(which(intervals >= NDVI_max)), cluster_count)) %>%
    ungroup()
  
  # plot(NDVI_cluster_data$easting, NDVI_cluster_data$northing,
  #      col = NDVI_cluster_data$cluster,
  #      pch = 20)
    
  prescription_map <- NDVI_cluster_data %>%
    mutate(
      # convert UTM easting / northing into latitude / longitude
      centerpoint_longitude = utm2lonlat(easting = easting, northing = northing, zone = 11, hemisphere = "N")$longitude,
      centerpoint_latitude = utm2lonlat(easting = easting, northing = northing, zone = 11, hemisphere = "N")$latitude,
      boundary_sfc = st_sfc(boundary, crs=32611),
      boundary_latlong = st_transform(boundary_sfc, crs=4326)
      
    ) %>%
    select(PlotID, NDVI_max, boundary_latlong, cluster, centerpoint_longitude, centerpoint_latitude)
  
  # convert coordinate list to a SpatVector
  print("Finishing up...")
  prescription_map_vector <- vect(prescription_map, geom = c("centerpoint_longitude", "centerpoint_latitude"), crs="EPSG:4326")
  writeVector(prescription_map_vector, paste0(output_file_path, output_file_name), filetype = "ESRI Shapefile", overwrite = TRUE)
  print(paste0("prescription written to ", output_file_path, output_file_name))
  
  return(TRUE)
}

# example call of this function:
# Rscript prescription_module.R --orthophoto="../../../../../data/odm_orthophoto_updated.tif" --heading=6.5 --maximum_vertices=50000
option_list <- list(
  make_option(c("--orthophoto"), help="stitched drone image filepath, file generated with WebODM", type="character"),
  make_option(c("--heading"), help="in degrees, the heading that the robot will use on the field", type="double", default=0.0),
  make_option(c("--cell_size"), help="in degrees, the heading that the robot will use on the field", type="integer", default=NA),
  make_option(c("--cluster_count"), help="the number of categories of health to divide the map into", type="integer", default=3),
  make_option(c("--smoothing_rounds"), help="the number of time the data gets smoothed. The more smoothing, the larger the data clumps.", type="integer", default=3),
  make_option(c("--smoothing_sigma"), help="the intensity of each round of smoothing. The more smoothing, the larger the data clumps.", type="integer", default=10),
  make_option(c("--maximum_vertices"), help="the maximum number of vertices that the field should contain. Used to calculate the field resolution. Only called when cell_size is NA.", type="integer", default=80000),
  make_option(c("--ndvi_threshold"), help="the threshold to automatically classify a \"healthy\" cell - lower value results in more of the field classified as \"healthy\". Note that cells below this value can still be classified similarly via the bucketing process.", type="double", default=1.0),
  make_option(c("--output_file_path"), help="the file path for the output prescription map (defaults to data folder)", default="../../../../../data/"),
  make_option(c("--output_file_name"), help="the file name for the output prescription map (defaults to timestamp)", default=paste0("prescriptionMap_", format(Sys.time(), "%Y-%m-%d_%H%M%S"), ".shp"))
)

opt_parser <- OptionParser(option_list=option_list)
opt <- parse_args(opt_parser)

success <- generatePrescription(orthophoto = opt$orthophoto, 
                                heading = opt$heading, 
                                cell_size = opt$cell_size, 
                                cluster_count = opt$cluster_count, 
                                smoothing_rounds = opt$smoothing_rounds, 
                                smoothing_sigma = opt$smoothing_sigma,
                                maximum_vertices = opt$maximum_vertices, 
                                ndvi_threshold = opt$ndvi_threshold, 
                                output_file_path = opt$output_file_path, 
                                output_file_name = opt$output_file_name)

# ## FOR TESTING PURPOSES ONLY
#opt$orthophoto <- "../../../../../data/odm_orthophoto_updated.tif"
#success <- generatePrescription("../../../../../data/odm_orthophoto_updated.tif", heading = 0, cluster_count = 4)