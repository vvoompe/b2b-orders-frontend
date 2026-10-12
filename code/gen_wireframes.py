# -*- coding: utf-8 -*-
"""Генерація каркасів екранів (wireframes) для User Guide STEM-проєкту."""
from PIL import Image, ImageDraw, ImageFont

F_REG = "C:/Windows/Fonts/arial.ttf"
F_BOLD = "C:/Windows/Fonts/arialbd.ttf"
OUT = r"C:/Users/alexm/Desktop/Study/Frontend/STEM_project/img/ris4_wireframes.png"

W, H = 1560, 760
BG_CARD = "#F1F5F9"
BORDER = "#94A3B8"
TEXT = "#111827"
ACCENT = "#1B5FA8"

img = Image.new("RGB", (W, H), "white")
d = ImageDraw.Draw(img)
f_title = ImageFont.truetype(F_BOLD, 24)
f_sub = ImageFont.truetype(F_BOLD, 20)
f_txt = ImageFont.truetype(F_REG, 17)
f_small = ImageFont.truetype(F_REG, 15)
f_big = ImageFont.truetype(F_BOLD, 40)


def panel(x0, y0, x1, y1, title):
    d.text((x0, y0 - 34), title, font=f_sub, fill=ACCENT)
    d.rounded_rectangle([x0, y0, x1, y1], radius=10, outline=BORDER, width=2, fill="white")


def box(x0, y0, x1, y1, label=None, fill=BG_CARD, font=None):
    d.rounded_rectangle([x0, y0, x1, y1], radius=6, outline=BORDER, width=2, fill=fill)
    if label:
        d.text((x0 + 12, y0 + 10), label, font=font or f_txt, fill=TEXT)


def line(x0, y, x1, label, font=None):
    d.rectangle([x0, y, x1, y + 30], outline=BORDER, width=1, fill="white")
    d.text((x0 + 10, y + 7), label, font=font or f_small, fill=TEXT)


d.text((40, 24), "Каркаси екранів застосунку (wireframes)", font=f_title, fill=TEXT)

# ---------- Панель 1: екран входу ----------
x0, y0, x1, y1 = 40, 100, 500, 720
panel(x0, y0, x1, y1, "1. Екран входу (/login)")
box(x0 + 12, y0 + 12, x1 - 12, y0 + 52, "Шапка: логотип + назва системи")
box(x0 + 60, y0 + 110, x1 - 60, y0 + 430, "Форма входу", fill="white")
line(x0 + 80, y0 + 150, x1 - 80, "Поле: E-mail")
line(x0 + 80, y0 + 200, x1 - 80, "Поле: Пароль")
line(x0 + 80, y0 + 250, x1 - 80, "Кнопка «Увійти»")
d.text((x0 + 100, y0 + 300), "Посилання: «Забули пароль?»", font=f_small, fill=TEXT)
box(x0 + 80, y0 + 340, x1 - 80, y0 + 376, "Повідомлення про помилку (aria-live)", fill="#FEE2E2")
d.text((x0 + 80, y0 + 400), "Стан завантаження: кнопка неактивна", font=f_small, fill=TEXT)

# ---------- Панель 2: список замовлень ----------
x0, y0, x1, y1 = 540, 100, 1040, 720
panel(x0, y0, x1, y1, "2. Список замовлень (/orders)")
box(x0 + 12, y0 + 12, x1 - 12, y0 + 52, "Шапка: назва + меню + користувач")
box(x0 + 12, y0 + 66, x1 - 12, y0 + 130, "Панель фільтрів")
for i, t in enumerate(["Період", "Клієнт", "Статус", "Сума"]):
    d.rectangle([x0 + 24 + i * 112, y0 + 96, x0 + 124 + i * 112, y0 + 124], outline=BORDER, fill="white")
    d.text((x0 + 30 + i * 112, y0 + 100), t, font=f_small, fill=TEXT)
box(x0 + 12, y0 + 146, x1 - 12, y0 + 600, "Таблиця замовлень", fill="white")
d.rectangle([x0 + 12, y0 + 180, x1 - 12, y0 + 215], fill=BG_CARD)
for i, t in enumerate(["№", "Клієнт", "Сума", "Статус", "Прогноз"]):
    d.text((x0 + 30 + i * 97, y0 + 188), t, font=f_small, fill=TEXT)
for r in range(5):
    yy = y0 + 220 + r * 70
    d.line([x0 + 12, yy + 60, x1 - 12, yy + 60], fill=BORDER, width=1)
    for i in range(5):
        d.rectangle([x0 + 26 + i * 97, yy + 18, x0 + 26 + i * 97 + 66, yy + 40], outline="#D5DCE6", fill="white")
box(x0 + 12, y0 + 610, x1 - 12, y0 + 660, "Пагінація: Назад / Далі, номер сторінки")

# ---------- Панель 3: картка замовлення ----------
x0, y0, x1, y1 = 1080, 100, 1540, 720
panel(x0, y0, x1, y1, "3. Картка замовлення (/orders/:id)")
box(x0 + 12, y0 + 12, x1 - 12, y0 + 52, "Шапка: назва + меню + користувач")
box(x0 + 12, y0 + 66, x1 - 250, y0 + 400, "Реквізити замовлення", fill="white")
for i, t in enumerate(["Клієнт", "Сума", "Дата", "Статус", "Менеджер"]):
    line(x0 + 26, y0 + 110 + i * 52, x1 - 264, t)
box(x0 + 262, y0 + 66, x1 - 12, y0 + 400, "Прогноз", fill="white")
d.text((x0 + 300, y0 + 105), "72 %", font=f_big, fill=ACCENT)
d.text((x0 + 300, y0 + 155), "успішного закриття", font=f_small, fill=TEXT)
line(x0 + 280, y0 + 200, x1 - 30, "Кнопка «Перерахувати прогноз»")
d.text((x0 + 280, y0 + 250), "Фактори впливу:", font=f_small, fill=TEXT)
for i, t in enumerate(["• сума замовлення", "• історія клієнта", "• строк оплати"]):
    d.text((x0 + 292, y0 + 278 + i * 26), t, font=f_small, fill=TEXT)
box(x0 + 12, y0 + 416, x1 - 12, y0 + 600, "Історія змін прогнозу (таблиця)", fill="white")
box(x0 + 12, y0 + 616, x1 - 12, y0 + 664, "Банер стану: дані застаріли / помилка + «Повторити»", fill="#FEF3C7")

img.save(OUT)
print("saved", OUT, img.size)
