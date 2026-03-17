import pandas as pd

# =====================================================
# CONFIG
# =====================================================

file_path = r"C:\Users\kosta\Desktop\Thesis\policy-tool-slice\Alkmaar_load_profiles\dook_vng_data\dook_vng_gemeenten_csv\energiedata-match-gemeentecode_NL.csv"
sep = ";"

# =====================================================
# PRINT HEADER + FIRST DATA ROW
# =====================================================

print("\n================ HEADER CHECK ================\n")

with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
    header = f.readline().strip()
    first_data = f.readline().strip()

print("HEADER:")
print(header)

print("\nFIRST DATA ROW:")
print(first_data)

print("\nNumber of columns (based on header):", len(header.split(sep)))
print("Columns in first data row:", len(first_data.split(sep)))


print("\n================ LAST LINE COLUMN CHECK ================\n")

with open(file_path, "rb") as f:
    f.seek(0, 2)
    size = f.tell()
    f.seek(max(0, size - 20000), 0)
    tail = f.read().decode("utf-8", errors="ignore").splitlines()

last_line = tail[-1]
print("LAST LINE:")
print(last_line)
print("\nColumns in last line:", len(last_line.split(sep)))