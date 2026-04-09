from pathlib import Path
import pandas as pd

# Folder where your GM CSV files are located
IN_DIR = Path(r"C:\Users\kosta\Desktop\Thesis\policy-tool-slice\Alkmaar_load_profiles\dook_vng_data\dook_vng_gemeenten_csv")

# Output Netherlands file (same folder)
OUT_FILE = IN_DIR / "energiedata-match-gemeentecode_NL.csv"

csv_files = sorted(IN_DIR.glob("energiedata-match-gemeentecode=GM*.csv"))
print("Number of GM files found:", len(csv_files))
if not csv_files:
    raise FileNotFoundError(f"No GM CSV files found in: {IN_DIR}")

# Hardcoded because we verified it: the files are semicolon-separated
SEP = ";"

# Lock schema from first file
base_cols = pd.read_csv(csv_files[0], sep=SEP, nrows=0, engine="python").columns.tolist()
print("Number of columns:", len(base_cols))
print("First 10 columns:", base_cols[:10])

first_write = True
rows_written = 0

for f in csv_files:
    print("Processing:", f.name)

    for chunk in pd.read_csv(
        f,
        sep=SEP,
        chunksize=200_000,
        dtype=str,
        engine="python",
        on_bad_lines="error",  # strict: never silently drop lines
    ):
        if chunk.columns.tolist() != base_cols:
            raise ValueError(f"Column mismatch in {f.name}")

        chunk.to_csv(
            OUT_FILE,
            index=False,
            mode="w" if first_write else "a",
            header=first_write,
            sep=SEP,
        )

        rows_written += len(chunk)
        first_write = False

print("Done.")
print("Merged file:", OUT_FILE)
print("Total rows written:", rows_written)