"""
Python port of your R FIELDimageR workflow.

Dependencies (install with pip):
pip install rasterio rioxarray xarray geopandas shapely rasterstats scikit-learn numpy matplotlib pyproj

Notes:
- Adjust `unit_size_m` to change plot cell size (4.572 m = 15 ft).
- The soil masking is a simple HSV/HUE-based heuristic; tweak hue thresholds for your images.
"""
import os
import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import Affine
import rioxarray as rxrt
import xarray as xr
import geopandas as gpd
from shapely.geometry import box, Point
from shapely.affinity import rotate as shapely_rotate
from rasterstats import zonal_stats
from sklearn.cluster import DBSCAN
from pyproj import Transformer
import matplotlib.colors as mcolors
import pandas as pd

# ------------ Helper functions ------------
def load_raster(tif_path, downsample_factor=None):
    """Load raster as xarray DataArray via rioxarray. Bands are first dimension (1..N)."""
    da = rxrt.open_rasterio(tif_path, masked=True).squeeze()  # dims: band, y, x
    if downsample_factor and downsample_factor > 1:
        # simple resample (nearest)
        new_shape = (da.sizes["band"], da.sizes["y"] // downsample_factor, da.sizes["x"] // downsample_factor)
        da = da.coarsen(y=downsample_factor, x=downsample_factor, boundary="trim").mean()
    return da


def rotate_raster_transform(transform, width, height, heading_deg, center=None):
    """
    Create a rotated affine transform around image center by heading_deg (clockwise degrees).
    Note: rasterio affine uses x-scale, rotate, translation; we compute a new transform.
    This function returns a new transform; actual pixel data rotation would require reproject/resampling.
    For visualization / polygon transforms we apply rotation to geometries instead.
    """
    # This function is a utility placeholder — for full raster rotation, reprojecting/resampling is required.
    return transform  # We'll rotate polygons instead of reprojecting the raster data.


def rgb_to_hue_mask(r, g, b, crop_value=0.0, crop_above=True):
    """
    Convert RGB bands to HSV, return soil mask based on hue.
    """
    # Flatten all channels to Nx3
    flat = np.stack([r.flatten(), g.flatten(), b.flatten()], axis=1).astype(np.float32)

    # Normalize to [0,1] for matplotlib
    max_val = flat.max()
    if max_val > 1.0:
        flat /= max_val

    # RGB→HSV
    hsv = mcolors.rgb_to_hsv(flat)

    hue = hsv[:, 0]  # extract hue channel

    # Mask threshold
    if crop_above:
        mask = (hue > crop_value)
    else:
        mask = (hue < crop_value)

    # Reshape back to raster
    return mask.reshape(r.shape)



def create_regular_grid(bounds, cell_size, crs):
    """Create GeoDataFrame of square cells covering bounds.
       bounds = (minx, miny, maxx, maxy) in CRS units (meters for projected CRS).
    """
    minx, miny, maxx, maxy = bounds
    ncols = int(np.ceil((maxx - minx) / cell_size))
    nrows = int(np.ceil((maxy - miny) / cell_size))
    polys = []
    ids = []
    for r in range(nrows):
        for c in range(ncols):
            x0 = minx + c * cell_size
            x1 = x0 + cell_size
            y1 = maxy - r * cell_size
            y0 = y1 - cell_size
            polys.append(box(x0, y0, x1, y1))
            ids.append(r * ncols + c + 1)
    gdf = gpd.GeoDataFrame({"PlotID": ids}, geometry=polys, crs=crs)
    return gdf, nrows, ncols


def extract_zonal_stats(geom_gdf, raster_ndarray, transform, stats=["max", "mean"], nodata=np.nan):
    """Use rasterstats.zonal_stats with a numpy array (ndarray 2D) and affine transform"""
    zs = zonal_stats(geom_gdf, raster_ndarray, affine=transform, stats=stats, nodata=nodata)
    # return list of dicts
    return zs


# ------------ Main workflow ------------
def main(
    tif_path="C:\\Users\\fastw\\OneDrive\\Documents\\repos\\DroneBasedDevelopment\\code\\backend\\app\\services\\field_map_generator\\example_images\\odm_orthophoto.tif",
    output_geojson="field_ndvi_python.geojson",
    output_csv="NDVI_Test-Field_py.csv",
    nir_band=5,
    red_band=1,
    rededge_band=4,
    heading_deg=45.0,
    unit_size_m=4.572,
    soil_hue_threshold=0.08,   # tweak for your dataset
    soil_crop_above=True,
    dbscan_eps=6.0,
    dbscan_min_samples=4
):
    # 1) load raster (multispectral), as xarray DataArray with dims (band, y, x)
    print("Loading raster:", tif_path)
    da = load_raster(tif_path)
    # ensure band indexing is [1..N] to match R indexing
    n_bands = da.sizes["band"]
    print("Bands:", n_bands)
    if max(nir_band, red_band, rededge_band) > n_bands:
        raise ValueError("Requested band index > available bands in raster")

    # 2) optionally rotate (we will rotate polygons / grid rather than resample raster for simplicity)
    # Get raster bounds and transform (in raster CRS)
    rio = rasterio.open(tif_path)
    transform = rio.transform
    raster_crs = rio.crs
    height = rio.height; width = rio.width
    minx, miny, maxx, maxy = rio.bounds
    print("Raster CRS:", raster_crs)
    print("Bounds:", (minx, miny, maxx, maxy))

    # 3) Soil masking (HUE) using RGB bands (assume bands 1,2,3 are R,G,B)
    print("Computing soil mask (HUE) ...")
    r = da.sel(band=1).values
    g = da.sel(band=2).values
    b = da.sel(band=3).values
    soil_mask = rgb_to_hue_mask(r, g, b, crop_value=soil_hue_threshold, crop_above=soil_crop_above)
    # soil_mask True means "keep" (non-soil) according to crop_above
    # Create masked arrays for NDVI calculations by applying soil_mask
    # 4) Compute NDVI and NDRE
    print("Computing NDVI and NDRE ...")
    nir = da.sel(band=nir_band).values.astype("float32")
    red = da.sel(band=red_band).values.astype("float32")
    rededge = da.sel(band=rededge_band).values.astype("float32")
    eps = 1e-6
    ndvi = (nir - red) / (nir + red + eps)
    ndre = (nir - rededge) / (nir + rededge + eps)
    # Apply soil mask -> set masked pixels to nan
    ndvi_masked = np.where(soil_mask, ndvi, np.nan)
    ndre_masked = np.where(soil_mask, ndre, np.nan)

    # 5) Build grid covering the raster extent (we build in raster CRS)
    print("Building grid with cell size", unit_size_m, "m")
    # Ensure raster CRS is projected (meters). If it's geographic (lon/lat), you may want to transform to EPSG:3857 first.
    # For simplicity, we assume your raster CRS is projected (e.g., UTM).
    gdf_grid, nrows, ncols = create_regular_grid((minx, miny, maxx, maxy), unit_size_m, raster_crs)
    print("Grid size rows,cols:", nrows, ncols, "cells:", len(gdf_grid))

    # 6) Optionally rotate grid geometry around grid centroid by heading_deg (clockwise)
    #if heading_deg is not None and abs(heading_deg) > 0.001:
        #print("Rotating grid polygons by", heading_deg, "degrees")
        #centroid = gdf_grid.unary_union.centroid
        # shapely.rotate uses degrees CCW by default, so convert clockwise->ccw by negative angle
        #gdf_grid["geometry"] = gdf_grid.geometry.apply(lambda geom: shapely_rotate(geom, -heading_deg, origin=centroid))
        #gdf_grid.set_crs(raster_crs, inplace=True)

    # 7) Extract per-plot maximum NDVI (like fieldInfo_extra with fun='max')
    print("Extracting zonal max NDVI per plot (this may take a while) ...")
    # rasterstats expects a 2D numpy array with (rows, cols) matching geotransform
    # Our 'ndvi_masked' shape matches rasterio array indexing: [y, x]
    # rasterstats expects the array in the same orientation; affine=transform is used.
    stats = zonal_stats(gdf_grid, ndvi_masked, affine=transform, stats=["max", "mean"], nodata=np.nan)
    gdf_grid["NDVI_max"] = [s["max"] if s["max"] is not None else np.nan for s in stats]
    gdf_grid["NDVI_mean"] = [s["mean"] if s["mean"] is not None else np.nan for s in stats]

    # drop empty / nan rows as your R script used na.omit()
    gdf_nonan = gdf_grid.dropna(subset=["NDVI_max"]).copy()
    print("Plots with NDVI:", len(gdf_nonan))

    # 8) Create CSV with PlotID, NDVI_max, lat/lon (transform easting/northing => lon/lat via pyproj)
    print("Generating CSV with lat/lon ...")
    # centroid easting/northing
    gdf_nonan["centroid"] = gdf_nonan.centroid
    gdf_nonan["easting"] = gdf_nonan.centroid.x
    gdf_nonan["northing"] = gdf_nonan.centroid.y
    # transform to lon/lat (EPSG:4326)
    transformer = Transformer.from_crs(raster_crs, "EPSG:4326", always_xy=True)
    lonlat = [transformer.transform(x, y) for x, y in zip(gdf_nonan.easting, gdf_nonan.northing)]
    print(lonlat[:5])  # print first 5 for sanity check
    gdf_nonan["longitude"] = [p[0] for p in lonlat]
    gdf_nonan["latitude"] = [p[1] for p in lonlat]
    csv_df = gdf_nonan[["PlotID", "NDVI_max", "latitude", "longitude"]].copy()
    csv_df.to_csv(output_csv, index=False)
    print("Wrote CSV:", output_csv)

    # 9) Run DBSCAN in 3D (NDVI_max * scale, easting, northing)
    print("Running DBSCAN clustering ...")
    # R code multiplied NDVI by 10 to increase scale in 3D; we replicate that
    X = np.vstack([
        (gdf_nonan["NDVI_max"].fillna(0).values * 10),
        gdf_nonan["easting"].values,
        gdf_nonan["northing"].values
    ]).T
    db = DBSCAN(eps=dbscan_eps, min_samples=dbscan_min_samples).fit(X)
    gdf_nonan["cluster"] = db.labels_
    print("DBSCAN cluster counts:\n", pd.Series(db.labels_).value_counts())

    # 10) Export GeoJSON with NDVI and ID fields (like your earlier export)
    print("Exporting GeoJSON:", output_geojson)
    out_gdf = gdf_nonan[["PlotID", "NDVI_max", "NDVI_mean", "cluster", "geometry"]].copy()
    # ensure PlotID is string like in R export
    out_gdf["id"] = out_gdf["PlotID"].astype(str)
    # Transform geometry from UTM to lat/lon (EPSG:4326) for GeoJSON export
    out_gdf = out_gdf.to_crs("EPSG:4326")
    out_gdf.to_file(output_geojson, driver="GeoJSON")
    print("GeoJSON saved.")

    # 11) Build adjacency edges matrix for prescription mapping
    # We will reconstruct grid indices (row/col) from PlotID ordering: we used row-major numbering earlier: id = r*ncols + c +1
    print("Building adjacency list for grid neighbors ...")
    # create mapping PlotID -> index into the nonan df (since some cells were dropped)
    # But R code built edges on the full NDVIData rownames (which matched grid cell indices)
    # We'll create adjacency on the full grid (including NaNs) then filter by those present in NDVIData if desired.
    total_cells = nrows * ncols
    # neighbor offsets (up, down, left, right)
    def index_to_rc(idx):
        i = idx - 1
        r = i // ncols
        c = i % ncols
        return r, c
    def rc_to_index(r, c):
        return r * ncols + c + 1

    edges = []
    for idx in range(1, total_cells + 1):
        r, c = index_to_rc(idx)
        # left/right
        if c - 1 >= 0:
            edges.append((idx, rc_to_index(r, c - 1)))
        if c + 1 < ncols:
            edges.append((idx, rc_to_index(r, c + 1)))
        # up/down
        if r - 1 >= 0:
            edges.append((idx, rc_to_index(r - 1, c)))
        if r + 1 < nrows:
            edges.append((idx, rc_to_index(r + 1, c)))
    # convert to DataFrame
    edges_df = pd.DataFrame(edges, columns=["from", "to"])
    print("Edges count:", len(edges_df))

    # If you want to restrict to only cells that had NDVI data (like R code that used rownames(NDVIData)):
    valid_ids = set(gdf_nonan["PlotID"].astype(int).tolist())
    edges_filtered = edges_df[edges_df["from"].isin(valid_ids) & edges_df["to"].isin(valid_ids)].reset_index(drop=True)
    print("Filtered edges count (only plots with NDVI):", len(edges_filtered))

    # Return useful objects
    return {
        "grid_gdf": gdf_grid,
        "nonan_gdf": gdf_nonan,
        "dbscan": db,
        "edges": edges_filtered,
        "ndvi_array": ndvi_masked,
        "ndre_array": ndre_masked
    }


if __name__ == "__main__":
    res = main()
