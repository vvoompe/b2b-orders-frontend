
from PIL import Image
src = r"C:/Users/alexm/Desktop/Study/Frontend/STEM_project/img/screens/ris12_orders_mobile.png"
im = Image.open(src)
out = r"C:/Users/alexm/AppData/Local/hermes/cache/scratch"
for name,(a,b) in {"A":(2280,3460),"B":(3400,4580)}.items():
    c = im.crop((0,a,780,b)); c.save(out + f"/_w{name}.png"); print(name, c.size)
