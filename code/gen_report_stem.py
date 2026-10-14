# -*- coding: utf-8 -*-
"""Збірка пояснювальної записки STEM-проєкту у .docx.

Вимоги кафедри (SP_Front.pdf): A4, поля лів/верх/низ не менше 20 мм, прав не менше 10 мм,
Times New Roman 12, заголовки по центру, джерела в квадратних дужках за ДСТУ 8302:2015,
додатки з ілюстраціями.

Запуск: python code/gen_report_stem.py
"""
import os
import re
from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor
from PIL import Image

BASE = "C:/Users/alexm/Desktop/Study/Frontend/STEM_project"
DOCS = f"{BASE}/docs"
IMG = f"{BASE}/img"
OUT_DIR = f"{BASE}/report"
OUT = f"{OUT_DIR}/STEM_звіт_ІПЗ-31_1_варіант-6.docx"
SCRATCH = "C:/Users/alexm/AppData/Local/hermes/cache/scratch/report_media"

FONT = "Times New Roman"
MONO = "Consolas"

# Максимальні габарити рисунка на сторінці (см). Висоту виводимо з пропорцій,
# щоб жоден знімок не виліз за межі аркуша.
MAX_IMAGE_W_CM = 16.0
MAX_IMAGE_H_CM = 19.0

FIGURES = {
    "ris1_user_flow.png": "Діаграма користувацького шляху (user flow)",
    "ris2_button_states.png": "Діаграма станів кнопки «Перерахувати прогноз»",
    "ris3_panel_states.png": "Діаграма станів панелі списку замовлень",
    "ris4_wireframes.png": "Каркаси основних екранів застосунку",
}

SCREENSHOTS = [
    ("screens/ris5_login.png", "Екран входу в систему"),
    ("screens/ris6_orders_desktop.png", "Список замовлень (десктоп): фільтри, прогноз, кнопка «Експорт CSV»"),
    ("screens/ris7_order_card.png", "Картка замовлення: реквізити, прогноз і чинники впливу"),
    ("screens/ris8_order_card_recalc.png", "Картка після перерахунку прогнозу (стан кнопки змінився)"),
    ("screens/ris9_copy_link.png", "Копіювання посилання на замовлення"),
    ("screens/ris10_analytics.png", "Розділ «Аналітика»: метрики якості моделі та важливість ознак"),
    ("screens/ris11_users.png", "Розділ «Користувачі»: перелік користувачів і зміна ролі"),
    ("screens/ris12_orders_mobile.png", "Мобільний список замовлень (фрагмент, ширина 390 px)"),
]

# Дуже високі мобільні знімки показуємо зрозумілим фрагментом, а не стиснутою
# «ниткою»: обрізаємо до ділянки з картками замовлень.
CROPS = {
    "screens/ris12_orders_mobile.png": (0, 2280, 780, 3880),
}

# Рядки-мета з чернеток, які не мають потрапляти у фінальний документ.
SKIP_PATTERNS = [
    re.compile(r"^\*\*Перевірка перед поданням"),
    re.compile(r"^- \[ \]"),
    re.compile(r"^_{3,}$"),
    re.compile(r"^-{3,}$"),
    re.compile(r"^REPOSITORY"),
]

FIGURE_RE = re.compile(r"^\*\*Рисунок \d+\*\*\s*-\s*`img/([\w.\-]+)`")
HEAD_RE = re.compile(r"^(#{1,3})\s+(.*)$")
TABLE_ROW_RE = re.compile(r"^\|(.+)\|\s*$")
LIST_RE = re.compile(r"^([-*]|\d+\.)\s+(.*)$")

# Вивід консольних команд містить ANSI-послідовності кольору та керівні символи -
# у документі Word такі символи неприпустимі, тому їх прибираємо.
ANSI_RE = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]")
CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def clean(text: str) -> str:
    return CONTROL_RE.sub("", ANSI_RE.sub("", text))


def is_block_start(line: str) -> bool:
    """Чи починає рядок новий блок (заголовок, таблиця, рисунок, код, список)."""
    stripped = line.strip()
    if stripped == "":
        return True
    if HEAD_RE.match(line) or TABLE_ROW_RE.match(line) or FIGURE_RE.match(line):
        return True
    if line.startswith("```") or LIST_RE.match(line):
        return True
    return any(pattern.match(line) for pattern in SKIP_PATTERNS)


def setup_document() -> Document:
    document = Document()

    section = document.sections[0]
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.left_margin = Cm(2.5)
    section.right_margin = Cm(1.5)
    section.top_margin = Cm(2)
    section.bottom_margin = Cm(2)

    normal = document.styles["Normal"]
    normal.font.name = FONT
    normal.font.size = Pt(12)
    normal.element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
    normal.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    normal.paragraph_format.space_after = Pt(0)
    normal.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    normal.paragraph_format.first_line_indent = Cm(1.25)

    heading_sizes = {"Heading 1": 14, "Heading 2": 12, "Heading 3": 12}
    for name, size in heading_sizes.items():
        style = document.styles[name]
        style.font.name = FONT
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor(0, 0, 0)
        style.paragraph_format.first_line_indent = Cm(0)
        style.paragraph_format.space_before = Pt(12)
        style.paragraph_format.space_after = Pt(6)
        style.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
        style.paragraph_format.keep_with_next = True
        if name == "Heading 1":
            style.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
        else:
            style.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT

    return document


def add_page_number_footer(document: Document) -> None:
    footer = document.sections[0].footer
    paragraph = footer.paragraphs[0]
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run()
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = "PAGE"
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run._r.append(begin)
    run._r.append(instr)
    run._r.append(end)
    run.font.name = FONT
    run.font.size = Pt(12)


def add_inline(paragraph, text: str) -> None:
    """Додає текст із підтримкою **жирного** та `коду`."""
    text = clean(text)
    tokens = re.split(r"(\*\*[^*]+\*\*|`[^`]+`)", text)
    for token in tokens:
        if token == "":
            continue
        if token.startswith("**") and token.endswith("**"):
            run = paragraph.add_run(token[2:-2])
            run.bold = True
        elif token.startswith("`") and token.endswith("`"):
            run = paragraph.add_run(token[1:-1])
            run.font.name = MONO
            run.font.size = Pt(11)
        else:
            paragraph.add_run(token)


def add_paragraph(document, text: str, style=None, align=None, indent=None, space_after=None):
    paragraph = document.add_paragraph(style=style)
    if align is not None:
        paragraph.paragraph_format.alignment = align
    if indent is not None:
        paragraph.paragraph_format.first_line_indent = indent
    if space_after is not None:
        paragraph.paragraph_format.space_after = space_after
    add_inline(paragraph, text)
    return paragraph


def prepare_media(relative_path: str) -> str:
    """Повертає шлях до файлу рисунка, за потреби обрізаючи дуже високі знімки."""
    path = f"{IMG}/{relative_path}"
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    if relative_path not in CROPS:
        return path

    box = CROPS[relative_path]
    os.makedirs(SCRATCH, exist_ok=True)
    target = os.path.join(SCRATCH, os.path.basename(relative_path))
    with Image.open(path) as image:
        image.crop(box).save(target)
    return target


def add_image(document, relative_path: str, caption: str) -> None:
    path = prepare_media(relative_path)

    with Image.open(path) as image:
        width, height = image.size
    ratio = height / width if width else 1.0

    # Ширину виводимо з пропорцій і обмежуємо так, щоб висота вписалася в аркуш.
    width_cm = min(MAX_IMAGE_W_CM, MAX_IMAGE_H_CM / ratio) if ratio > 0 else MAX_IMAGE_W_CM

    paragraph = document.add_paragraph()
    paragraph.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    paragraph.paragraph_format.first_line_indent = Cm(0)
    paragraph.paragraph_format.space_before = Pt(6)
    # Рисунок і підпис мають лишатися на одній сторінці.
    paragraph.paragraph_format.keep_with_next = True
    paragraph.add_run().add_picture(path, width=Cm(width_cm))

    caption_paragraph = add_paragraph(
        document,
        caption,
        align=WD_ALIGN_PARAGRAPH.CENTER,
        indent=Cm(0),
        space_after=Pt(12),
    )
    caption_paragraph.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    caption_paragraph.paragraph_format.keep_together = True


def add_code_block(document, lines) -> None:
    for line in lines:
        paragraph = document.add_paragraph()
        paragraph.paragraph_format.first_line_indent = Cm(0)
        paragraph.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
        paragraph.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
        paragraph.paragraph_format.space_after = Pt(0)
        run = paragraph.add_run(clean(line.rstrip("\n")) or " ")
        run.font.name = MONO
        run.font.size = Pt(9)
        run.font.color.rgb = RGBColor(0x1F, 0x29, 0x37)


def add_table(document, rows) -> None:
    header, *body = rows
    table = document.add_table(rows=1, cols=len(header))
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER

    for index, cell_text in enumerate(header):
        cell = table.rows[0].cells[index]
        cell.text = ""
        paragraph = cell.paragraphs[0]
        paragraph.paragraph_format.first_line_indent = Cm(0)
        run = paragraph.add_run(clean(cell_text))
        run.bold = True
        run.font.name = FONT
        run.font.size = Pt(11)

    for row in body:
        cells = table.add_row().cells
        for index, cell_text in enumerate(row[: len(header)]):
            paragraph = cells[index].paragraphs[0]
            paragraph.paragraph_format.first_line_indent = Cm(0)
            add_inline(paragraph, cell_text)
            for run in paragraph.runs:
                if run.font.name != MONO:
                    run.font.name = FONT
                    run.font.size = Pt(11)

    document.add_paragraph().paragraph_format.space_after = Pt(6)


def convert_markdown(document, path: str, cut_before: str | None = None) -> None:
    with open(path, encoding="utf-8") as source:
        lines = source.read().split("\n")

    if cut_before is not None:
        for index, line in enumerate(lines):
            if line.startswith(cut_before):
                lines = lines[index:]
                break

    index = 0
    total = len(lines)
    while index < total:
        line = lines[index].rstrip()

        if line.strip() == "" or any(pattern.match(line) for pattern in SKIP_PATTERNS):
            index += 1
            continue

        figure = FIGURE_RE.match(line)
        if figure is not None:
            file_name = figure.group(1)
            number_match = re.search(r"\*\*Рисунок (\d+)\*\*", line)
            title = FIGURES.get(file_name, file_name)
            caption = f"Рисунок {number_match.group(1)} - {title}" if number_match else title
            add_image(document, file_name, caption)
            index += 1
            continue

        heading = HEAD_RE.match(line)
        if heading is not None:
            level = len(heading.group(1))
            text = heading.group(2).strip()
            if level == 1 and text.lower().startswith("розділ"):
                text = text.upper()
                if not text.startswith("РОЗДІЛ"):
                    text = "РОЗДІЛ " + text
            document.add_paragraph(text, style=f"Heading {level}")
            index += 1
            continue

        if line.startswith("```"):
            index += 1
            block = []
            while index < total and not lines[index].startswith("```"):
                block.append(lines[index])
                index += 1
            add_code_block(document, block)
            index += 1
            continue

        if TABLE_ROW_RE.match(line):
            rows = []
            while index < total and TABLE_ROW_RE.match(lines[index]):
                cells = [cell.strip() for cell in lines[index].strip().strip("|").split("|")]
                if not all(re.fullmatch(r"-{2,}|:?-+:?", cell) for cell in cells):
                    rows.append(cells)
                index += 1
            if rows:
                add_table(document, rows)
            continue

        list_match = LIST_RE.match(line)
        if list_match is not None:
            marker, text = list_match.group(1), list_match.group(2)
            index += 1
            # Продовження пункту списку (з відступом) приєднуємо до того самого абзацу.
            while index < total:
                nxt = lines[index]
                if nxt.strip() == "" or is_block_start(nxt):
                    break
                if nxt[:1] not in (" ", "\t"):
                    break
                text = f"{text} {nxt.strip()}"
                index += 1
            style = "List Number" if marker[0].isdigit() else "List Bullet"
            paragraph = document.add_paragraph(style=style)
            paragraph.paragraph_format.first_line_indent = Cm(0)
            paragraph.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
            paragraph.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            add_inline(paragraph, text)
            continue

        # Абзац: збираємо розірвані рядки в один абзац.
        parts = [line.strip()]
        index += 1
        while index < total and not is_block_start(lines[index]):
            parts.append(lines[index].strip())
            index += 1
        add_paragraph(document, " ".join(parts))


def add_title_page(document) -> None:
    def centered(text, size=12, bold=False, space_after=0):
        paragraph = document.add_paragraph()
        paragraph.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
        paragraph.paragraph_format.first_line_indent = Cm(0)
        paragraph.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
        paragraph.paragraph_format.space_after = Pt(space_after)
        run = paragraph.add_run(text)
        run.bold = bold
        run.font.size = Pt(size)
        run.font.name = FONT
        return paragraph

    centered("МІНІСТЕРСТВО ОСВІТИ І НАУКИ УКРАЇНИ", 12)
    centered("КИЇВСЬКИЙ НАЦІОНАЛЬНИЙ УНІВЕРСИТЕТ ІМЕНІ ТАРАСА ШЕВЧЕНКА", 12, bold=True)
    centered("ФАКУЛЬТЕТ ІНФОРМАЦІЙНИХ ТЕХНОЛОГІЙ", 12)
    centered("Кафедра програмних систем і технологій", 12, space_after=120)

    centered("ІНДИВІДУАЛЬНИЙ STEM-ПРОЄКТ", 14, bold=True, space_after=12)
    centered("з дисципліни «Розробник фронтенду програмних систем»", 12, space_after=24)
    centered("на тему:", 12)
    centered(
        "«Розроблення клієнтської частини системи підтримки ухвалення рішень "
        "щодо B2B-замовлень засобами React»",
        13,
        bold=True,
        space_after=96,
    )

    student = document.add_paragraph()
    student.paragraph_format.first_line_indent = Cm(0)
    student.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    student.paragraph_format.space_after = Pt(6)
    student.add_run("Виконав: студент групи ІПЗ-31 (підгрупа 1) Олександр МАРКГРАФ").font.name = FONT

    teacher = document.add_paragraph()
    teacher.paragraph_format.first_line_indent = Cm(0)
    teacher.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    teacher.paragraph_format.space_after = Pt(96)
    teacher.add_run("Перевірила: Ірина ЮРЧУК").font.name = FONT

    centered("Київ - 2026", 12)

    document.add_page_break()


def add_toc(document) -> None:
    # «ЗМІСТ» набираємо звичайним абзацом, а не стилем Heading 1, щоб поле змісту
    # не включало сам себе у перелік.
    title = document.add_paragraph()
    title.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.paragraph_format.first_line_indent = Cm(0)
    title.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    title.paragraph_format.space_after = Pt(12)
    run = title.add_run("ЗМІСТ")
    run.bold = True
    run.font.name = FONT
    run.font.size = Pt(14)

    paragraph = document.add_paragraph()
    paragraph.paragraph_format.first_line_indent = Cm(0)
    field_run = paragraph.add_run()
    field = OxmlElement("w:fldSimple")
    field.set(qn("w:instr"), r'TOC \o "1-3" \h \z \u')
    field_run._r.append(field)
    document.add_page_break()


def add_intro(document) -> None:
    document.add_paragraph("ВСТУП", style="Heading 1")
    paragraphs = [
        "Метою роботи є розроблення клієнтської частини системи підтримки ухвалення рішень щодо "
        "B2B-замовлень засобами React. Продукт призначений для менеджерів B2B-продажів, які "
        "щодня працюють із десятками замовлень і не мають надійного способу визначити, за які "
        "з них братися першими. Зміст і вимоги до роботи визначено методичними вказівками "
        "дисципліни [1].",
        "Об'єктом дослідження є процес ухвалення рішень під час опрацювання B2B-замовлень, "
        "предметом - клієнтська частина програмної системи, що підтримує цей процес. Тему "
        "обрано в межах напрямів наукової діяльності кафедри програмних систем і технологій [2].",
        "Для досягнення мети поставлено такі завдання: проаналізувати сценарії користувачів і "
        "спроєктувати структуру екранів; обрати технологічний стек і обґрунтувати вибір; "
        "реалізувати основні екрани, стани інтерфейсу та експорт результатів; забезпечити "
        "адаптивність, доступність і захищеність клієнтської частини; підтвердити "
        "працездатність автоматичними тестами й перевіркою в реальному браузері.",
        "Записка складається з трьох розділів. У першому наведено результати проєктування: "
        "діаграма користувацького шляху та діаграми станів елементів інтерфейсу з вербальним "
        "описом. У другому - опис програмної реалізації: інструменти, архітектура, прийоми "
        "адаптивності, кросбраузерності, захищеності й тестування. Третій розділ є керівництвом "
        "користувача. Додатки містять екранні знімки та вивід команд збірки, лінтера й тестів. "
        "Оформлення списку джерел виконано відповідно до ДСТУ 8302:2015 [3].",
    ]
    for text in paragraphs:
        add_paragraph(document, text)
    document.add_page_break()


def add_appendix_screenshots(document) -> None:
    document.add_paragraph("ДОДАТОК А. Екранні знімки застосунку", style="Heading 1")
    add_paragraph(
        document,
        "Знімки зроблено з реально запущеного застосунку в браузері Chromium (Microsoft Edge) "
        "після входу під демонстраційним адміністратором; помилок у консолі браузера - 0.",
    )
    for index, (relative, caption) in enumerate(SCREENSHOTS, start=5):
        add_image(document, relative, f"Рисунок {index} - {caption}")
    document.add_page_break()


def add_appendix_commands(document) -> None:
    document.add_paragraph("ДОДАТОК Б. Вивід команд збірки, лінтера й тестів", style="Heading 1")
    add_paragraph(
        document,
        "Нижче наведено фактичний вивід команд, виконаних у каталозі app/ "
        "(скорочено лише шляхи до файлів збірки).",
    )
    sections = [
        ("Збірка: npm run build", "build.txt"),
        ("Лінтер: npm run lint", "lint.txt"),
        ("Тести з покриттям: npm test", "test.txt"),
    ]
    for title, file_name in sections:
        document.add_paragraph(title, style="Heading 3")
        path = f"{BASE}/code/command-output/{file_name}"
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8", errors="replace") as source:
            lines = source.read().split("\n")
        if file_name == "test.txt":
            keep = [
                line
                for line in lines
                if re.search(r"Test Files|Tests |Duration|ERROR|FAIL|% Stmts|Statements|Branches|Functions|Lines|All files", line)
            ]
            lines = keep if keep else lines
        add_code_block(document, lines[:80])


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    document = setup_document()
    add_page_number_footer(document)
    add_title_page(document)
    add_toc(document)
    add_intro(document)
    convert_markdown(document, f"{DOCS}/РОЗДІЛ1_проєктування.md")
    convert_markdown(document, f"{DOCS}/РОЗДІЛ2_програмна_реалізація.md")
    convert_markdown(document, f"{DOCS}/РОЗДІЛ3_користувацьке_керівництво.md")
    convert_markdown(document, f"{DOCS}/ВИСНОВКИ.md")
    document.add_page_break()
    document.add_paragraph("СПИСОК ВИКОРИСТАНИХ ДЖЕРЕЛ", style="Heading 1")
    convert_markdown(document, f"{DOCS}/ДЖЕРЕЛА.md", cut_before="1. Індивідуальний STEM-проєкт")
    add_appendix_screenshots(document)
    add_appendix_commands(document)
    document.save(OUT)
    print("saved:", OUT)
    print("розмір:", round(os.path.getsize(OUT) / 1024), "КБ")


if __name__ == "__main__":
    main()
