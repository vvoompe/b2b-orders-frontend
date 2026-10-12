
from PIL import Image
import glob, os
files = glob.glob(r"C:/Users/alexm/Desktop/Study/Frontend/STEM_project/img/*.png") + glob.glob(r"C:/Users/alexm/Desktop/Study/Frontend/STEM_project/img/screens/*.png")
for f in sorted(files):
    im = Image.open(f)
    print(os.path.basename(f), im.size, im.mode)
