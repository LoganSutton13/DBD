# To use the prescription module, Rscript must be installed.


## Parameters:

- Orthophoto: path to the stitched drone image filepath, file generated with WebODM

- Boundary: path to the shapefile of the field's boundary. The orthophoto will crop to this.

- cell\_size: the size of each cell in meters. If no value provided, the system will auto-calculate based on maximum\_vertices.

- cluster\_count: the number of categories of health to divide the map into.

- smoothing\_rounds: the number of times the data gets smoothed. The more smoothing, the larger the data clumps.

- smoothing\_sigma: the intensity of each round of smoothing. The more smoothing, the larger the data clumps.

- maximum\_vertices: the maximum number of vertices that the field should contain. Used to calculate the field resolution. Only called when cell\_size is NA.

- ndvi\_threshold: the threshold to automatically classify a "healthy" cell - lower value results in more of the field classified as "healthy". Note that cells below this value can still be classified similarly via the bucketing process.

- output\_file\_path: the file path for the output prescription map (defaults to data folder).

- output\_file\_name: the file name for the output prescription map (defaults to timestamp).





## Example call of this function:

`Rscript prescription\_module.R --orthophoto="../../../../../data/odm\_orthophoto\_updated.tif" --boundary="../../../../../data/boundaries.shp" --maximum\_vertices=50000`

