import pandas as pd
import geopandas as gpd
from shapely import wkt
from shapely.ops import transform
import os

# --- Configuration ---
PV_JSON_PATH = "data/alkmaar_pv_panels.json"
CSV_PATH = "data/energiedata-match-gemeentecode=[GM0361].csv"
OUTPUT_CSV = "data/building_pv_matches_final.csv"
OUTPUT_EXCEL = "data/building_pv_matches.xlsx"

def flip_coords(geom):
    """Helper to swap (y, x) to (x, y) if needed."""
    return transform(lambda x, y: (y, x), geom)

def match_buildings_to_pv():
    print("Loading data...")
    
    # 1. Load JSON Footprints
    gdf_footprints = gpd.read_file(PV_JSON_PATH)
    
    # NEW: Print total count of JSON features
    print(f"Total features loaded from JSON: {len(gdf_footprints)}")

    # Axis order check (Lon, Lat)
    # Netherlands Longitude is ~4.7, Latitude is ~52.6
    if not gdf_footprints.empty:
        sample_geom = gdf_footprints.geometry.iloc[0]
        sample_x = sample_geom.centroid.x
        if sample_x > 50:
            print("Detected Axis Order (Lat, Lon). Flipping to (Lon, Lat)...")
            gdf_footprints.geometry = gdf_footprints.geometry.map(flip_coords)

    gdf_footprints.set_crs("EPSG:4326", allow_override=True, inplace=True)

    # 2. Load CSV Buildings
    try:
        df_buildings = pd.read_csv(CSV_PATH, sep=';')
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return

    # 3. Parse the 'point' column
    if 'point' in df_buildings.columns:
        df_buildings['geometry'] = df_buildings['point'].apply(
            lambda x: wkt.loads(str(x)) if pd.notna(x) and "POINT" in str(x).upper() else None
        )
        gdf_points = gpd.GeoDataFrame(df_buildings.dropna(subset=['geometry']), crs="EPSG:4326")
    else:
        print("Error: 'point' column not found.")
        return

    # 4. Spatial Join (STRICT VERSION - NO BUFFER)
    print(f"Performing strict spatial join on {len(gdf_points)} building points...")
    
    # 'intersects' used on a raw point vs polygon is a strict Point-in-Polygon check
    matches = gpd.sjoin(gdf_points, gdf_footprints, how="inner", predicate="intersects")

    # 5. Save Outputs
    if not matches.empty:
        # Cleanup: Remove spatial index column
        output_df = pd.DataFrame(matches.drop(columns=['index_right']))
        
        # Keep the original point string as the geometry representation for output
        output_df['geometry'] = output_df['point']

        os.makedirs("data", exist_ok=True)
        output_df.to_csv(OUTPUT_CSV, index=False, sep=';')
        
        try:
            output_df.to_excel(OUTPUT_EXCEL, index=False)
            print(f"Excel saved to: {OUTPUT_EXCEL}")
        except:
            print("Note: Excel save failed (likely missing openpyxl), but CSV was saved.")
        
        print("-" * 30)
        print(f"MATCHING COMPLETE: {len(output_df)} strict matches found.")
        print("-" * 30)
    else:
        print("ZERO MATCHES FOUND with strict settings.")
        print("If you see overlaps on the map, the points may be mathematically just outside the polygon edges.")

if __name__ == "__main__":
    match_buildings_to_pv()