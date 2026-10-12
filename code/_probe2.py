
from PIL import Image
src = r"C:/Users/alexm/Desktop/Study/Frontend/STEM_project/img/screens/ris12_orders_mobile.png"
im = Image.open(src)
print("orig", im.size)
# crop top band with header + first cards
c = im.crop((0,0,780,1700))
c.save(r"C:/Users/alexm/Desktop/Study/Frontend/STEM_project/code/_probe_mobile_top.png")
print("saved", c.size)
