
from PIL import Image
src = r"C:/Users/alexm/Desktop/Study/Frontend/STEM_project/img/screens/ris12_orders_mobile.png"
im = Image.open(src)
for i,(a,b) in enumerate([(1400,3000),(3000,4600)]):
    c = im.crop((0,a,780,b))
    c.save(rf"C:/Users/alexm/Desktop/Study/Frontend/STEM_project/code/_probe_mob_{i}.png")
    print(i, c.size)
