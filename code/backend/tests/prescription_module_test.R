library(testthat)
source("../app/services/field_map_generator/fieldShapeModified.R")
source("../app/services/field_map_generator/prescription_module.R")

test_that("generatePrescription runs successfully with valid inputs", {
  result <- generatePrescription(
    orthophoto = "test_images/EX1_5band-compress.tif",
    cell_size = NA,
    cluster_count = 3,
    smoothing_rounds = 3,
    smoothing_sigma = 10,
    maximum_vertices = 50000,
    ndvi_threshold = 0.5,
    output_file_path = tempdir(),
    output_file_name = "test_output.shp",
    band_order = c(1,2,5,4),
    utm_zone = 16
  )
  
  expect_true(result)
  expect_true(file.exists(file.path(tempdir(), "test_output.shp")))
})

test_that("generatePrescription errors when orthophoto is NULL", {
  expect_error(
    generatePrescription(
      orthophoto = NULL,
      cell_size = NA,
      cluster_count = 3,
      smoothing_rounds = 3,
      smoothing_sigma = 10,
      maximum_vertices = 50000,
      ndvi_threshold = 0.5,
      output_file_path = tempdir(),
      output_file_name = "test_output.shp",
      utm_zone = 11
    ),
    "Please provide a valid file path"
  )
})

test_that("generatePrescription runs correctly even when given cell_size and maximum_vertices", {
    result <- generatePrescription(
      orthophoto = "test_images/EX1_5band-compress.tif",
      cell_size = 1,
      cluster_count = 3,
      smoothing_rounds = 3,
      smoothing_sigma = 10,
      maximum_vertices = 50000,
      ndvi_threshold = 0.5,
      output_file_path = tempdir(),
      output_file_name = "test_output.shp",
      band_order = c(1,2,5,4),
      utm_zone = 16
    )
    
    expect_true(result)
    expect_true(file.exists(file.path(tempdir(), "test_output.shp")))
})





