# Convert CBS Excel → CSV (run once)
import pandas as pd
import numpy as np 

xlsx_path = r"C:\Users\kosta\Desktop\Thesis\policy-tool-slice\Dutch_load_analysis\v2_structural_social_economic\2025-cbs_pc6_2023_v2\pc6_2023_v2_EN.xlsx"

csv_path = r"C:\Users\kosta\Desktop\Thesis\policy-tool-slice\Dutch_load_analysis\v2_structural_social_economic\2025-cbs_pc6_2023_v2\pc6_2023_v2_EN.csv"

df_temp = pd.read_excel(
    xlsx_path,
    header=8  # keep correct header row
)

df_temp.to_csv(csv_path, index=False)

print("Conversion completed:")
print(csv_path)