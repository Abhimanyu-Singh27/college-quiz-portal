# Development Guide - QuizNexa

## Setup & Installation

### Prerequisites
- Node.js 18+
- npm or yarn

### First Time Setup
```bash
# Clone/navigate to project
cd college-quiz-portal

# Install all dependencies
npm install

# Set up database
npm run db:push

# Seed demo data (optional)
npm run seed

# Start development server
npm run dev

# Open browser to http://localhost:3000
```

---

## Development Commands

### Database
```bash
# Push schema changes to database
npm run db:push

# Generate Prisma client after schema changes
npm run db:generate

# Seed demo data
npm run seed

# Open Prisma Studio (visual DB browser)
npx prisma studio
```

### Development Server
```bash
# Start dev server (default port 3000)
npm run dev

# Start on custom port
npm run dev -- -p 3001

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

---

## Project Structure Guide

### `/src/app/` - Next.js App Routes
Each folder corresponds to a URL path:

```
/src/app/
├── page.tsx                 → / (Login page)
├── admin/
│   ├── dashboard/page.tsx   → /admin/dashboard
│   ├── controllers/
│   │   ├── page.tsx         → /admin/controllers
│   │   └── add/page.tsx     → /admin/controllers/add
│   └── quizzes/
│       └── page.tsx         → /admin/quizzes
├── controller/
│   ├── dashboard/page.tsx   → /controller/dashboard
│   ├── quizzes/page.tsx     → /controller/quizzes
│   └── tasks/page.tsx       → /controller/tasks
├── student/
│   ├── quizzes/page.tsx     → /student/quizzes
│   └── quiz/
│       └── [id]/
│           ├── enter/page.tsx    → /student/quiz/[id]/enter
│           └── attempt/page.tsx  → /student/quiz/[id]/attempt
└── api/                     → API routes
    ├── auth/
    │   ├── login/route.ts   → POST /api/auth/login
    │   └── logout/route.ts  → POST /api/auth/logout
    ├── admin/
    │   └── controllers/
    │       └── add/route.ts → POST /api/admin/controllers/add
    └── quizzes/
        └── [id]/
            ├── route.ts     → GET /api/quizzes/[id]
            └── start/route.ts   → POST /api/quizzes/[id]/start
```

### `/src/lib/` - Utilities
- `auth.ts` - Authentication functions and session management
- `prisma.ts` - Prisma client instance

### `/src/components/` - Reusable Components
- `Navbar.tsx` - Header navigation component

### `/prisma/` - Database
- `schema.prisma` - Database schema definition
- `seed.ts` - Demo data seeding script
- PostgreSQL database - configured through `DATABASE_URL`

---

## Common Development Tasks

### Adding a New Page

1. **Create the folder structure** matching the URL path
2. **Create page.tsx** with your component
3. **Add to Navbar** if needed

Example:
```bash
# Create /student/results page
mkdir -p src/app/student/results
touch src/app/student/results/page.tsx
```

### Adding a New API Route

1. **Create route.ts** in appropriate folder
2. **Export functions** (GET, POST, PUT, DELETE, etc.)
3. **Handle requests** with NextResponse

Example: `/src/app/api/quizzes/create/route.ts`
```typescript
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Process request
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error message" }, { status: 500 });
  }
}
```

### Adding Database Model

1. **Update schema.prisma**
2. **Run `npm run db:push`** to create table
3. **Run `npm run db:generate`** to update client

Example:
```prisma
model Quiz {
  id    String  @id @default(cuid())
  title String
  // ... fields
}
```

### Protecting a Page

Use auth functions from `/src/lib/auth.ts`:

```typescript
import { requireAuth } from "@/lib/auth";

export default async function ProtectedPage() {
  // Redirect to / if not logged in
  const session = await requireAuth();
  
  // Redirect to /unauthorized if not admin
  // const session = await requireAdmin();
  
  return <div>Protected content: {session.name}</div>;
}
```

### Making Authenticated API Call

```typescript
const response = await fetch("/api/endpoint", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ data: "value" }),
});

const data = await response.json();
if (!response.ok) {
  console.error(data.error);
  return;
}
```

### Querying Database

```typescript
import { prisma } from "@/lib/prisma";

// In Server Component or API Route
const quizzes = await prisma.quiz.findMany({
  where: { isActive: true },
  include: {
    createdBy: { select: { name: true } },
    _count: { select: { questions: true } }
  },
  orderBy: { createdAt: "desc" }
});
```

---

## Database Relationships

### Understanding Relations

**One-to-Many: User → Quiz**
```typescript
// Get user with their quizzes
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { createdQuizzes: true }
});

// Get quiz with creator
const quiz = await prisma.quiz.findUnique({
  where: { id: quizId },
  include: { createdBy: true }
});
```

**Many-to-Many: Student ↔ Team**
```typescript
// Get team with members
const team = await prisma.team.findUnique({
  where: { id: teamId },
  include: { 
    members: { include: { user: true } }
  }
});
```

---

## Testing Locally

### Test Each Role

1. **Admin**
   - Login: admin@college.edu / adminpass123
   - Should see: Dashboard, Controllers, Quizzes

2. **Controller**
   - Login: controller@college.edu / password123
   - Should see: Dashboard, My Quizzes, Tasks

3. **Student**
   - Enter any email and name
   - No password needed
   - Should see: Quiz list, Quiz entry form

### Test Workflows

```
Admin: Create Quiz → Controller: View Quiz → Student: Attempt Quiz
```

### Check Database State

```bash
# Open Prisma Studio
npx prisma studio

# Browse all models
# Edit data directly
# See relationships visually
```

---

## Debugging Tips

### Enable Debug Logging

Add to environment:
```env
DEBUG=prisma:*
```

### Browser DevTools

- **Network tab**: Check API requests/responses
- **Console**: Check JavaScript errors
- **Application**: View cookies and session storage

### Server Logs

Check terminal where you ran `npm run dev`:
```
⚠️ Warnings appear in yellow
❌ Errors appear in red
ℹ️ Info appears in white
```

### Common Issues

**"Database error" on startup**
```bash
npm run db:push
npm run db:generate
```

**"Unauthorized" on protected pages**
- Check if logged in (check cookies)
- Check session token expiry
- Clear cookies: F12 → Application → Cookies → Delete

**API not responding**
- Check route file exists
- Check HTTP method matches (GET/POST/etc)
- Check request body format (JSON)

---

## Code Style Guidelines

### Component Structure
```typescript
"use client"  // if using client features

import { useRouter } from "next/navigation";

interface Props {
  // Define props
}

export default function ComponentName({ prop }: Props) {
  // Hooks
  const router = useRouter();
  
  // Handlers
  const handleClick = () => {};
  
  // Render
  return <div>Content</div>;
}
```

### API Route Structure
```typescript
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // Validate request
    const body = await req.json();
    
    // Check auth
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    // Process
    const result = await prisma.model.create({ data: {...} });
    
    // Return success
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
```

### Naming Conventions
- Components: PascalCase (ComponentName.tsx)
- Pages: page.tsx
- Routes: route.ts
- Variables: camelCase (userName)
- Constants: UPPER_SNAKE_CASE (API_KEY)
- Files/Folders: kebab-case (user-profile)

---

## Performance Tips

1. **Use Server Components** by default
2. **Only use "use client"** when needed
3. **Use `async` for DB queries**
4. **Optimize images** with Next.js Image component
5. **Use `include` instead of multiple queries** in Prisma
6. **Add `.take()` for pagination** on large datasets

---

## Deployment Checklist

- [ ] Update DATABASE_URL for production database
- [ ] Change JWT_SECRET to strong random value
- [ ] Set NODE_ENV=production
- [ ] Install and use bcryptjs for passwords
- [ ] Enable HTTPS
- [ ] Set secure cookies
- [ ] Add rate limiting
- [ ] Configure CORS if needed
- [ ] Set up database backups
- [ ] Monitor error logs

---

## Useful Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Documentation](https://react.dev)
- [MDN Web Docs](https://developer.mozilla.org/)

---

## Quick Reference

```bash
# Most common commands
npm run dev          # Start development
npm run db:push      # Update database
npm run seed         # Add demo data
npm run build        # Build for production
npx prisma studio   # Visual database browser

# Environment setup
cp .env.example .env.local
npm install
npm run db:push
npm run seed
npm run dev
```

---

**Happy Developing! 🚀**
