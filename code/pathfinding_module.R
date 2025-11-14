# Prescription Module - determines a waypoint path for the sprayer robot to follow from a prescription map.
# Copyright (C) 2025 Drone-Based Developers

library(FIELDimageR)
library(FIELDimageR.Extra)
library(raster)
library(terra)
library(mapview)
library(sf)
library(stars)
library(dbscan)

detect_edges <- function(cells, row_count, margins = 2) {
  cells$edge <- FALSE
  while (margins > 0) {
    # cells$edge[(as.numeric(cells) - 1) %in% rownames(cells)] <- TRUE
    # numeric row IDs
    ids <- as.numeric(rownames(cells))

    # neighbor rownames as character (since rownames() are always character)
    print("Checking rows...")
    up_names   <- as.character(ids - row_count)
    down_names <- as.character(ids + row_count)
    right_names <- as.character(ids + 1)
    left_names <- as.character(ids - 1)

    # does the neighbor exist?
    print("Checking row existance...")
    up_exists   <- up_names   %in% rownames(cells)
    down_exists <- down_names %in% rownames(cells)
    right_exists <- right_names %in% rownames(cells)
    left_exists <- left_names %in% rownames(cells)

    # get neighbor edge (T/F) values (NA if neighbor doesn't exist)
    print("Checking edge values...")
    up_edge <- cells$edge[match(up_names,   rownames(cells))]
    down_edge <- cells$edge[match(down_names, rownames(cells))]
    right_edge <- cells$edge[match(right_names, rownames(cells))]
    left_edge <- cells$edge[match(left_names, rownames(cells))]

    # final condition:
    # A row is NOT edge only if:
    #   both neighbors exist AND both neighbors have edge = TRUE
    print("Finishing up...")
    cells$edge <- !(
      up_exists & !up_edge &
        down_exists & !down_edge &
        right_exists & !right_edge &
        left_exists & !left_edge
    )
    margins <- margins - 1
  }
  
  return(cells)
  # Check your work
  # library(ggplot2); ggplot(data=edges_map, aes(x=easting, y=northing, color=edge)) + geom_point() + scale_color_manual(values = c("TRUE" = "red", "FALSE" = "blue"))
}

