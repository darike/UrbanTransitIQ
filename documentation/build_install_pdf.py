# -*- coding: utf-8 -*-
"""Generate the Installation / Execution / GitHub PDF matching the ACTUAL
React + FastAPI + Spark codebase (replaces the old Streamlit/utiq version)."""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, Image, Preformatted)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "Installation Instruction, Execution Instructions, GitHub Repository.pdf")
HDR = os.path.join(HERE, "_header.png")

NAVY = colors.HexColor("#1f3a68")
BLUE = colors.HexColor("#2563eb")
LIGHT = colors.HexColor("#eef3fb")
CODEBG = colors.HexColor("#f4f6fa")

ss = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=ss["Heading1"], textColor=NAVY, fontSize=16, spaceBefore=10, spaceAfter=6)
H2 = ParagraphStyle("H2", parent=ss["Heading2"], textColor=BLUE, fontSize=12.5, spaceBefore=10, spaceAfter=3)
BODY = ParagraphStyle("BODY", parent=ss["BodyText"], fontSize=10, leading=15, spaceAfter=5)
CODE = ParagraphStyle("CODE", parent=ss["Code"], fontSize=8.8, leading=12.5, textColor=colors.HexColor("#0b213f"))


def code(txt):
    return Table([[Preformatted(txt, CODE)]], colWidths=[168 * mm],
                 style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), CODEBG),
                                   ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#c9d4e8")),
                                   ("LEFTPADDING", (0, 0), (-1, -1), 8),
                                   ("TOPPADDING", (0, 0), (-1, -1), 6),
                                   ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))


def tbl(rows, widths, head=True):
    st = [("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#c9d4e8")),
          ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
          ("FONTSIZE", (0, 0), (-1, -1), 9),
          ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
          ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]
    if head:
        st += [("BACKGROUND", (0, 0), (-1, 0), NAVY), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
               ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
               ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT])]
    return Table(rows, colWidths=widths, style=TableStyle(st))


def header(canvas, doc):
    if os.path.exists(HDR):
        canvas.drawImage(HDR, 18 * mm, 275 * mm, width=174 * mm, height=16 * mm,
                         preserveAspectRatio=True, mask="auto")
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(colors.grey)
    canvas.drawCentredString(105 * mm, 10 * mm, "UrbanTransit IQ — TechWiz 7 · Aptech Shahrah-e-Faisal")
    canvas.drawRightString(192 * mm, 10 * mm, str(doc.page))


P = []
P.append(Paragraph("Installation Instructions", H1))
P.append(Paragraph("UrbanTransit IQ is a two-tier application: a <b>FastAPI</b> Python backend over a "
                   "Big-Data pipeline (Hadoop HDFS + Apache Spark / PySpark + Spark MLlib and an independent "
                   "Python / scikit-learn / XGBoost pipeline) and a <b>React (Vite)</b> single-page dashboard. "
                   "The stack follows the SRS software requirements.", BODY))

P.append(Paragraph("Prerequisites", H2))
P.append(tbl([["Tool", "Version", "Purpose"],
              ["Python", "3.12.x", "pipeline, ML models, FastAPI backend"],
              ["Node.js", "18+", "React frontend (Vite)"],
              ["Java (JDK)", "17", "Apache Spark / HDFS (run under WSL/Linux)"],
              ["Git", "any", "version control"]],
             [30 * mm, 28 * mm, 110 * mm]))
P.append(Spacer(1, 6))
P.append(Paragraph("Verify:", BODY))
P.append(code("python --version      # 3.12.x  (PySpark needs <=3.12, install from python.org)\n"
              "node -v               # v18+\njava -version         # 17.x  (WSL/Linux for Spark)"))

P.append(Paragraph("1. Python dependencies (pipeline + backend)", H2))
P.append(code("pip install -r backend/requirements.txt"))

P.append(Paragraph("2. Frontend dependencies (React)", H2))
P.append(code("npm install"))

P.append(Paragraph("3. Email delivery (optional)", H2))
P.append(Paragraph("Verification / reset codes. Copy <b>config/email.env.example</b> to "
                   "<b>config/email.env</b> and add Gmail App-Password creds for real email; "
                   "or run the bundled local mail server (offline demo); or leave unset and codes "
                   "appear on-screen + in reports/email_outbox.log.", BODY))

P.append(Paragraph("4. Hadoop / HDFS + Spark (evidence machine — WSL/Linux)", H2))
P.append(Paragraph("Windows has no Java, so the Spark/HDFS layer runs under WSL2 Ubuntu (Java 17, "
                   "Hadoop 3.4.1, PySpark 4.2). One-time setup and the four Spark jobs:", BODY))
P.append(code("bash hdfs_scripts/wsl_setup_spark.sh     # venv + PySpark\n"
              "bash hdfs_scripts/wsl_setup_hdfs.sh      # single-node HDFS + upload dataset\n"
              "bash hdfs_scripts/wsl_run_spark_jobs.sh  # ingest -> quality -> features -> MLlib\n"
              "bash hdfs_scripts/wsl_run_spark_on_hdfs.sh  # Spark reading/writing hdfs://"))
P.append(Paragraph("The day-to-day pipeline also runs natively on Windows via the equivalent "
                   "pandas/pyarrow engine (below); both produce identical data-quality counts.", BODY))

P.append(Paragraph("5. Database", H2))
P.append(Paragraph("SQLite, auto-created at <b>database/urbantransit.db</b> by the seed script "
                   "(no server). Delete the file to reset to a clean schema.", BODY))

P.append(Paragraph("Execution Instructions", H1))
P.append(Paragraph("Run the pipeline once (top to bottom), then start the two servers.", BODY))
P.append(Paragraph("A. Build data, models and app database", H2))
P.append(code("python data_generator/generate_dataset.py     # 2.06M-record dataset\n"
              "python python_pipeline/process.py             # clean + join + features -> Parquet\n"
              "python python_pipeline/train_models.py        # dual ML + forecast + clustering\n"
              "python recommendation_engine/generate_recommendations.py\n"
              "python database/seed.py                       # create DB + 4 demo accounts"))
P.append(Paragraph("B. Start the backend API (Swagger at /docs)", H2))
P.append(code("python -m uvicorn backend.src.main:app --port 8000\n"
              "# http://localhost:8000/docs"))
P.append(Paragraph("C. Start the React dashboard", H2))
P.append(code("npm run dev\n# http://localhost:5173"))
P.append(Paragraph("D. Run the tests", H2))
P.append(code("python -m pytest backend/tests -q             # 16 tests (data, models, auth, RBAC)"))

P.append(Paragraph("Login accounts (role-based access)", H2))
P.append(tbl([["Account", "Password", "Access level"],
              ["operator", "operator123", "Live operations: dashboards, delays, occupancy, recommendations, what-if"],
              ["analyst", "analyst123", "+ Spark-vs-Python lab, data quality, reports, CSV export"],
              ["evaluator", "evaluator123", "Read-everything jury account (all pages)"],
              ["admin", "admin123", "Full control + HDFS/Spark monitor, audit, user management"]],
             [26 * mm, 30 * mm, 112 * mm]))
P.append(Spacer(1, 4))
P.append(Paragraph("New users may self-register; the account is verified by an emailed 6-digit code "
                   "and is granted the Analyst role. Passwords are bcrypt-hashed; sessions use JWT; "
                   "roles are enforced server-side.", BODY))

P.append(Paragraph("GitHub Repository", H1))
P.append(Paragraph("Public repository (replace with your team's URL after the first push):", BODY))
P.append(code("https://github.com/<your-team>/urbantransit-iq\n\n"
              "# first push:\n"
              "git init\n"
              "git add .\n"
              'git commit -m "UrbanTransit IQ - Big Data & Data Science transport analytics"\n'
              "git branch -M main\n"
              "git remote add origin https://github.com/<your-team>/urbantransit-iq.git\n"
              "git push -u origin main"))
P.append(Paragraph("Large generated data (raw_data/, parquet_data/), node_modules/, the local "
                   "database and secrets (config/email.env) are git-ignored; 1,000-row samples of "
                   "every table are committed under sample_data/ and the dataset regenerates with "
                   "the command above.", BODY))

SimpleDocTemplate(OUT, pagesize=A4, topMargin=30 * mm, bottomMargin=16 * mm,
                  leftMargin=18 * mm, rightMargin=18 * mm).build(P, onFirstPage=header, onLaterPages=header)
print("written:", OUT)
