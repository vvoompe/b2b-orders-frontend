# -*- coding: utf-8 -*-
"""Конвертація зібраного .docx у .pdf через MS Word із оновленням змісту та нумерації.

Шляхи містять кирилицю, тому команда PowerShell передається у вигляді
-EncodedCommand (UTF-16LE + base64) - так кодування не залежить від кодової сторінки
консолі Windows.

Скрипт працює з ВЛАСНИМ екземпляром Word: якщо процес WINWORD уже запущено в системі
(наприклад, користувач редагує свій документ), ми не завершуємо його - закриваємо лише
власний документ. Виклик New-Object -ComObject Word.Application приєднується до наявного
екземпляра, тож Quit() міг би закрити чужий Word; тому Quit виконується тільки тоді,
коли процесу WINWORD до запуску не було.
"""
import base64
import os
import subprocess

BASE = "C:/Users/alexm/Desktop/Study/Frontend/STEM_project"
DOCX = f"{BASE}/report/STEM_звіт_ІПЗ-31_1_варіант-6.docx"
PDF = f"{BASE}/report/STEM_звіт_ІПЗ-31_1_варіант-6.pdf"

SCRIPT = f"""
$ErrorActionPreference = 'Stop'

# Чи був Word запущений до нас: якщо так - не завершуємо чужий процес.
$preExisting = @(Get-Process -Name WINWORD -ErrorAction SilentlyContinue).Count -gt 0

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $word.Documents.Open("{DOCX}", $false, $false)
try {{
  if ($doc.TablesOfContents.Count -gt 0) {{ $doc.TablesOfContents.Item(1).Update() }}
  $doc.Fields.Update() | Out-Null
  $doc.Save()
  $doc.ExportAsFixedFormat("{PDF}", 17)
  Write-Output "PDF_OK"
}} finally {{
  $doc.Close(0)
  if (-not $preExisting) {{ $word.Quit() }}
}}
"""


def main() -> None:
    if not os.path.exists(DOCX):
        raise FileNotFoundError(DOCX)

    # Word відмовляється перезаписувати наявний PDF (сприймає його як захищений від
    # запису), тому прибираємо попередній результат перед експортом.
    if os.path.exists(PDF):
        os.remove(PDF)

    encoded = base64.b64encode(SCRIPT.encode("utf-16-le")).decode("ascii")
    result = subprocess.run(
        ["powershell", "-NoProfile", "-NonInteractive", "-EncodedCommand", encoded],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    print("exit:", result.returncode)
    print("stdout:", (result.stdout or "").strip()[:400])
    if result.stderr:
        print("stderr:", result.stderr.strip()[:800])

    if os.path.exists(PDF):
        print("pdf:", PDF)
        print("розмір:", round(os.path.getsize(PDF) / 1024), "КБ")


if __name__ == "__main__":
    main()
