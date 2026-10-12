# -*- coding: utf-8 -*-
"""
Генератор презентації для захисту STEM-проєкту (14 слайдів, 16:9, українською).
Запуск: "C:/Users/alexm/AppData/Local/hermes/hermes-agent/venv/Scripts/python" gen_slides.py
"""
import os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from PIL import Image

ROOT = r"C:/Users/alexm/Desktop/Study/Frontend/STEM_project"
IMG = ROOT + "/img"
OUT_DIR = ROOT + "/report"
OUT = OUT_DIR + "/STEM_презентація_ІПЗ-31_1.pptx"
SCRATCH = r"C:/Users/alexm/AppData/Local/hermes/cache/scratch/stem_slides"

FONT = "Segoe UI"
NAVY = RGBColor(0x14, 0x30, 0x5B)
BLUE = RGBColor(0x1D, 0x4E, 0xD8)
DARK = RGBColor(0x1F, 0x24, 0x2C)
GRAY = RGBColor(0x55, 0x5E, 0x6B)
LIGHT = RGBColor(0xF2, 0xF4, 0xF8)
CARD = RGBColor(0xE8, 0xEE, 0xF7)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
GREEN = RGBColor(0x1B, 0x7F, 0x4B)

TOTAL_SLIDES = 14
ALL_TEXT = []

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]


# ---------------------------------------------------------------- помічники
def new_slide():
    return prs.slides.add_slide(BLANK)


def rect(slide, l, t, w, h, fill=None, line=None, shape=MSO_SHAPE.RECTANGLE, radius=None):
    sh = slide.shapes.add_shape(shape, Inches(l), Inches(t), Inches(w), Inches(h))
    sh.shadow.inherit = False
    if fill is None:
        sh.fill.background()
    else:
        sh.fill.solid()
        sh.fill.fore_color.rgb = fill
    if line is None:
        sh.line.fill.background()
    else:
        sh.line.color.rgb = line
        sh.line.width = Pt(1)
    if radius is not None and shape == MSO_SHAPE.ROUNDED_RECTANGLE:
        sh.adjustments[0] = radius
    sh.text_frame.word_wrap = True
    return sh


def textbox(slide, l, t, w, h, paras, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP):
    """paras: список словників {t, size, bold, color, italic, space_after, space_before, ls, align}"""
    tb = slide.shapes.add_textbox(Inches(l), Inches(t), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = anchor
    for i, p in enumerate(paras):
        para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        para.alignment = p.get("align", align)
        para.space_after = Pt(p.get("space_after", 6))
        para.space_before = Pt(p.get("space_before", 0))
        para.line_spacing = p.get("ls", 0.95)
        run = para.add_run()
        run.text = p["t"]
        ALL_TEXT.append(p["t"])
        f = run.font
        f.name = FONT
        f.size = Pt(p.get("size", 17))
        f.bold = p.get("bold", False)
        f.italic = p.get("italic", False)
        f.color.rgb = p.get("color", DARK)
    return tb


def title_bar(slide, text, idx):
    rect(slide, 0, 0, 13.333, 0.95, fill=NAVY)
    rect(slide, 0, 0.95, 13.333, 0.06, fill=BLUE)
    textbox(slide, 0.55, 0.1, 11.2, 0.75, [{"t": text, "size": 30, "bold": True, "color": WHITE, "space_after": 0}],
            anchor=MSO_ANCHOR.MIDDLE)
    footer(slide, idx)


def footer(slide, idx):
    textbox(slide, 0.55, 7.09, 8.0, 0.3,
            [{"t": "ІПЗ-31 (підгрупа 1) - Олександр Маркграф", "size": 11, "color": GRAY, "space_after": 0}])
    textbox(slide, 11.0, 7.09, 1.78, 0.3,
            [{"t": "Слайд %d / %d" % (idx, TOTAL_SLIDES), "size": 11, "color": GRAY, "space_after": 0,
              "align": PP_ALIGN.RIGHT}])


def notes(slide, text):
    slide.notes_slide.notes_text_frame.text = text


def fit(path, max_w, max_h):
    with Image.open(path) as im:
        w, h = im.size
    k = min(max_w / w, max_h / h)
    return w * k, h * k


def picture(slide, path, x, y, max_w, max_h, center=None):
    assert os.path.exists(path), "немає файлу: " + path
    w, h = fit(path, max_w, max_h)
    if center is not None:
        x = center - w / 2.0
    slide.shapes.add_picture(path, Inches(x), Inches(y), Inches(w), Inches(h))
    return w, h


def caption(slide, x, y, w, text):
    textbox(slide, x, y, w, 0.34, [{"t": text, "size": 16, "italic": True, "color": GRAY, "space_after": 0}])


def card(slide, x, y, w, h, heading, lines, head_size=20, body_size=16, fill=CARD):
    rect(slide, x, y, w, h, fill=fill, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.04)
    paras = [{"t": heading, "size": head_size, "bold": True, "color": NAVY, "space_after": 8}]
    for ln in lines:
        paras.append({"t": ln, "size": body_size, "color": DARK, "space_after": 7})
    textbox(slide, x + 0.28, y + 0.22, w - 0.56, h - 0.44, paras)


def bullets(slide, x, y, w, h, heading, items, head_size=19, body_size=16):
    paras = []
    if heading:
        paras.append({"t": heading, "size": head_size, "bold": True, "color": NAVY, "space_after": 9})
    for it in items:
        paras.append({"t": "•  " + it, "size": body_size, "color": DARK, "space_after": 7})
    textbox(slide, x, y, w, h, paras)


def set_cell(cell, text, size=16, bold=False, color=DARK, fill=None, align=PP_ALIGN.LEFT):
    cell.text_frame.word_wrap = True
    cell.margin_left = Inches(0.12)
    cell.margin_right = Inches(0.08)
    cell.margin_top = Inches(0.04)
    cell.margin_bottom = Inches(0.04)
    cell.vertical_anchor = MSO_ANCHOR.MIDDLE
    if fill is not None:
        cell.fill.solid()
        cell.fill.fore_color.rgb = fill
    p = cell.text_frame.paragraphs[0]
    p.alignment = align
    p.line_spacing = 0.95
    run = p.add_run()
    run.text = text
    ALL_TEXT.append(text)
    f = run.font
    f.name = FONT
    f.size = Pt(size)
    f.bold = bold
    f.color.rgb = color


# ---------------------------------------------------------------- слайд 1
s = new_slide()
rect(s, 0, 0, 13.333, 2.25, fill=NAVY)
rect(s, 0, 2.25, 13.333, 0.07, fill=BLUE)
textbox(s, 0.9, 0.42, 11.5, 1.6, [
    {"t": "Київський національний університет імені Тараса Шевченка", "size": 20, "bold": True, "color": WHITE, "space_after": 6},
    {"t": "Факультет інформаційних технологій", "size": 17, "color": WHITE, "space_after": 4},
    {"t": "Кафедра програмних систем і технологій", "size": 17, "color": WHITE, "space_after": 4},
    {"t": "Індивідуальний STEM-проєкт", "size": 16, "color": RGBColor(0xBF, 0xD4, 0xF2), "space_after": 0},
])
textbox(s, 0.9, 2.75, 11.6, 1.7, [
    {"t": "Розроблення клієнтської частини системи підтримки ухвалення рішень "
          "щодо B2B-замовлень засобами React",
     "size": 28, "bold": True, "color": NAVY, "space_after": 0, "ls": 1.05},
])
rect(s, 0.9, 4.55, 2.6, 0.06, fill=BLUE)
textbox(s, 0.9, 4.85, 6.0, 1.6, [
    {"t": "Виконавець: Олександр МАРКГРАФ", "size": 19, "bold": True, "color": DARK, "space_after": 8},
    {"t": "Група: ІПЗ-31 (підгрупа 1)", "size": 17, "color": DARK, "space_after": 8},
    {"t": "Дисципліна: «Розробник фронтенду програмних систем»", "size": 17, "color": DARK, "space_after": 8},
    {"t": "Лекторка: Ірина ЮРЧУК", "size": 17, "color": DARK, "space_after": 0},
])
textbox(s, 0.9, 6.65, 7.0, 0.4, [{"t": "Київ, 2026 рік", "size": 16, "color": GRAY, "space_after": 0}])
textbox(s, 7.1, 6.65, 5.4, 0.4, [{"t": "https://github.com/vvoompe/b2b-orders-frontend", "size": 14,
                                  "color": GRAY, "space_after": 0, "align": PP_ALIGN.RIGHT}])
card(s, 7.1, 4.75, 5.4, 1.75, "Стек", [
    "React 19, Vite, TypeScript (strict), React Router 7, TanStack Query 5, MSW 2, Recharts, "
    "CSS Modules, Vitest і React Testing Library.",
], head_size=18)
notes(s, "Добрий день. Тема моєї роботи - розроблення клієнтської частини системи підтримки "
         "ухвалення рішень щодо B2B-замовлень засобами React. Це індивідуальний STEM-проєкт "
         "з дисципліни «Розробник фронтенду програмних систем». Далі покажу проблему, обсяг "
         "роботи, реальні екрани й результати перевірок.")

# ---------------------------------------------------------------- слайд 2
s = new_slide()
title_bar(s, "Проблема й мета проєкту", 2)
card(s, 0.55, 1.3, 6.0, 3.3, "Проблема", [
    "Менеджер бачить список із десятків замовлень без пріоритетів: незрозуміло, за яке братися першим.",
    "«Сухий» список не пояснює, чому одне замовлення перспективніше за інше.",
    "Оцінка перспективності тримається в голові менеджера й не передається команді.",
])
card(s, 6.8, 1.3, 6.0, 3.3, "Мета", [
    "Розробити клієнтську частину системи підтримки ухвалення рішень, яка для кожного "
    "B2B-замовлення показує прогноз імовірності успішного закриття, перелік чинників "
    "впливу й дає змогу перерахувати прогноз після зміни умов.",
    "Результат - веб-застосунок на React із п'ятьма екранами, підставним API та "
    "автоматичними тестами.",
], fill=LIGHT)
bullets(s, 0.55, 4.85, 12.23, 0.4, "Завдання", [], head_size=19, body_size=16)
chips = ["5 екранів", "5 станів даних", "6 станів кнопки перерахунку",
         "ролі й захищені маршрути", "тести з покриттям 96,72 %", "адаптивність 360-1280 px"]
for i, c in enumerate(chips):
    x = 0.55 + (i % 3) * 4.14
    y = 5.35 + (i // 3) * 0.72
    rect(s, x, y, 3.95, 0.6, fill=CARD, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.12)
    textbox(s, x + 0.15, y + 0.06, 3.65, 0.48, [{"t": c, "size": 16, "color": NAVY, "space_after": 0,
                                                "align": PP_ALIGN.CENTER}], anchor=MSO_ANCHOR.MIDDLE)
notes(s, "Проблема практична: у списку десятки замовлень, і менеджер не бачить, які з них "
         "перспективні. Мета роботи - дати йому прогноз, чинники впливу й можливість "
         "перерахувати оцінку. Завдання зведені до шести напрямів, які я показав у нижньому рядку.")

# ---------------------------------------------------------------- слайд 3
def role_card(slide, x, y, w, h, heading, texts, demo):
    rect(slide, x, y, w, h, fill=CARD, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.04)
    paras = [{"t": heading, "size": 19, "bold": True, "color": NAVY, "space_after": 10}]
    for t in texts:
        paras.append({"t": t, "size": 16, "color": DARK, "space_after": 8})
    paras.append({"t": "Демо-доступ:", "size": 16, "bold": True, "color": NAVY, "space_after": 2})
    paras.append({"t": demo, "size": 16, "color": DARK, "space_after": 0})
    textbox(slide, x + 0.28, y + 0.22, w - 0.56, h - 0.44, paras)


s = new_slide()
title_bar(s, "Користувачі та їхні задачі", 3)
role_card(s, 0.55, 1.3, 3.95, 4.35, "1. Менеджер", [
    "Власні замовлення: список і картка.",
    "Бачить прогноз успішного закриття й чинники впливу, перераховує оцінку, вивантажує "
    "вибірку в CSV, ділиться посиланням.",
], "manager@demo.ua / manager123")
role_card(s, 4.69, 1.3, 3.95, 4.35, "2. Аналітик", [
    "Усе, що й менеджер, плюс розділ «Аналітика».",
    "Метрики якості моделі, важливість ознак, тренд метрики за період - щоб оцінити, "
    "наскільки прогнозам можна довіряти.",
], "analyst@demo.ua / analyst123")
role_card(s, 8.83, 1.3, 3.95, 4.35, "3. Адміністратор", [
    "Повний доступ до даних і екран «Користувачі».",
    "Перелік користувачів і зміна ролі; бачить усі 72 замовлення, тоді як менеджер - лише "
    "власні 24.",
], "admin@demo.ua / admin123")
textbox(s, 0.55, 5.85, 12.23, 1.1, [
    {"t": "Ролі розділені на рівні маршрутів: пункт «Аналітика» бачать аналітик і "
          "адміністратор, «Користувачі» - лише адміністратор.", "size": 16, "color": DARK, "space_after": 6},
    {"t": "Повідомлення про невдалий вхід однакове для неіснуючого користувача й "
          "неправильного пароля - щоб облікові дані не можна було підбирати за текстом помилки.",
     "size": 16, "color": DARK, "space_after": 0},
])
notes(s, "У системи три ролі, і кожна розв'язує свою задачу. Менеджер приймає рішення за "
         "конкретним замовленням, аналітик оцінює якість прогнозів, адміністратор керує "
         "доступами. Ролі розділені на рівні маршрутів, а не лише приховані в меню.")

# ---------------------------------------------------------------- слайд 4
s = new_slide()
title_bar(s, "Обсяг роботи", 4)
card(s, 0.55, 1.3, 3.95, 3.35, "5 екранів", [
    "/login - вхід у систему",
    "/orders - список замовлень",
    "/orders/:id - картка замовлення",
    "/analytics - аналітика",
    "/admin/users - користувачі",
], head_size=18, body_size=16)
card(s, 4.69, 1.3, 3.95, 3.35, "5 станів даних", [
    "loading - скелетон фіксованої висоти",
    "success - дані",
    "empty - «замовлень не знайдено» з порадою",
    "error - повідомлення й кнопка «Повторити»",
    "offline - банер «дані можуть бути застарілими»",
], head_size=18, body_size=16)
card(s, 8.83, 1.3, 3.95, 3.35, "6 станів кнопки перерахунку", [
    "idle - кнопка доступна",
    "hover - змінюється лише оформлення",
    "active - кнопку натиснуто",
    "loading - повторні натискання заблоковані",
    "success - підтвердження зникає за 2 с",
    "error - можна повторити спробу",
], head_size=18, body_size=16)
bullets(s, 0.55, 4.8, 12.23, 0.4, "Додатково в обсязі роботи", [], head_size=18)
extra_left = [
    "Експорт CSV усієї вибірки з урахуванням фільтрів; файл із BOM, тому Excel коректно показує кирилицю.",
    "Копіювання посилання на замовлення в буфер обміну.",
    "Фільтри, сортування й номер сторінки зберігаються в адресі сторінки.",
]
extra_right = [
    "Токен доступу тримається лише в пам'яті модуля, у сховищі браузера його немає.",
    "Підставний API на MSW: затримки, помилки 401/403/404/500, обрив мережі.",
    "Панель «Режим перевірки» - перемикання станів без правок коду.",
]
for x, items in ((0.55, extra_left), (6.8, extra_right)):
    textbox(s, x, 5.25, 5.9, 1.7, [{"t": "•  " + it, "size": 16, "color": DARK, "space_after": 6} for it in items])
notes(s, "Обсяг роботи я поділив на три частини: п'ять екранів, п'ять станів даних на кожному "
         "екрані з даними та шість станів однієї кнопки перерахунку. Додатково зробив експорт "
         "CSV, копіювання посилання, збереження фільтрів в адресі й панель перемикання станів.")

# ---------------------------------------------------------------- слайд 5
s = new_slide()
title_bar(s, "Користувацький шлях (user flow)", 5)
bullets(s, 0.55, 1.32, 7.6, 4.0, "Кроки сценарію", [
    "Авторизація - перевірка на клієнті й на сервері; помилка повертає на екран входу.",
    "Головний екран - список замовлень із прогнозом у кожному рядку.",
    "Уточнення вибірки фільтрами - необов'язковий крок.",
    "Вибір замовлення зі списку.",
    "Картка замовлення - прогноз, чинники впливу, перерахунок.",
    "Аналітика - окремий розділ для аналітика.",
], head_size=19, body_size=16)
textbox(s, 0.55, 5.45, 7.6, 1.4, [
    {"t": "Обидві розвилки стоять там, де користувач справді ухвалює рішення: на вході та "
          "під час формування вибірки.", "size": 16, "color": DARK, "space_after": 6},
    {"t": "Обробку помилки авторизації показано окремою гілкою - без неї сценарій виглядав би "
          "так, ніби помилковий ввід неможливий.", "size": 16, "color": DARK, "space_after": 0},
])
picture(s, IMG + "/ris1_user_flow.png", 8.7, 1.45, 4.1, 5.2)
caption(s, 8.7, 6.72, 4.1, "Рисунок 1. Діаграма кроків сценарію.")
notes(s, "Сценарій лінійний і складається з шести кроків: вхід, список, уточнення вибірки, "
         "вибір замовлення, картка з перерахунком і аналітика. Обидві розвилки розміщені там, "
         "де користувач справді ухвалює рішення. Гілку помилки входу показано окремо, бо без "
         "неї сценарій виглядав би так, ніби помилковий ввід неможливий.")

# ---------------------------------------------------------------- слайд 6
s = new_slide()
title_bar(s, "Діаграма станів кнопки та панелі", 6)
textbox(s, 0.55, 1.28, 12.23, 0.6, [
    {"t": "Кнопка «Перерахувати прогноз» має шість станів, панель списку замовлень - п'ять "
          "станів даних. Обидві схеми описують поведінку одного елемента інтерфейсу.",
     "size": 16, "color": DARK, "space_after": 0}])
picture(s, IMG + "/ris2_button_states.png", 0.55, 1.95, 6.0, 4.3)
picture(s, IMG + "/ris3_panel_states.png", 6.85, 1.95, 6.0, 4.5)
caption(s, 0.55, 6.5, 6.0, "Рисунок 2. Шість станів кнопки перерахунку прогнозу.")
caption(s, 6.85, 6.5, 6.0, "Рисунок 3. П'ять станів панелі списку замовлень.")
notes(s, "Тут дві діаграми станів. Ліва показує шість станів кнопки перерахунку: звичайний, "
         "наведений, натиснутий, завантаження, успіх і помилка. Права - п'ять станів панелі "
         "списку: завантаження, дані, порожній результат, помилка з кнопкою «Повторити» та "
         "банер про застарілі дані.")

# ---------------------------------------------------------------- слайд 7
s = new_slide()
title_bar(s, "Каркаси екранів", 7)
textbox(s, 0.55, 1.3, 12.23, 0.6, [
    {"t": "Схематичне розташування елементів п'яти екранів, узгоджене до написання коду: "
          "шапка, панель фільтрів, робоча область і пагінація.", "size": 16, "color": DARK, "space_after": 0}])
picture(s, IMG + "/ris4_wireframes.png", 0, 1.85, 9.9, 4.8, center=6.667)
caption(s, 3.4, 6.72, 6.5, "Рисунок 4. Каркаси екранів застосунку.")
notes(s, "Каркаси я зробив до написання коду, щоб домовитися про однакове розташування "
         "елементів на всіх екранах: шапка, панель фільтрів, робоча область і пагінація. "
         "Це дало змогу не переробляти верстку на етапі реалізації.")

# ---------------------------------------------------------------- слайд 8
s = new_slide()
title_bar(s, "Архітектура й стек", 8)
textbox(s, 0.55, 1.28, 6.0, 0.4, [{"t": "Шари застосунку (зверху вниз)", "size": 18, "bold": True,
                                  "color": NAVY, "space_after": 0}])
layers = [
    "Екрани: React 19 і React Router 7 - маршрути, захищені роллю",
    "Серверний стан: TanStack Query 5 - кеш, повторні спроби, збереження даних під час оновлення",
    "Клієнт API: запити, типи відповідей, токен у пам'яті модуля",
    "Підставний бекенд: MSW 2 - затримки, помилки 401/403/404/500, обрив мережі",
]
y = 1.75
for i, txt in enumerate(layers):
    rect(s, 0.55, y, 6.0, 0.95, fill=LIGHT, line=BLUE, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.08)
    textbox(s, 0.75, y + 0.08, 5.6, 0.79, [{"t": txt, "size": 16, "color": DARK, "space_after": 0}],
            anchor=MSO_ANCHOR.MIDDLE)
    if i < len(layers) - 1:
        rect(s, 3.4, y + 0.96, 0.3, 0.18, fill=BLUE, shape=MSO_SHAPE.DOWN_ARROW)
    y += 1.14
bullets(s, 6.8, 1.28, 5.98, 5.4, "Стек і структура", [
    "React 19, Vite, TypeScript у строгому режимі",
    "React Router 7, TanStack Query 5, Recharts",
    "MSW 2 - підставний API з керованими станами",
    "CSS Modules і змінні дизайн-токенів, без CSS-фреймворку",
    "Vitest і React Testing Library; ESLint і Prettier",
    "Структура: api/, app/, components/, features/, lib/, mocks/, styles/",
], head_size=19, body_size=16)
textbox(s, 0.55, 6.5, 12.23, 0.5, [
    {"t": "Контракт із API описано типами, тому заміна підставного бекенду на справжній не "
          "вимагає переписування екранів.", "size": 16, "color": DARK, "space_after": 0}])
notes(s, "Архітектуру я розділив на чотири шари. Екрани не звертаються до мережі напряму: "
         "серверний стан живе в TanStack Query, клієнт API відповідає за запити й токен, а "
         "замість бекенду працює MSW. Саме тому заміна підставного API на справжній не "
         "вимагатиме переписування екранів.")

# ---------------------------------------------------------------- слайд 9
s = new_slide()
title_bar(s, "Реальні екрани: вхід і список замовлень", 9)
bullets(s, 1.1, 1.3, 5.0, 2.2, "Вхід", [
    "Клієнтська перевірка: порожні поля, формат email, довжина пароля.",
    "Однакове повідомлення про відмову для неіснуючого користувача й неправильного пароля.",
    "Пароль не логується, токен живе лише в пам'яті модуля.",
], head_size=18, body_size=16)
picture(s, IMG + "/screens/ris5_login.png", 1.1, 3.75, 5.0, 2.8)
caption(s, 1.1, 6.62, 5.0, "Рисунок 5. Екран входу.")
picture(s, IMG + "/screens/ris6_orders_desktop.png", 6.4, 1.4, 5.8, 5.2)
caption(s, 6.4, 6.72, 5.8, "Рисунок 6. Список замовлень (десктоп).")
notes(s, "На екрані входу є клієнтська перевірка полів, а повідомлення про невдалий вхід "
         "однакове для неіснуючого користувача й неправильного пароля. Праворуч - головний "
         "екран: таблиця замовлень із прогнозом, панель фільтрів, пагінація та кнопка експорту CSV.")

# ---------------------------------------------------------------- слайд 10
s = new_slide()
title_bar(s, "Картка замовлення й перерахунок прогнозу", 10)
bullets(s, 0.55, 1.3, 6.3, 3.9, "Що є в картці", [
    "Реквізити: номер, клієнт, сума, статус, менеджер, дата створення.",
    "Прогноз: числова оцінка ймовірності успішного закриття та рівень ризику.",
    "Чинники впливу: перелік ознак, які найбільше змінили оцінку.",
    "Історія змін прогнозу: видно, коли оцінка оновлювалася.",
    "Кнопка «Перерахувати прогноз» із шістьма станами; повторні натискання заблоковані.",
    "Копіювання посилання на замовлення в буфер обміну.",
], head_size=19, body_size=16)
textbox(s, 0.55, 5.35, 6.3, 1.4, [
    {"t": "Перерахунок звертається до підставного API так само, як звертався б до справжнього "
          "сервера: зі станом завантаження й окремою обробкою помилки.", "size": 16,
     "color": DARK, "space_after": 6},
    {"t": "Після успішного перерахунку оцінка й перелік чинників оновлюються одразу.",
     "size": 16, "color": DARK, "space_after": 0},
])
picture(s, IMG + "/screens/ris7_order_card.png", 6.9, 1.75, 5.88, 4.5)
caption(s, 6.9, 6.35, 5.88, "Рисунок 7. Картка замовлення з прогнозом і чинниками.")
notes(s, "Картка замовлення - центральний екран системи: тут видно прогноз, рівень ризику, "
         "чинники впливу й історію змін оцінки. Кнопка перерахунку проходить шість станів і "
         "блокує повторні натискання, щоб не створювати дубльованих запитів.")

# ---------------------------------------------------------------- слайд 11
s = new_slide()
title_bar(s, "Адаптивність і доступність", 11)
os.makedirs(SCRATCH, exist_ok=True)
mob_a = SCRATCH + "/ris12_mobile_part1.png"
mob_b = SCRATCH + "/ris12_mobile_part2.png"
mob_src = Image.open(IMG + "/screens/ris12_orders_mobile.png")
mob_src.crop((0, 2280, 780, 3460)).save(mob_a)
mob_src.crop((0, 3400, 780, 4580)).save(mob_b)
textbox(s, 0.55, 1.3, 4.8, 5.4, [
    {"t": "Адаптивність", "size": 19, "bold": True, "color": NAVY, "space_after": 8},
    {"t": "•  Три контрольні ширини: 360, 768 і 1280 px.", "size": 16, "color": DARK, "space_after": 6},
    {"t": "•  До 767 px таблиця стає картками, від 768 px - таблицею.", "size": 16, "color": DARK, "space_after": 6},
    {"t": "•  Горизонтального скролу сторінки немає.", "size": 16, "color": DARK, "space_after": 6},
    {"t": "•  Скелетони фіксованої висоти - верстка не «стрибає».", "size": 16, "color": DARK, "space_after": 16},
    {"t": "Доступність", "size": 19, "bold": True, "color": NAVY, "space_after": 8},
    {"t": "•  Семантичні теги, aria-live, aria-busy, aria-sort.", "size": 16, "color": DARK, "space_after": 6},
    {"t": "•  Навігація з клавіатури та видимий фокус.", "size": 16, "color": DARK, "space_after": 6},
    {"t": "•  Контраст тексту не нижче 4.5:1.", "size": 16, "color": DARK, "space_after": 6},
])
for px, pic in ((5.55, mob_a), (9.05, mob_b)):
    w, h = fit(pic, 3.35, 4.98)
    rect(s, px - 0.04, 1.33, w + 0.08, h + 0.08, fill=None, line=RGBColor(0xC2, 0xCC, 0xDA))
    picture(s, pic, px, 1.37, 3.35, 4.98)
caption(s, 5.55, 6.5, 7.3, "Рисунок 12. Мобільний список замовлень (ширина 360 px).")
notes(s, "Застосунок працює на трьох контрольних ширинах: 360, 768 і 1280 px. На мобільному "
         "таблиця перетворюється на картки, як видно на знімках, і горизонтального скролу "
         "немає. Доступність забезпечена семантичними тегами, атрибутами aria, навігацією з "
         "клавіатури та контрастом не нижче 4.5 до 1.")

# ---------------------------------------------------------------- слайд 12
s = new_slide()
title_bar(s, "Якість: тести й перевірки", 12)
rows = [
    ("Перевірка", "Команда / спосіб", "Результат"),
    ("Збірка й типи", "npm run build", "успішно, без помилок TypeScript"),
    ("Лінтер", "npm run lint", "0 зауважень"),
    ("Тести", "npm test", "225 тестів у 18 файлах, усі пройдено"),
    ("Покриття", "vitest run --coverage", "96,72 % тверджень, 90,63 % гілок, 98,49 % функцій"),
    ("Перевірка в браузері", "Chromium, Edge", "вхід, список, картка, перерахунок, аналітика, "
                                               "користувачі - помилок консолі 0"),
]
shape = s.shapes.add_table(len(rows), 3, Inches(0.55), Inches(1.3), Inches(12.23), Inches(3.3))
table = shape.table
table.first_row = False
table.horz_banding = False
for c, w in zip(table.columns, (3.2, 3.0, 6.03)):
    c.width = Inches(w)
for r in table.rows:
    r.height = Inches(0.55)
for ri, row in enumerate(rows):
    for ci, val in enumerate(row):
        if ri == 0:
            set_cell(table.cell(ri, ci), val, size=16, bold=True, color=WHITE, fill=NAVY)
        else:
            fill = LIGHT if ri % 2 == 0 else WHITE
            set_cell(table.cell(ri, ci), val, size=16, color=DARK, fill=fill,
                     bold=(ci == 0))
bullets(s, 0.55, 4.85, 12.23, 2.0, "Рівні тестів", [
    "unit: форматери, рівень ризику, query-параметри, фільтрація, прогноз, режим перевірки, "
    "клієнт API, валідація входу, CSV.",
    "component: OrderTable у чотирьох станах, RecalculateButton - шість станів і заборона "
    "подвійного натискання, Filters, LoginPage.",
    "integration: логін → список → картка → перерахунок на MSW, фільтри в URL, доступ за ролями.",
    "Поріг покриття модулів логіки 80 % заданий у vite.config.ts - збірка падає, якщо поріг "
    "не досягнуто.",
], head_size=18, body_size=16)
notes(s, "Якість підтверджена числами, а не на словах: збірка проходить без помилок типів, "
         "лінтер дає нуль зауважень, тести - 225 перевірок у 18 файлах, усі пройдено. Покриття "
         "становить 96,72 % тверджень, 90,63 % гілок і 98,49 % функцій, що суттєво вище за "
         "поріг 80 % із завдання. У реальному браузері помилок консолі не було жодної.")

# ---------------------------------------------------------------- слайд 13
s = new_slide()
title_bar(s, "Межі проєкту й подальші кроки", 13)
card(s, 0.55, 1.3, 6.0, 5.5, "Межі проєкту (свідомі)", [
    "Реального бекенду немає: дані надходять із підставного API на MSW.",
    "Прогноз - детермінована імітація на демонстраційних даних, а не робота ML-моделі.",
    "Автентифікація імітована: справжнього сервера авторизації немає.",
    "Мобільних застосунків, серверного рендерингу й хмарного розгортання не передбачено - "
    "застосунок запускається локально.",
    "Кросбраузерність перевірено в Chromium і Firefox; повний набір старих браузерів не "
    "тестувався.",
    "Межі зафіксовані в технічному завданні - це не недоробки, а узгоджений обсяг роботи.",
], head_size=19, fill=LIGHT)
card(s, 6.8, 1.3, 6.0, 5.5, "Подальші кроки", [
    "Замінити підставний API справжнім бекендом: контракт описано типами, тому код екранів "
    "не змінюється.",
    "Підключити реальну модель прогнозу замість імітації.",
    "Зберігати вибірки за користувачем і повертатися до них пізніше.",
    "Додати експорт у XLSX із форматуванням.",
    "Розширити аналітику порівнянням періодів.",
], head_size=19)
notes(s, "Межі проєкту я фіксую відкрито: реального бекенду й ML-моделі немає, прогноз - "
         "детермінована імітація, автентифікація імітована. Далі - заміна підставного API "
         "справжнім сервером без зміни коду екранів, реальна модель прогнозу, збережені вибірки "
         "й експорт у XLSX.")

# ---------------------------------------------------------------- слайд 14
s = new_slide()
title_bar(s, "Висновки й подяка", 14)
bullets(s, 0.55, 1.3, 7.4, 4.4, "Висновки", [
    "Мета досягнута: застосунок реалізовано, зібрано, протестовано й перевірено в реальному браузері.",
    "Найціннішим було проєктування поведінки: п'ять станів даних і шість станів однієї кнопки "
    "описані до написання коду.",
    "Серверний стан винесено в TanStack Query - кеш, повторні спроби й збереження попередніх "
    "даних дали передбачувану поведінку екранів.",
    "Фільтри в адресі сторінки, токен у пам'яті модуля, однакове повідомлення про відмову "
    "входу - свідомі рішення на користь зручності й захищеності.",
], head_size=20, body_size=16)
card(s, 8.2, 1.3, 4.6, 4.4, "Матеріали", [
    "Репозиторій: github.com/vvoompe/b2b-orders-frontend",
    "manager@demo.ua / manager123",
    "analyst@demo.ua / analyst123",
    "admin@demo.ua / admin123",
    "Запуск: npm install, далі npm run dev",
], head_size=18, fill=LIGHT)
rect(s, 0.55, 5.9, 12.23, 1.0, fill=NAVY, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.1)
textbox(s, 0.55, 5.98, 12.23, 0.84, [
    {"t": "Дякую за увагу! Готовий відповісти на запитання.", "size": 26, "bold": True, "color": WHITE,
     "space_after": 0, "align": PP_ALIGN.CENTER}], anchor=MSO_ANCHOR.MIDDLE)
notes(s, "Підсумую: мета роботи досягнута - застосунок реалізовано, зібрано й перевірено. "
         "Найціннішим етапом було проєктування поведінки інтерфейсу та її закріплення тестами. "
         "Код, документація й демонстраційні доступи доступні в репозиторії. Дякую за увагу - "
         "готовий відповісти на запитання.")

# ---------------------------------------------------------------- збереження
os.makedirs(OUT_DIR, exist_ok=True)
prs.save(OUT)

# ---------------------------------------------------------------- самоперевірка
print("Слайдів:", len(prs.slides.__iter__.__self__._sldIdLst))
print("Файл:", OUT)
print("Розмір, байтів:", os.path.getsize(OUT))
bad_dash = [t for t in ALL_TEXT if "—" in t or "–" in t or "―" in t]
rus = ["являється", "приймає участь", "приймати участь", "на протязі", "співпадає", "слідуючий",
       "слідуючим", "по крайній мірі", "самий ", "учбовий", "відноситься", "в залежності",
       "в результаті", "на рахунок", "існуючий", "данний"]
rus_hits = [t for t in ALL_TEXT for w in rus if w in t.lower()]
print("Фрагментів із довгим тире/ен-тире:", len(bad_dash))
for t in bad_dash:
    print("  [ТИРЕ]", t[:90])
print("Підозр на русизми:", len(rus_hits))
for t in rus_hits:
    print("  [СТИЛЬ]", t[:90])
empty_notes = [i + 1 for i, sl in enumerate(prs.slides) if not sl.notes_slide.notes_text_frame.text.strip()]
print("Слайди без нотаток:", empty_notes if empty_notes else "немає")
