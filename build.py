"""Baut aus den Dateien in src/ eine einzelne index.html (läuft ohne Server)."""
import pathlib
root = pathlib.Path(__file__).parent
src = root / "src"
html = (src / "template.html").read_text(encoding="utf-8")
for marker, name in [("/*CSS*/", "style.css"), ("/*DATA*/", "data.js"), ("/*ENGINE*/", "engine.js"), ("/*APP*/", "app.js")]:
    html = html.replace(marker, (src / name).read_text(encoding="utf-8"))
(root / "index.html").write_text(html, encoding="utf-8")
print("index.html gebaut:", len(html), "Zeichen")
