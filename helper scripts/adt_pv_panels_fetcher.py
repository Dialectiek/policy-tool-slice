import requests
import json
import os
from pyproj import Transformer
from shapely.geometry import shape, mapping
from shapely.ops import transform

# --- Configuration ---
WFS_URL = "https://datalab.alkmaar.nl/geoserver/Alkmaar/ows"
BASIS_LAYER = "Alkmaar:Zonnepanelen"
# Single output file containing geometry and pc6 data
OUTPUT_FILE = "data/alkmaar_pv_panels.json"

# Ensure directory exists
os.makedirs("data", exist_ok=True)

# Setup Transformer: RD New (28992) to WGS84 (4326) for Leaflet compatibility
project = Transformer.from_crs("EPSG:28992", "EPSG:4326", always_xy=True).transform

def fetch_and_save_data():
    params = {
        "service": "WFS",
        "version": "2.0.0",
        "request": "GetFeature",
        "typeName": BASIS_LAYER,
        "outputFormat": "application/json",
    }

    print(f"Fetching data from {WFS_URL}...")
    
    try:
        response = requests.get(WFS_URL, params=params)
        response.raise_for_status()
        data = response.json()

        print("Transforming geometries to EPSG:4326...")
        for feature in data.get("features", []):
            if feature.get("geometry"):
                # Convert dict to shapely object
                geom = shape(feature["geometry"])
                # Project coordinates
                projected_geom = transform(project, geom)
                # Convert back to dict for JSON saving
                feature["geometry"] = mapping(projected_geom)

        # Save the final transformed data (Geometry + PC6 included)
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4)
            
        print(f"Done! Data saved to {OUTPUT_FILE}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    fetch_and_save_data()