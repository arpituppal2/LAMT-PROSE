# LAMT COMPOSE - Los Angeles Math Tournament Problem Management Platform

A full-stack web application for managing math competition problems, test creation, and collaborative problem-solving workflows.

## ðŸš€ Tech Stack

- **Framework**: SvelteKit (TypeScript)
- **Database**: PostgreSQL via Prisma ORM
- **Authentication**: Custom session-based auth with bcrypt
- **Styling**: CSS with mint/green color palette
- **LaTeX Rendering**: KaTeX
- **Deployment**: Vercel/Railway compatible

## ðŸ“‹ Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Git

## ðŸ› ï¸ Installation & Setup

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url> lamt-compose
cd lamt-compose
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/lamt_compose"
REGISTRATION_CODE="LAMTOVERBMT"
SESSION_SECRET="your-very-long-random-secret-here-minimum-32-characters"
NODE_ENV="development"
```

**Important**: 
- Replace `username`, `password`, and database connection details with your PostgreSQL credentials
- Generate a secure `SESSION_SECRET` using: `openssl rand -base64 32`
- Never commit `.env` to version control (already in `.gitignore`)

### 3. Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database (development)
npx prisma db push

# Or run migrations (production)
npx prisma migrate dev --name init
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## ðŸ“¦ Production Deployment

### Vercel Deployment

1. **Push to GitHub**:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

2. **Deploy on Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Set environment variables in Vercel dashboard:
     - `DATABASE_URL`
     - `REGISTRATION_CODE`
     - `SESSION_SECRET`
   - Deploy

3. **Database Setup**:
   - Use Vercel Postgres, or external PostgreSQL (Supabase, Railway, Neon)
   - Run migrations: `npx prisma migrate deploy`

### Railway Deployment

1. **Connect Repository**:
   - Go to [railway.app](https://railway.app)
   - Create new project from GitHub repo

2. **Add PostgreSQL**:
   - Click "New" â†’ "Database" â†’ "Add PostgreSQL"
   - Railway auto-injects `DATABASE_URL`

3. **Set Environment Variables**:
   - `REGISTRATION_CODE=LAMTOVERBMT`
   - `SESSION_SECRET=<your-secret>`

4. **Deploy**:
   - Railway auto-deploys on push
   - Run migrations in Railway terminal: `npx prisma migrate deploy`

## ðŸ—‚ï¸ Project Structure

```
lamt-compose/
â”œâ”€â”€ .env.example              # Template for environment variables
â”œâ”€â”€ .gitignore
â”œâ”€â”€ README.md
â”œâ”€â”€ package.json
â”œâ”€â”€ prisma/
â”‚   â””â”€â”€ schema.prisma         # Database schema
â”œâ”€â”€ static/
â”‚   â””â”€â”€ uploads/              # Local image storage (production uses S3)
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ app.css               # Global styles
â”‚   â”œâ”€â”€ app.html              # HTML template
â”‚   â”œâ”€â”€ hooks.server.ts       # Authentication middleware
â”‚   â”œâ”€â”€ lib/
â”‚   â”‚   â”œâ”€â”€ components/       # Reusable Svelte components
â”‚   â”‚   â”œâ”€â”€ server/           # Server-only utilities (auth, db)
â”‚   â”‚   â””â”€â”€ utils.ts          # Shared utilities
â”‚   â””â”€â”€ routes/
â”‚       â”œâ”€â”€ +layout.svelte    # Root layout with sidebar
â”‚       â”œâ”€â”€ login/            # Login page
â”‚       â”œâ”€â”€ register/         # Registration with code verification
â”‚       â””â”€â”€ (app)/            # Protected routes (require auth)
â”‚           â”œâ”€â”€ +page.svelte             # Home/Profile
â”‚           â”œâ”€â”€ dashboard/               # User dashboard
â”‚           â”œâ”€â”€ problems/                # Problem CRUD
â”‚           â”œâ”€â”€ leaderboard/             # Scoring leaderboard
â”‚           â”œâ”€â”€ tests/                   # Test management
â”‚           â””â”€â”€ testsolve/               # Testsolving interface
â””â”€â”€ vite.config.ts
```

## ðŸ”‘ First User Registration

1. Navigate to `/register`
2. Fill in user details (Full Name, Initials, Email, Password, Background)
3. Click "Register"
4. Enter verification code: **LAMTOVERBMT**
5. Account activated!

## âš™ï¸ Key Features

### Problem Management
- **Write New Problems**: LaTeX editor with live preview
- **Image Manager**: Upload and organize problem images
- **Version History**: Track all problem edits
- **Feedback System**: Collaborative problem review

### Scoring & Leaderboard
- **On Test**: +6 points
- **Endorsed**: +5 points
- **Idea/Draft**: +3 points
- **Needs Review**: -2 points

### Test Creation
- Organize problems into tests
- Export tests as JSON for external systems
- Track test versions and coordinators

### LaTeX Support
- Inline math: `$E = mc^2$`
- Display math: `$$\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$`
- Custom macros: `\ans{42}` renders as boxed answer
- Image embedding: `\image{path/to/image.png}`

## ðŸ—„ï¸ Database Schema

### Core Models
- **User**: Authentication and profile
- **Problem**: Math problems with LaTeX content
- **ProblemVersion**: Edit history
- **Feedback**: Problem reviews and testsolves
- **Test**: Test collections
- **Session**: User sessions

## ðŸ” Security Features

- **Bcrypt password hashing** (12 rounds)
- **HttpOnly session cookies**
- **CSRF protection** via SvelteKit
- **Protected API routes** (401 unauthorized if not logged in)
- **Registration code gate** (prevents unauthorized signups)

## ðŸ§ª Testing

```bash
# Run Prisma Studio (database GUI)
npx prisma studio

# Check TypeScript types
npm run check

# Build for production
npm run build

# Preview production build
npm run preview
```

## ðŸ“ Scripts

```json
{
  "dev": "vite dev",
  "build": "vite build",
  "preview": "vite preview",
  "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
  "db:push": "prisma db push",
  "db:migrate": "prisma migrate dev",
  "db:studio": "prisma studio",
  "db:seed": "node prisma/seed.js"
}
```

## ðŸ› Troubleshooting

### Database Connection Issues
```bash
# Test PostgreSQL connection
psql -h localhost -U username -d lamt_compose

# Reset database (CAUTION: deletes all data)
npx prisma migrate reset
```

### Session Issues
- Clear cookies in browser
- Regenerate `SESSION_SECRET`
- Check that `hooks.server.ts` is properly reading sessions

### Build Errors
```bash
# Clear SvelteKit cache
rm -rf .svelte-kit

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## ðŸ“š Additional Resources

- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [KaTeX Documentation](https://katex.org/docs/supported.html)

## ðŸ¤ Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## ðŸ“„ License

MIT License - See LICENSE file for details

## ðŸ‘¥ Support

For LAMT-specific questions, contact: tournament@lamt.org

---

**Built for the Los Angeles Math Tournament** ðŸŽ“ðŸ“
