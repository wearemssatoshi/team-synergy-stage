import base64
import os
import glob

# Paths
BASE_DIR = "/Users/satoshiiga/dotfiles/TSS"
IMG_DIR = os.path.join(BASE_DIR, "assets/images")
TEMPLATE_FILE = os.path.join(BASE_DIR, "template_v3.html")
OUTPUT_FILE = os.path.join(BASE_DIR, "TSS_PV_Final.html")

# Image Mapping (finding the files)
# We know their prefixes
def find_img(prefix):
    matches = glob.glob(os.path.join(IMG_DIR, f"{prefix}*.png"))
    if matches:
        return matches[0]
    return None

images = {
    "__TITLE_IMG__": find_img("tss_title_card_gold"),
    "__VERSE1_IMG__": find_img("tss_verse1_solitude"),
    "__CHORUS1_IMG__": find_img("tss_chorus1_connection"),
    "__BRIDGE_IMG__": find_img("tss_bridge_professional"),
    "__OUTRO_IMG__": find_img("tss_outro_dream"),
}

# Read Template
with open(TEMPLATE_FILE, "r", encoding="utf-8") as f:
    content = f.read()

# Replace Placeholders
print("Injecting assets...")
for placeholder, path in images.items():
    if path and os.path.exists(path):
        print(f"Reading {path}...")
        with open(path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
            data_uri = f"data:image/png;base64,{b64}"
            content = content.replace(placeholder, data_uri)
    else:
        print(f"WARNING: Image for {placeholder} not found.")

# Write Output
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Success! Created {OUTPUT_FILE}")
