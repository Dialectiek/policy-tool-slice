## Repository Structure

- data_download.py  
  Downloads the required raw datasets

- merge_all_gm_csvs.py  
  Merges all GM-level CSV files into a single dataset

- csv_inspection.py  
  Optional script for inspecting raw or merged data

- Dutch_load_analysis.ipynb  
  Main notebook containing data processing and regression analysis

---

## How to run

Execute the full pipeline in order:

1. python data_download.py
2. python merge_all_gm_csvs.py
3. jupyter notebook Dutch_load_analysis.ipynb