#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Генератор діаграм Розділу 1 пояснювальної записки STEM-проєкту.

Проєкт: «Розроблення клієнтської частини системи підтримки ухвалення рішень
щодо B2B-замовлень засобами React».

Створює (у ../img):
  - ris1_user_flow.(png|svg)     - діаграма користувача (послідовні кроки)
  - ris2_button_states.(png|svg) - діаграма станів кнопки «Перерахувати прогноз»
  - ris3_panel_states.(png|svg)  - діаграма станів панелі списку замовлень

Геометрія задана явними координатами (сітка 0..100), щоб блоки, ромби й підписи
стрілок не перекривались: кожен елемент має власну вертикальну смугу.

Запуск: python gen_rd1_diagrams.py
"""
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyArrowPatch, FancyBboxPatch

OUT = Path(__file__).resolve().parent.parent / "img"
OUT.mkdir(parents=True, exist_ok=True)

C_PROC = "#e8f0fe"
C_START = "#d9ead3"
C_DEC = "#fff2cc"
C_ERR = "#fce8e6"
C_OK = "#e6f4ea"
C_GREY = "#e8eaed"
EDGE = "#3c4043"
FS = 9


def box(ax, x, y, w, h, text, fill=C_PROC, fs=FS, bold=False):
    ax.add_patch(FancyBboxPatch((x, y), w, h,
                                boxstyle="round,pad=0.02,rounding_size=0.12",
                                linewidth=1.2, edgecolor=EDGE, facecolor=fill,
                                mutation_scale=1))
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=fs,
            color="#202124", fontweight="bold" if bold else "normal",
            linespacing=1.35)


def diamond(ax, cx, cy, w, h, text, fs=FS):
    pts = [(cx, cy + h / 2), (cx + w / 2, cy), (cx, cy - h / 2), (cx - w / 2, cy)]
    ax.add_patch(plt.Polygon(pts, closed=True, linewidth=1.2, edgecolor=EDGE,
                             facecolor=C_DEC))
    ax.text(cx, cy, text, ha="center", va="center", fontsize=fs, linespacing=1.25)


def arrow(ax, p1, p2, label="", rad=0.0, lpos=None, fs=7.8, color=EDGE):
    ax.add_patch(FancyArrowPatch(p1, p2, connectionstyle=f"arc3,rad={rad}",
                                 arrowstyle="-|>", mutation_scale=12, linewidth=1.1,
                                 color=color, shrinkA=2, shrinkB=2))
    if label:
        lx, ly = lpos if lpos else ((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2)
        ax.text(lx, ly, label, ha="center", va="center", fontsize=fs, color="#5f6368",
                linespacing=1.3,
                bbox=dict(boxstyle="round,pad=0.16", fc="white", ec="none", alpha=0.92))


def canvas(w, h, title):
    fig, ax = plt.subplots(figsize=(w, h), dpi=200)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis("off")
    ax.set_title(title, fontsize=10.5, fontweight="bold", color="#202124", pad=12)
    return fig, ax


def save(fig, name):
    for ext in ("png", "svg"):
        fig.savefig(OUT / f"{name}.{ext}", dpi=300, bbox_inches="tight",
                    facecolor="white")
    plt.close(fig)
    print(f"  збережено {name}.png / {name}.svg")


def rows(n, top=99.0, pitch=12.5, h=7.5):
    """n смуг зверху вниз: повертає список (низ, верх)."""
    return [(top - i * pitch - h, top - i * pitch) for i in range(n)]


# --- Рисунок 1: діаграма користувача --------------------------------------
def ris1():
    fig, ax = canvas(8.8, 11.0,
                     "Рисунок 1 - Діаграма користувача (послідовні кроки роботи з системою)")
    R = rows(8)
    CX, W = 30, 42      # основна колонка: 30..72
    DN, DW = 10, 30     # ромби: 36..66

    box(ax, CX, R[0][0], W, 7.5, "Відкриття застосунку", fill=C_START)
    box(ax, CX, R[1][0], W, 7.5, "Авторизація (введення облікових даних)")
    diamond(ax, 51, R[2][0] + 3.75, DW, DN, "Дані\nкоректні?")
    box(ax, CX, R[3][0], W, 7.5, "Головний екран:\nсписок замовлень")
    diamond(ax, 51, R[4][0] + 3.75, DW, DN, "Потрібне уточнення\nвибірки?")
    box(ax, CX, R[5][0], W, 7.5, "Вибір замовлення зі списку")
    box(ax, CX, R[6][0], W, 7.5, "Картка замовлення: прогноз\nі фактори впливу")
    box(ax, CX, R[7][0], W, 7.5, "Розділ «Аналітика»: метрики моделі", fill=C_START)

    box(ax, 76, R[2][0], 23, 7.5, "Повідомлення\nпро помилку", fill=C_ERR)
    box(ax, 3, R[4][0], 24, 7.5, "Застосування фільтрів\n(період, клієнт, сума)")

    arrow(ax, (51, R[0][0]), (51, R[1][1]))
    arrow(ax, (51, R[1][0]), (51, R[2][0] + 3.75 + DN / 2))
    arrow(ax, (51, R[2][0] + 3.75 - DN / 2), (51, R[3][1]), "так",
          lpos=(55, R[3][1] + 1.4))
    arrow(ax, (51, R[3][0]), (51, R[4][0] + 3.75 + DN / 2))
    arrow(ax, (51, R[4][0] + 3.75 - DN / 2), (51, R[5][1]), "ні", lpos=(55, R[5][1] + 1.4))
    arrow(ax, (51, R[5][0]), (51, R[6][1]))
    arrow(ax, (51, R[6][0]), (51, R[7][1]))

    # гілка помилки (праворуч) -> повернення на авторизацію
    arrow(ax, (66, R[2][0] + 3.75), (76, R[2][0] + 3.75), "ні", lpos=(71, R[2][0] + 5.8))
    arrow(ax, (87.5, R[2][1]), (72, R[1][0] + 3.75), "повторний ввід",
          rad=-0.35, lpos=(91, R[1][0] + 5.0))

    # гілка фільтрів (ліворуч) -> повернення в список
    arrow(ax, (36, R[4][0] + 3.75), (27, R[4][0] + 3.75), "так", lpos=(31.5, R[4][0] + 5.8))
    arrow(ax, (15, R[4][0]), (30, R[5][0] + 3.75), "список\nоновлено",
          rad=0.3, lpos=(11, R[5][1] - 1.2))

    save(fig, "ris1_user_flow")


# --- Рисунок 2: стани кнопки ---------------------------------------------
def ris2():
    fig, ax = canvas(9.6, 6.4,
                     "Рисунок 2 - Діаграма станів елемента «Перерахувати прогноз»")
    W, H = 20, 8
    idle, hov, act = (8, 62), (40, 62), (72, 62)
    load = (40, 40)
    ok, err = (8, 12), (72, 12)

    box(ax, *idle, W, H, "Звичайний\n(idle)", bold=True)
    box(ax, *hov, W, H, "Наведений\n(hover)")
    box(ax, *act, W, H, "Натиснутий\n(active)")
    box(ax, *load, W, H, "Завантаження\n(loading)", fill=C_GREY)
    box(ax, *ok, W, H, "Успіх\n(success)", fill=C_OK)
    box(ax, *err, W, H, "Помилка\n(error)", fill=C_ERR)

    # початковий псевдостан
    ax.add_patch(Circle((16, 78), 2.0, facecolor="#202124", edgecolor="#202124"))
    ax.text(22, 78, "початок", ha="left", va="center", fontsize=8,
            color="#5f6368", style="italic")
    arrow(ax, (16, 76), (16, idle[1] + H))

    # верхній ряд: прямі переходи - над лінією, зворотні - під нею
    arrow(ax, (idle[0] + W, idle[1] + H / 2), (hov[0], hov[1] + H / 2),
          "наведення курсора", lpos=(34, 71))
    arrow(ax, (hov[0], hov[1] + H / 2 - 2.5), (idle[0] + W, idle[1] + H / 2 - 2.5),
          "курсор поза кнопкою", rad=-0.4, lpos=(34, 56))
    arrow(ax, (hov[0] + W, hov[1] + H / 2), (act[0], act[1] + H / 2),
          "натиснення", lpos=(66, 71))
    arrow(ax, (act[0], act[1] + H / 2 - 2.5), (hov[0] + W, hov[1] + H / 2 - 2.5),
          "відпускання без запиту", rad=-0.4, lpos=(66, 56))

    # перехід у завантаження і результати
    arrow(ax, (act[0] + 5, act[1]), (load[0] + W, load[1] + H),
          "запит надіслано", rad=-0.15, lpos=(85, 52))
    arrow(ax, (load[0] + 3, load[1]), (ok[0] + W - 2, ok[1] + H),
          "відповідь 200", lpos=(30, 31))
    arrow(ax, (load[0] + W - 3, load[1]), (err[0] + 2, err[1] + H),
          "помилка запиту", lpos=(63, 30))
    arrow(ax, (ok[0] + 6, ok[1] + H), (idle[0] + 6, idle[1]), "таймер 2 с",
          lpos=(23, 41))
    arrow(ax, (err[0] + W - 8, err[1] + H), (load[0] + W - 2, load[1]),
          "повторна спроба", rad=-0.35, lpos=(89, 34))
    arrow(ax, (err[0] + W - 4, err[1]), (idle[0] + 4, idle[1]),
          "скидання стану", rad=0.42, lpos=(56, 22))

    ax.text(50, 88, "Підпис стрілки - подія, що викликає перехід між станами",
            ha="center", fontsize=8, color="#5f6368", style="italic")
    ax.text(50, 4, "Зі станів «Успіх» і «Помилка» елемент повертається у «Звичайний» "
                   "після завершення показу результату\nабо після повторної спроби",
            ha="center", va="center", fontsize=8, color="#5f6368", style="italic",
            linespacing=1.4)
    save(fig, "ris2_button_states")


# --- Рисунок 3: стани панелі списку --------------------------------------
def ris3():
    fig, ax = canvas(9.6, 6.8,
                     "Рисунок 3 - Діаграма станів панелі списку замовлень")
    LW, LH = 26, 8
    load, data, empty, err = (37, 62), (4, 40), (37, 40), (70, 40)

    ax.add_patch(Circle((50, 84), 2.1, facecolor="#202124", edgecolor="#202124"))
    ax.text(53.5, 84, "початок", ha="left", va="center", fontsize=8,
            color="#5f6368", style="italic")
    arrow(ax, (50, 81.9), (50, load[1] + LH),
          "запит надіслано:\nвідкриття розділу або зміна фільтра", lpos=(64, 76))

    box(ax, *load, LW, LH, "Завантаження\n(скелетон)", fill=C_GREY, bold=True)
    box(ax, *data, LW, LH, "Дані отримано\n(таблиця + фільтри)", fill=C_OK)
    box(ax, *empty, LW, LH, "Порожній результат\n(порада змінити фільтр)", fill=C_DEC)
    box(ax, *err, LW, LH, "Помилка запиту\n(кнопка «Повторити»)", fill=C_ERR)

    arrow(ax, (42, load[1]), (data[0] + LW / 2 + 3, data[1] + LH),
          "відповідь 200,\nнепорожній масив", lpos=(26, 53))
    arrow(ax, (50, load[1]), (50, empty[1] + LH), "200, порожній масив", lpos=(50, 55))
    arrow(ax, (58, load[1]), (err[0] + LW / 2 - 3, err[1] + LH),
          "помилка мережі\nабо таймаут", lpos=(74, 53))

    arrow(ax, (data[0] + LW, data[1] + LH / 2), (load[0], load[1] + LH / 2),
          "зміна фільтра", rad=0.3, lpos=(30, 45))
    arrow(ax, (empty[0] + LW, empty[1] + LH - 1), (load[0] + 2, load[1]),
          "", lpos=(68, 46))
    arrow(ax, (err[0] + LW / 2, err[1] + LH), (load[0] + LW - 2, load[1]),
          "натиснуто «Повторити»", rad=0.12, lpos=(76, 60))

    ax.text(50, 28, "Перехід у стан «Завантаження» з будь-якого стану відбувається за подією\n"
                    "«зміна фільтра»; зі стану «Помилка» - також за кнопкою «Повторити»",
            ha="center", va="center", fontsize=8, color="#5f6368", style="italic",
            linespacing=1.4)
    save(fig, "ris3_panel_states")


if __name__ == "__main__":
    print("Генерую діаграми Розділу 1:")
    ris1()
    ris2()
    ris3()
    print(f"\nГотово. Файли у: {OUT}")
