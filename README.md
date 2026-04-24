# P.R.O.S.E. — Problem Review & Online Submission Engine

A full-stack web platform for math competition organizers to write, review, organize, and finalize competition problems. Built with React, Node.js, Prisma, and PostgreSQL.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/6NrI0B?referralCode=xEPLsf&utm_medium=integration&utm_source=template&utm_campaign=generic)

---

## Features

- **Problem authoring** with LaTeX/KaTeX rendering
- **Feedback & review** system for problem vetting
- **Exam builder** — drag-and-drop problems onto exams by type
- **Admin dashboard** — manage users, problems, and exams
- **Role-based access** — admins vs. contributors
- **Invite-code registration** — keep your platform closed to your team
- **Email domain restriction** — optionally limit signups to your org's domain

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| ORM | Prisma |
| Database | PostgreSQL |
| Hosting | Railway (recommended) |

---

## Deploying on Railway

### 1. Click the deploy button

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/6NrI0B?referralCode=xEPLsf&utm_medium=integration&utm_source=template&utm_campaign=generic)

This will create a Railway project with the server and a PostgreSQL database pre-configured.

### 2. Set environment variables

In your P.R.O.S.E. service's **Variables** tab, add the following:

#### Required

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Railway auto-fills if you link the DB service) | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Long random string for signing auth tokens | `openssl rand -hex 32` |
| `INVITE_CODE` | Code users must enter to register | `myteam2025` |
| `RESET_CODE` | Admin-issued code for password resets | `resetme123` |
| `CLIENT_URL` | Full URL of your frontend service | `https://yourapp.up.railway.app` |
| `NODE_ENV` | Set to `production` | `production` |
| `PORT` | Port the server listens on | `3001` |

#### Org-specific (customize these for your tournament)

| Variable | Description | Example |
|---|---|---|
| `ADMIN_EMAILS` | Comma-separated list of admin email addresses | `alice@uni.edu,bob@uni.edu` |
| `TOPICS` | Comma-separated list of problem topics | `Algebra,Combinatorics,Number Theory,Geometry` |
| `ALLOWED_EMAIL_DOMAIN` | If set, restricts registration to this domain. Leave unset to allow any email. | `uni.edu` |
| `GUEST_EMAIL` | *(Optional)* A shared guest account email for walk-in contributors | `guest@uni.edu` |

### 3. Run database migrations

After the first deploy, open your P.R.O.S.E. service's **Shell** tab and run:

```bash
npx prisma migrate deploy
```

This applies all Prisma migrations to your PostgreSQL database.

### 4. Deploy

Railway will automatically build and deploy on every push to `main`. Your app will be live at the domain shown in the Railway dashboard.

---

## Local Development

### Prerequisites

- Node.js 18+
- Docker (for local PostgreSQL)

### Setup

```bash
# Clone the repo
git clone https://github.com/arpituppal2/LAMT-PROSE.git
cd LAMT-PROSE

# Start local PostgreSQL
docker-compose up -d

# Install dependencies
npm install           # root
cd client && npm install
cd ../server && npm install

# Set up server environment
cd server
cp .env.example .env  # then fill in values (see below)

# Run migrations
npx prisma migrate dev

# Start everything
cd ..
npm run dev
```

### Local `.env` for `server/`

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mathplatform
JWT_SECRET=your-local-secret
INVITE_CODE=localdev
RESET_CODE=localreset
CLIENT_URL=http://localhost:5173
NODE_ENV=development
PORT=3001

# Org-specific (optional locally)
ADMIN_EMAILS=you@example.com
TOPICS=Algebra,Combinatorics,Number Theory,Geometry
ALLOWED_EMAIL_DOMAIN=
GUEST_EMAIL=
```

The frontend dev server runs on `http://localhost:5173` and proxies API requests to `http://localhost:3001`.

---

## Project Structure

```
LAMT-PROSE/
├── client/                  # React frontend (Vite)
│   └── src/
│       ├── pages/           # Route-level components
│       ├── components/      # Shared UI components
│       └── styles/          # Global CSS / Tailwind config
├── server/                  # Express backend
│   ├── prisma/              # Prisma schema & migrations
│   └── src/
│       ├── config/env.js    # Central env var config (edit here for new vars)
│       ├── middleware/      # Auth middleware
│       └── routes/          # API route handlers
└── docker-compose.yml       # Local PostgreSQL
```

---

## Adding a New Org-Specific Variable

1. Add it to Railway's **Variables** tab
2. Export it from `server/src/config/env.js`
3. Import and use it in whichever route needs it

---

## Database Schema (Tables)

| Table | Description |
|---|---|
| `User` | Registered contributors and admins |
| `Problem` | Competition problems with metadata |
| `Feedback` | Review comments on problems |
| `Test` | Exams composed of problems |
| `TestComment` | Comments on exam-level decisions |
| `Notification` | In-app notifications |
| `_ProblemToTest` | Many-to-many join for problems ↔ exams |
