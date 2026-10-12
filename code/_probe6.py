
from PIL import Image
import numpy as np
src = r"C:/Users/alexm/Desktop/Study/Frontend/STEM_project/img/screens/ris12_orders_mobile.png"
im = Image.open(src).convert("RGB")
a = np.asarray(im)
H = a.shape[0]
# background color estimate from left margin column
col = a[:, 8, :]
print("bg sample rows:", col[0], col[1000], col[5000], col[8800])
white = (a[:,:,0]>250)&(a[:,:,1]>250)&(a[:,:,2]>250)
frac = white.mean(axis=1)   # fraction of white pixels per row
is_card = frac > 0.55
# find bands
bands=[]
s=None
for y in range(H):
    if is_card[y] and s is None: s=y
    if (not is_card[y] or y==H-1) and s is not None:
        if y-s > 60: bands.append((s,y))
        s=None
print("bands (y0,y1,height):")
for b in bands: print(b, b[1]-b[0])
