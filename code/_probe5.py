
from PIL import Image
src = r"C:/Users/alexm/Desktop/Study/Frontend/STEM_project/img/screens/ris12_orders_mobile.png"
im = Image.open(src)
regions = {"a":(1560,2610), "b":(2610,3660), "c":(1600,2650)}
for k,(a,b) in regions.items():
    im.crop((0,a,780,b)).save(rf"C:/Users/alexm/AppData/Local/hermes/cache/scratch/_mob_{k}.png")
    print(k, im.crop((0,a,780,b)).size)
