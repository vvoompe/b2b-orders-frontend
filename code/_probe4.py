
from PIL import Image
import glob, os
for f in [r"C:/Users/alexm/Desktop/Study/Frontend/STEM_project/img/ris1_user_flow.png",
          r"C:/Users/alexm/Desktop/Study/Frontend/STEM_project/img/ris2_button_states.png",
          r"C:/Users/alexm/Desktop/Study/Frontend/STEM_project/img/ris3_panel_states.png",
          r"C:/Users/alexm/Desktop/Study/Frontend/STEM_project/img/ris4_wireframes.png"]:
    im = Image.open(f)
    print(os.path.basename(f), im.mode, "corner TL:", im.convert("RGBA").getpixel((0,0)), "center-top:", im.convert("RGBA").getpixel((im.width//2, 5)))
