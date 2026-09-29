"""Convert blog_draft.md into a rendered HTML page whose select-all + copy
pastes into Medium with headings/bold/lists/code/IMAGES preserved.
Screenshots from ../screenshots are embedded as base64 <figure>s."""
import base64
import html
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(os.path.dirname(HERE), "screenshots")
src = open(os.path.join(HERE, "blog_draft.md"), encoding="utf-8").read()
src = re.sub(r"\*Medium-ready draft.*?at the end\)\.\*", "", src, flags=re.S)

# ---- replace [SCREENSHOT: …] markers with embedded figures ----------------
SHOT_MAP = [
    ("Executive Command Center", "executive.png"),
    ("WSL terminal", "hdfs_terminal.png"),
    ("Data Quality dashboard", "data_quality.png"),
    ("Spark vs Python comparison", "dual_pipeline.png"),
    ("Demand Forecast dashboard", "forecast.png"),
    ("Recommendations page", "recommendations.png"),
    ("Live network map", "live_map.png"),
    ("What-If simulator", "what_if.png"),
]

def figure_for(desc, caption):
    fname = next((f for key, f in SHOT_MAP if key.lower() in desc.lower()), None)
    if not fname or not os.path.exists(os.path.join(SHOTS, fname)):
        return f"<p><strong>[screenshot missing: {html.escape(desc)}]</strong></p>"
    b64 = base64.b64encode(open(os.path.join(SHOTS, fname), "rb").read()).decode()
    return ("<figure style='margin:32px 0'>"
            f"<img src='data:image/png;base64,{b64}' style='width:100%;border-radius:8px'/>"
            f"<figcaption style='text-align:center;color:#666;font-size:15px;margin-top:8px'>"
            f"{html.escape(caption)}</figcaption></figure>")

figures = []
src = re.sub(r'\[SCREENSHOT:\s*(.*?)\s*—\s*caption:\s*"(.*?)"\]',
             lambda m: (figures.append(figure_for(m.group(1), m.group(2))),
                        f"\n\nFIGTOKEN{len(figures)-1}\n\n")[1],
             src, flags=re.S)


def inline(t):
    t = html.escape(t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<!\*)\*([^*]+?)\*(?!\*)", r"<em>\1</em>", t)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    return t


out, para, in_code, in_table = [], [], False, False


def flush():
    global para
    if para:
        t = " ".join(para).strip()
        if t:
            out.append("<p>" + inline(t) + "</p>")
        para = []


for ln in src.split("\n"):
    if ln.startswith("```"):
        flush()
        out.append("<pre><code>" if not in_code else "</code></pre>")
        in_code = not in_code
        continue
    if in_code:
        out.append(html.escape(ln))
        continue
    if ln.startswith("|"):
        flush()
        cells = [c.strip() for c in ln.strip("|").split("|")]
        if re.match(r"^[-: ]+$", "".join(cells)):
            continue
        if not in_table:
            out.append('<table border="1" cellpadding="6" style="border-collapse:collapse">')
            in_table = True
        out.append("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in cells) + "</tr>")
        continue
    elif in_table:
        out.append("</table>")
        in_table = False
    if ln.startswith("# "):
        flush(); out.append("<h1>" + inline(ln[2:]) + "</h1>")
    elif ln.startswith("## "):
        flush(); out.append("<h2>" + inline(ln[3:]) + "</h2>")
    elif ln.startswith("- "):
        flush(); out.append("<p>&bull; " + inline(ln[2:]) + "</p>")
    elif re.match(r"^\d+\. ", ln):
        flush(); out.append("<p><strong>" + inline(ln) + "</strong></p>")
    elif ln.strip() in ("---", ""):
        flush()
    else:
        para.append(ln)
flush()

body = "\n".join(out)
for i, fig in enumerate(figures):
    body = body.replace(f"<p>FIGTOKEN{i}</p>", fig)

doc = ("<!doctype html><html><head><meta charset='utf-8'>"
       "<title>UrbanTransit IQ blog — Medium paste source</title><style>"
       "body{font-family:Georgia,serif;max-width:740px;margin:40px auto;"
       "padding:0 20px;line-height:1.7;font-size:18px;color:#222}"
       "pre{background:#f4f4f4;padding:14px;overflow-x:auto;font-size:14px;line-height:1.45}"
       "code{background:#f4f4f4;padding:1px 5px;font-size:15px}"
       "h1{line-height:1.25}</style></head><body>" + body + "</body></html>")
path = os.path.join(HERE, "blog_medium.html")
open(path, "w", encoding="utf-8").write(doc)
print("written:", path, len(doc), "chars")
