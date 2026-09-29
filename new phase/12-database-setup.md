# Phase 12 — Application Database Setup (PostgreSQL)
**Maps to SRS:** Section 1.9.2 point 5 (Database: MongoDB, PostgreSQL, MySQL, Firebase, SQLite, or another suitable database), Functional Req lxvii (Database Storage), lxviii (Model Version Tracking), lxix (Audit Trail)
**Folder:** `database/`
**Database chosen:** **PostgreSQL** (production) — **SQLite** as local/offline dev fallback (same schema works on both via SQLAlchemy)

## Goal
Set up the application-level relational database that stores everything that is NOT bulk transport data (that stays in Parquet/HDFS from Phases 1-11). The database holds: users/auth, audit trail, model version registry, recommendations, and saved reports — i.e. the operational/metadata layer the web app (Phase 13) reads and writes.

## ⚠️ Important distinction — Database vs Big Data files (do not confuse these)
| Data type | Where it lives | Why |
|---|---|---|
| Raw/cleaned transport data (tickets, trips, passenger counts, delays — millions of rows) | **Parquet files / HDFS** (Phases 1-11) | Big Data volume, analytical/batch workloads, Spark reads it directly |
| Application users + login credentials | **PostgreSQL** | Needs transactional integrity, relational auth logic |
| Audit trail of admin actions | **PostgreSQL** | Needs to be queryable, append-only, tamper-evident |
| Model version history (Spark + Python models) | **PostgreSQL** | Small structured metadata, needs to support lookups |
| Recommendation engine output | **PostgreSQL** | Small structured records the UI queries/filters constantly |
| Saved/exported report metadata | **PostgreSQL** | Small structured records |

Never try to put the 2,000,000+ row ticketing dataset into PostgreSQL as the primary store — that defeats the purpose of the Big Data pipeline the SRS requires. The database is for the app's own operational data, not the analytical dataset itself.

## Why PostgreSQL (over the other SRS-allowed options)
- Free, open-source, works identically in dev and in Render/Railway production hosting
- Strong relational integrity (foreign keys between users/audit_log/recommendations) — better fit than MongoDB/Firebase (NoSQL) for this structured, relationship-heavy metadata
- `psycopg2`/SQLAlchemy support in Python is mature and simple
- SQLite is used only as a zero-setup local fallback (same SQLAlchemy models work on both — you only change the connection string)

## ⚠️ Originality Requirement (applies to this phase — 0% plagiarism target)
This phase's code must be checked for originality before committing:
- Do NOT paste boilerplate copied verbatim from tutorials, Stack Overflow, GitHub repos, or other teams' code. Codex-generated code is fine to use, but it must be adapted to THIS project's own schema (real table/column names below), real config values from `config/config.yaml`, and real roles/logic decided for UrbanTransit IQ — not generic placeholder examples.
- Rename generic variables/functions to match this project's own naming (e.g. `route_id`, `recommendation_id`, not `data1`/`x`/`foo`).
- Add at least one project-specific comment per file explaining the logic in your own words.
- Declaring Codex/AI usage in `AI_USAGE.md` (Phase 15) is still mandatory and does NOT count as plagiarism.

## Steps

### 12.1 Install & Run PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y postgresql postgresql-contrib
sudo service postgresql start

# Create the project database + user
sudo -u postgres psql -c "CREATE DATABASE urbantransit_iq;"
sudo -u postgres psql -c "CREATE USER utiq_admin WITH PASSWORD 'change_this_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE urbantransit_iq TO utiq_admin;"
```
> If PostgreSQL cannot be installed on the competition machine, fall back to SQLite for local development (`database/urbantransit_iq.db`, zero setup) — but deploy with real PostgreSQL in production (Render/Railway both offer free managed PostgreSQL). Document whichever path you took in the Development Log.

### 12.2 Connection Config
Create `backend/.env` (never commit this — add to `.gitignore`):
```
DATABASE_URL=postgresql://utiq_admin:change_this_password@localhost:5432/urbantransit_iq
JWT_SECRET_KEY=<generate a long random string>
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60
```
Create `backend/.env.example` (this ONE gets committed, with placeholder values, so teammates know what to fill in).

Create `database/db.py`:
```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./database/urbantransit_iq.db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 12.3 Schema — SQLAlchemy Models
Create `database/models.py` with these tables (also mirror as raw SQL in `database/schema.sql` for the Project Report's "Database Design" section):

**`users`**
| Column | Type | Notes |
|---|---|---|
| id | Integer, PK | |
| username | String, unique | |
| password_hash | String | bcrypt via passlib, never store plaintext |
| role | String | one of: Administrator, Operator, Analyst, Evaluator |
| created_at | DateTime | default now |
| is_active | Boolean | default True |

**`audit_log`**
| Column | Type | Notes |
|---|---|---|
| id | Integer, PK | |
| user_id | Integer, FK → users.id | who performed the action |
| action | String | e.g. "threshold_change", "recompute_triggered", "user_created" |
| details | JSON/Text | free-form context (what changed, old/new value) |
| timestamp | DateTime | default now |

**`model_registry`**
| Column | Type | Notes |
|---|---|---|
| id | Integer, PK | |
| model_name | String | e.g. "delay_prediction" |
| pipeline | String | "spark" or "python" |
| version | Integer | auto-increment per model_name+pipeline |
| trained_date | DateTime | |
| metrics | JSON | accuracy/F1/MAE/RMSE etc. |
| file_path | String | path to saved model artifact |

**`recommendations`**
| Column | Type | Notes |
|---|---|---|
| id | Integer, PK | matches `recommendation_id` from Phase 11 |
| route_id | String | |
| action | Text | recommended action text |
| reason | JSON | the evidence object from Phase 11 |
| priority | String | Low/Medium/High/Critical |
| generated_on | DateTime | |
| status | String | "open", "acknowledged", "implemented" (Operator/Admin can update) |

**`saved_reports`**
| Column | Type | Notes |
|---|---|---|
| id | Integer, PK | |
| report_type | String | e.g. "delay_report", "route_performance" |
| generated_by | Integer, FK → users.id | |
| format | String | "csv" or "pdf" |
| generated_at | DateTime | |
| file_path | String | where the export was saved, if persisted |

Write the SQLAlchemy `class User(Base): __tablename__ = "users"` etc. for all 5 tables, with proper `relationship()` links (e.g. `audit_log.user_id` → `User`).

### 12.4 Migrations
Use **Alembic** (recommended over manually re-running `Base.metadata.create_all()` every time, since the schema will evolve):
```bash
pip install alembic
cd backend
alembic init alembic
# edit alembic.ini and alembic/env.py to point at database/models.py's Base and DATABASE_URL
alembic revision --autogenerate -m "Initial schema: users, audit_log, model_registry, recommendations, saved_reports"
alembic upgrade head
```
Every schema change from here on (e.g. adding a `status` column later) goes through a new Alembic revision — this also nicely demonstrates real engineering practice to evaluators.

### 12.5 Seed Data
Create `database/seed_db.py` — inserts:
- 1 Administrator account
- 1 Operator account
- 1 Analyst account
- 1 Evaluator account (this becomes your documented "evaluator credentials" for Phase 15 submission)
All with hashed passwords (never plaintext), printed once to console/`documentation/demo_credentials.md` (gitignored if it contains real passwords for a live deployment — use placeholder-safe demo passwords only).

### 12.6 Security Basics (SRS: "must be addressed in accordance with applicable data protection regulations")
- Passwords: bcrypt hash only, never plaintext, never logged.
- `.env` / real credentials: in `.gitignore`, never committed.
- Least privilege: the `utiq_admin` DB user should only have privileges on the `urbantransit_iq` database, not superuser.
- Parameterized queries only (SQLAlchemy ORM handles this by default — never build raw SQL with f-strings/string concatenation from user input, to avoid SQL injection).
- `audit_log` is append-only from the application's perspective — no endpoint should ever UPDATE or DELETE an audit_log row.

### 12.7 Backup Note (mention in documentation, not necessarily automated for a 5-day competition)
Document in `documentation/bigdata_architecture.md` or a new `documentation/database_design.md` how you WOULD back this up in a real deployment (e.g. `pg_dump` scheduled nightly) — evaluators may ask about this even if you don't fully automate it.

## Deliverables Checklist
- [ ] PostgreSQL running locally (or SQLite fallback documented)
- [ ] `backend/.env.example` committed, real `.env` gitignored
- [ ] `database/db.py` — engine/session setup
- [ ] `database/models.py` — all 5 tables as SQLAlchemy models
- [ ] `database/schema.sql` — raw SQL mirror (for the Project Report)
- [ ] Alembic migrations set up and applied (`alembic upgrade head` succeeds)
- [ ] `database/seed_db.py` — seeds 4 demo accounts across all roles
- [ ] `documentation/database_design.md` — schema, ER diagram (mermaid), security notes, backup approach
- [ ] Development log entry

## Acceptance Criteria
- `alembic upgrade head` runs clean on a fresh empty database and creates all 5 tables.
- `python database/seed_db.py` creates exactly 4 users, one per role, with correctly hashed (not plaintext) passwords.
- You can log in via the API (built in Phase 13) using each seeded account and get back a role-correct JWT.
- No secret/password appears anywhere in the committed Git history (`git log -p | grep -i password` finds nothing real).

Next: **13-webapp-dashboards.md**
