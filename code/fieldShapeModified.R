# This file is part of DBD.
#
# Based on source code from FIELDimageR
# Copyright (C) 2024 OpenDroneMap
# Licensed under the GNU General Public License, version 2 (GPL-2.0)
#
# Modifications:
# Copyright (C) 2025 Drone-Based Developers
#
# Description of changes:
# - fieldShape function reworked such that no human input is required
#   in obtaining the field boundaries.
#
# This program is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation; either version 2 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, see <https://www.gnu.org/licenses/>.


require(dplyr)
require(oce)

# Automatically finds the bounds of the field and outputs a grid from there. Modified code from FIELDimageR.Extra::fieldShape_render
fieldShapeAuto <- function (mosaic, ncols, nrows, fieldData = NULL, fieldMap = NULL, heading = NA,
          PlotID = NULL, buffer = NULL, plot_size = NULL, r = 1, g = 2, 
          b = 3, color_options = viridisLite::viridis, max_pixels = 1e+08, 
          downsample = 5) 
{
  print("Starting analysis ...")
  if (is.null(mosaic)) {
    stop("The input 'mosaic' object is NULL.")
  }
  if (class(mosaic) %in% c("RasterStack", "RasterLayer", "RasterBrick")) {
    mosaic <- terra::rast(mosaic)
  }
  pixels <- prod(dim(mosaic))
  if (pixels > max_pixels) {
    print("Your 'mosaic' is too large and downsampling is being applied.")
  }
  if (pixels < max_pixels) {
    stars_object <- mosaic
    if (!inherits(stars_object, "stars")) {
      stars_object <- st_as_stars(mosaic)
      if (!st_is_longlat(stars_object) && nlyr(mosaic) > 
          2) {
        stars_object <- st_warp(stars_object, crs = 4326)
      }
    }
  }
  else {
    stars_object <- mosaic
    if (!inherits(stars_object, "stars")) {
      stars_object <- st_as_stars(mosaic, proxy = TRUE)
    }
  }
  
  print(paste("Number of rows: ", nrows))
  print(paste("Number of columns: ", ncols))
  
  if (is.na(heading)) {
    # obtain the bounds of the SpatRaster and place it within the expected variable
    corner_nw <- utm2lonlat(easting = xmin(mosaic), northing = ymax(mosaic), zone = 11, hemisphere = "N")
    corner_ne <- utm2lonlat(easting = xmax(mosaic), northing = ymax(mosaic), zone = 11, hemisphere = "N")
    corner_sw <- utm2lonlat(easting = xmin(mosaic), northing = ymin(mosaic), zone = 11, hemisphere = "N")
    corner_se <- utm2lonlat(easting = xmax(mosaic), northing = ymin(mosaic), zone = 11, hemisphere = "N")
  }
  else {
    # TODO: implement custom headings for grid alignment
  }
  four_point <- NA
  four_point$finished <- NA
  four_point$finished$geometry = st_sfc(st_point(c(corner_nw$longitude, corner_nw$latitude)), 
                 st_point(c(corner_ne$longitude, corner_ne$latitude)), 
                 st_point(c(corner_se$longitude, corner_se$latitude)),
                 st_point(c(corner_sw$longitude, corner_sw$latitude))) %>%
    st_set_crs(4326)
  # four_point$finished = c(corner_nw, corner_ne, corner_sw, corner_se)
  # four_point$finished$geometry = c(corner_nw, corner_ne, corner_sw, corner_se)
  print(four_point$finished$geometry)
  if (length(four_point$finished$geometry) == 4) {
    grids <- st_make_grid(four_point$finished$geometry, 
                          n = c(ncols, nrows)) %>% st_transform(st_crs(mosaic))
    point_shp <- st_cast(st_make_grid(four_point$finished$geometry, 
                                      n = c(1, 1)), "POINT")
    sourcexy <- rev(point_shp[1:4]) %>% st_transform(st_crs(mosaic))
    Targetxy <- four_point$finished$geometry %>% st_transform(st_crs(mosaic))
    controlpoints <- as.data.frame(cbind(st_coordinates(sourcexy), 
                                         st_coordinates(Targetxy)))
    linMod <- lm(formula = cbind(controlpoints[, 3], controlpoints[, 
                                                                   4]) ~ controlpoints[, 1] + controlpoints[, 2], data = controlpoints)
    parameters <- matrix(linMod$coefficients[2:3, ], ncol = 2)
    intercept <- matrix(linMod$coefficients[1, ], ncol = 2)
    geometry <- grids * parameters + intercept
    grid_shapefile <- st_sf(geometry, crs = st_crs(mosaic)) %>% 
      mutate(ID = seq(1:length(geometry)))
    rect_around_point <- function(x, xsize, ysize) {
      bbox <- st_bbox(x)
      bbox <- bbox + c(xsize/2, ysize/2, -xsize/2, -ysize/2)
      return(st_as_sfc(st_bbox(bbox)))
    }
    if (!is.null(plot_size)) {
      if (length(plot_size) == 1) {
        cat("\033[1;31mError:\033[0m Please provide x and y distance. e.g., plot_size=c(0.5,2.5)\n")
      }
      else {
        if (st_is_longlat(grid_shapefile)) {
          grid_shapefile <- st_transform(grid_shapefile, 
                                         crs = 3857)
          cen <- suppressWarnings(st_centroid(grid_shapefile))
          bbox_list <- lapply(st_geometry(cen), st_bbox)
          points_list <- lapply(bbox_list, st_as_sfc)
          rectangles <- lapply(points_list, function(pt) rect_around_point(pt, 
                                                                           plot_size[1], plot_size[2]))
          points <- rectangles[[1]]
          for (i in 2:length(rectangles)) {
            points <- c(points, rectangles[[i]])
          }
          st_crs(points) <- st_crs(cen)
          grid <- st_as_sf(points)
          grid <- st_transform(grid, st_crs("EPSG:4326"))
          b <- st_transform(grid_shapefile, crs = 4326)
          rot = function(x) matrix(c(cos(x), sin(x), 
                                     -sin(x), cos(x)), 2, 2)
          extcoords1 <- st_coordinates(st_geometry(b))
          pair <- st_sfc(st_point(c(extcoords1[, 1][1], 
                                    extcoords1[, 2][1])), st_point(c(extcoords1[, 
                                                                                1][4], extcoords1[, 2][4])), crs = 4326)
          rotRad <- as.numeric(st_geod_azimuth(pair))
          ga = st_geometry(grid)
          cga = st_centroid(ga)
          grid_shapefile = (ga - cga) * rot(rotRad) + 
            cga
          st_crs(grid_shapefile) <- st_crs(mosaic)
        }
        else {
          cen <- suppressWarnings(st_centroid(grid_shapefile))
          bbox_list <- lapply(st_geometry(cen), st_bbox)
          points_list <- lapply(bbox_list, st_as_sfc)
          rectangles <- lapply(points_list, function(pt) rect_around_point(pt, 
                                                                           plot_size[1], plot_size[2]))
          points <- rectangles[[1]]
          for (i in 2:length(rectangles)) {
            points <- c(points, rectangles[[i]])
          }
          st_crs(points) <- st_crs(cen)
          grid <- st_as_sf(points)
          st_crs(grid) <- st_crs(mosaic)
          a <- st_transform(grid, crs = 4326)
          b <- st_transform(grid_shapefile, crs = 4326)
          rot = function(x) matrix(c(cos(x), sin(x), 
                                     -sin(x), cos(x)), 2, 2)
          extcoords1 <- st_coordinates(st_geometry(b))
          pair <- st_sfc(st_point(c(extcoords1[, 1][1], 
                                    extcoords1[, 2][1])), st_point(c(extcoords1[, 
                                                                                1][4], extcoords1[, 2][4])), crs = 4326)
          rotRad <- as.numeric(st_geod_azimuth(pair))
          ga = st_geometry(grid)
          cga = st_centroid(ga)
          grid_shapefile = (ga - cga) * rot(rotRad) + 
            cga
          st_crs(grid_shapefile) <- st_crs(mosaic)
        }
      }
    }
    if (!is.null(buffer)) {
      if (st_is_longlat(grid_shapefile)) {
        grid_shapefile <- st_transform(grid_shapefile, 
                                       crs = 3857)
        grid_shapefile <- st_buffer(grid_shapefile, 
                                    dist = buffer)
        grid_shapefile <- st_transform(grid_shapefile, 
                                       st_crs(mosaic))
      }
      else {
        grid_shapefile <- st_buffer(grid_shapefile, 
                                    dist = buffer)
        grid_shapefile <- st_transform(grid_shapefile, 
                                       st_crs(mosaic))
      }
    }
    if (!is.null(plot_size)) {
      grid_shapefile <- st_as_sf(grid_shapefile)
    }
    grid_shapefile$PlotID <- seq(1, dim(grid_shapefile)[1])
    print("Almost there ...")
    if (!is.null(fieldMap)) {
      id <- NULL
      for (i in dim(fieldMap)[1]:1) {
        id <- c(id, fieldMap[i, ])
      }
      grid_shapefile$PlotID <- as.character(id)
    }
    if (!is.null(fieldData)) {
      if (is.null(fieldMap)) {
        cat("\033[31m", "Error: fieldMap is necessary", 
            "\033[0m", "\n")
      }
      fieldData <- as.data.frame(fieldData)
      fieldData$PlotID <- as.character(fieldData[, colnames(fieldData) %in% 
                                                   c(PlotID)])
      plots <- merge(grid_shapefile, fieldData, by = "PlotID")
    }
    else {
      if (!is.null(grid_shapefile)) {
        plots <- grid_shapefile
      }
    }
    print("End!")
    return(plots)
  }
  else {
    cat("\033[31m", "Error: Select four points only. Points must be set at the corners of the field of interest under the plots space", 
        "\033[0m", "\n")
  }
}
