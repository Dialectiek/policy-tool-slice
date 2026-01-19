import pandas as pd
import geopandas as gpd
import requests

# 1. Load your Energy CSV
csv_file = 'energiedata-match-gemeentecode=[GM0361].csv'
df = pd.read_csv(csv_file, sep=';')
df['pc_join'] = df['postcode'].str.replace(' ', '').str.upper()

# 2. Setup WFS Request (Alkmaar area)
wfs_url = "https://service.pdok.nl/cbs/postcode6/2021/wfs/v1_0"

# Bounding Box helper
def get_coords(pt):
    try:
        c = pt.replace('POINT (', '').replace(')', '').split()
        return float(c[0]), float(c[1])
    except: return None, None

df['lon'], df['lat'] = zip(*df['point'].map(get_coords))
bbox_value = f"{df['lat'].min()},{df['lon'].min()},{df['lat'].max()},{df['lon'].max()},urn:ogc:def:crs:EPSG::4326"

params = {
    "service": "WFS",
    "version": "2.0.0",
    "request": "GetFeature",
    "typeNames": "postcode6:postcode6",
    "outputFormat": "application/json",
    "srsName": "urn:ogc:def:crs:EPSG::4326",
    "bbox": bbox_value
}

print("Fetching polygons and joining with energy data...")

try:
    response = requests.get(wfs_url, params=params)
    response.raise_for_status()
    data = response.json()
    
    # Load polygons into GeoDataFrame
    gdf_polygons = gpd.GeoDataFrame.from_features(data['features'], crs="EPSG:4326")
    
    # Prepare PDOK data for merging
    # We keep 'geometry' and 'postcode6' (the pc6 code)
    gdf_polygons['pc_join'] = gdf_polygons['postcode6'].str.replace(' ', '').str.upper()
    
    # Aggregate your CSV data to PC6 level
    pc6_stats = df.groupby('pc_join').agg({
        'pc6_gemiddelde_woz_waarde_woning': 'mean',
        'p6_gasm3_2023': 'mean',
        'p6_kwh_2023': 'mean'
    }).reset_index()

    # Merge: Result contains Geometry, Postcode6, and Energy data
    final_gdf = gdf_polygons.merge(pc6_stats, on='pc_join', how='inner')
    
    # Final cleanup: drop the temporary join column
    final_gdf = final_gdf.drop(columns=['pc_join'])

    # Save to local GeoJSON
    output_name = "alkmaar_energy_map.geojson"
    final_gdf.to_file(output_name, driver='GeoJSON')
    
    print(f"Success! Created {output_name}")
    print(f"Each record now contains: {final_gdf.columns.tolist()}")

    # --- ADD THIS DIAGNOSTIC BLOCK ---
    csv_pc_count = df['pc_join'].nunique()
    wfs_pc_count = gdf_polygons['pc_join'].nunique()
    final_pc_count = len(final_gdf)
    
    print(f"\n--- DATA ANALYSIS ---")
    print(f"Unique PC6 in CSV:          {csv_pc_count}")
    print(f"Polygons fetched from PDOK: {wfs_pc_count}")
    print(f"Postcodes in final map:     {final_pc_count}")
    
    if wfs_pc_count == 1000:
        print("WARNING: You hit the PDOK 1,000 feature limit. Data is truncated.")
    
    missing_in_wfs = set(df['pc_join'].unique()) - set(gdf_polygons['pc_join'].unique())
    if missing_in_wfs:
        print(f"Sample of CSV postcodes missing from PDOK: {list(missing_in_wfs)[:5]}")
    # ---------------------------------

except Exception as e:
    print(f"Error: {e}")