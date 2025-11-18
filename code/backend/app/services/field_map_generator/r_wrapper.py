"""
Python wrapper for running R scripts, specifically fieldShapeAuto
"""

import subprocess
import logging
from pathlib import Path
from typing import Optional, Dict, Any
import asyncio
import argparse
import sys

logger = logging.getLogger(__name__)


class RScriptRunner:
    """Wrapper class for executing R scripts from Python"""
    
    def __init__(self, rscript_path: Optional[str] = None):
        """
        Initialize R script runner
        
        Args:
            rscript_path: Path to Rscript executable. If None, uses 'Rscript' from PATH
        """
        self.rscript_path = rscript_path or "Rscript"
        self._verify_r_installation()
    
    def _verify_r_installation(self):
        """Verify that R is installed and accessible"""
        try:
            verify_result = subprocess.run(
                [self.rscript_path, "--version"],
                capture_output=True,
                text=True,
                timeout=5,
                check=False
            )
            if verify_result.returncode != 0:
                raise RuntimeError(f"Rscript not found or not working: {verify_result.stderr}")
            logger.info("R installation verified: %s", verify_result.stdout.strip())
        except FileNotFoundError as exc:
            raise RuntimeError(
                "Rscript not found. Please install R and ensure 'Rscript' is in your PATH, "
                "or provide the full path to Rscript."
            ) from exc
        except subprocess.TimeoutExpired as exc:
            raise RuntimeError("Rscript command timed out") from exc
    
    def run_r_script(
        self,
        script_path: str,
        args: Optional[list] = None,
        cwd: Optional[str] = None,
        timeout: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Execute an R script and return the result
        
        Args:
            script_path: Path to the R script file
            args: List of command-line arguments to pass to the script
            cwd: Working directory for the script execution
            timeout: Maximum execution time in seconds (None = no timeout)
            
        Returns:
            Dictionary with 'success', 'stdout', 'stderr', and 'returncode'
        """
        script_path = Path(script_path)
        if not script_path.exists():
            raise FileNotFoundError(f"R script not found: {script_path}")
        
        cmd = [self.rscript_path, str(script_path)]
        if args:
            cmd.extend([str(arg) for arg in args])
        
        logger.info("Executing R script: %s", ' '.join(cmd))
        
        try:
            run_result = subprocess.run(
                cmd,
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=timeout,
                check=False
            )
            
            return {
                "success": run_result.returncode == 0,
                "stdout": run_result.stdout,
                "stderr": run_result.stderr,
                "returncode": run_result.returncode
            }
        except subprocess.TimeoutExpired:
            logger.error("R script execution timed out after %s seconds", timeout)
            return {
                "success": False,
                "stdout": "",
                "stderr": f"Script execution timed out after {timeout} seconds",
                "returncode": -1
            }
        except (OSError, ValueError) as e:
            logger.error("Error executing R script: %s", e)
            return {
                "success": False,
                "stdout": "",
                "stderr": str(e),
                "returncode": -1
            }


async def run_field_shape_auto(
    mosaic_path: str,
    output_dir: str,
    nir_band: int = 4,
    red_band: int = 1,
    heading: float = 0.0,
    geojson_filename: str = "field_ndvi.geojson",
    rscript_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Run fieldShapeAuto R function on a mosaic file
    
    Args:
        mosaic_path: Path to the multispectral raster file (GeoTIFF)
        output_dir: Directory where GeoJSON output will be saved
        nir_band: NIR band index (default: 4)
        red_band: Red band index (default: 1)
        heading: Field heading in degrees (default: 0.0)
        geojson_filename: Name of the output GeoJSON file (default: "field_ndvi.geojson")
        rscript_path: Path to Rscript executable (optional)
        
    Returns:
        Dictionary with execution results and output file path
    """
    # Get the directory containing this file
    script_dir = Path(__file__).parent
    r_script_path = script_dir / "fieldShapeModified.R"
    
    if not r_script_path.exists():
        raise FileNotFoundError(f"R script not found: {r_script_path}")
    
    # Validate input file exists
    mosaic_path_obj = Path(mosaic_path)
    if not mosaic_path_obj.exists():
        raise FileNotFoundError(f"Mosaic file not found: {mosaic_path}")
    
    # Ensure output directory exists
    output_dir_obj = Path(output_dir)
    output_dir_obj.mkdir(parents=True, exist_ok=True)
    output_path = output_dir_obj / geojson_filename
    
    # Prepare command-line arguments for R script
    # Arguments: <tif_file_path> [output_geojson_path] [nir_band] [red_band] [heading]
    args = [
        str(mosaic_path_obj.resolve()),
        str(output_path.resolve()),
        str(nir_band),
        str(red_band),
        str(heading)
    ]
    
    # Run the R script directly with arguments
    runner = RScriptRunner(rscript_path=rscript_path)
    run_result = runner.run_r_script(
        str(r_script_path),
        args=args,
        cwd=str(script_dir),
        timeout=600  # 10 minute timeout
    )
    
    # Check if output file was created
    output_exists = output_path.exists()
    
    return {
        "success": run_result["success"] and output_exists,
        "stdout": run_result["stdout"],
        "stderr": run_result["stderr"],
        "returncode": run_result["returncode"],
        "output_file": str(output_path) if output_exists else None,
        "error": None if (run_result["success"] and output_exists) else (
            "R script failed" if not run_result["success"] else "Output file not created"
        )
    }





def main() -> int:
    """Simple CLI so you can edit the mosaic and output paths and run the function."""
    INPUT = Path(__file__).parent / "example_images" / "odm_orthophoto.tif"
    OUTPUT = Path(__file__).parent / "output"

    try:
        result = asyncio.run(
            run_field_shape_auto(
                mosaic_path= str(INPUT),
                output_dir= str(OUTPUT),
            )
        )
    except Exception as e:
        print(f"Error running field shape: {e}")
        return 2

    if result.get("success"):
        print("Success:\nOutput file:", result.get("output_file"))
        if result.get("stdout"):
            print("R stdout:\n", result.get("stdout"))
        return 0
    else:
        print("Failure:\n", result.get("error"))
        if result.get("stderr"):
            print("R stderr:\n", result.get("stderr"))
        return 1


if __name__ == "__main__":
    sys.exit(main())



