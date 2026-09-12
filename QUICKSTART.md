# QuizNexa - Quick Start Guide

## Installation Steps

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Setup Database
```bash
npm run db:push
```

This creates the SQLite database and initializes all tables.

### Step 3: Seed Demo Data (Optional)
```bash
npm run seed
```

This creates:
- Admin account: `admin@college.edu` / `adminpass123`
- Controller account: `controller@college.edu` / `password123`
- Sample individual quiz
- Sample team quiz
- Sample task for controller

### Step 4: Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Quick Navigation

### For Admins
1. Go to login page
2. Select "ADMIN" tab
3. Enter: `admin@college.edu` / `adminpass123`
4. Access admin dashboard to:
   - Add new controllers
   - Create quizzes
   - View all results
   - Manage system

### For Controllers
1. Go to login page
2. Select "CONTROLLER" tab
3. Enter: `controller@college.edu` / `password123`
4. Access controller dashboard to:
   - Create and manage quizzes
   - View assigned tasks
   - Monitor student progress

### For Students
1. Go to login page
2. Select "STUDENT" tab (default)
3. Enter any email and name
4. Browse available quizzes
5. Choose individual or team mode
6. Start quiz and submit answers
7. View results

---

## Key Features Explained

### Individual Quizzes
- Student takes quiz alone
- Timer starts when quiz begins
- Answers submitted at the end
- Immediate scoring

### Team Quizzes
- Create or join a team by entering team name
- Multiple students can access same team name
- All team members work together
- Score is recorded for the team

### Admin Dashboard
- **Dashboard**: Overview of controllers, quizzes, and attempts
- **Controllers**: Manage controller accounts
- **Quizzes**: View and manage all quizzes
- **Results**: Analyze quiz performance

### Controller Dashboard
- **Dashboard**: Overview of personal quizzes and tasks
- **My Quizzes**: Create and manage quizzes
- **Tasks**: View tasks assigned by admin

---

## Security Notes

⚠️ **Development Only**
- Passwords are stored in plaintext (for demo)
- JWT secret is public (change in production)
- No HTTPS enforcement (enable in production)

### To Make Production-Ready:
1. Install bcryptjs: `npm install bcryptjs`
2. Update password hashing in `/api/admin/controllers/add` route
3. Set strong JWT_SECRET in `.env.local`
4. Enable HTTPS
5. Add CSRF protection
6. Implement rate limiting
7. Add session timeouts

---

## Troubleshooting

### "Database Error" on startup
```bash
# Regenerate Prisma client
npm run db:generate

# Push schema again
npm run db:push
```

### Port 3000 already in use
```bash
# Use different port
npm run dev -- -p 3001
```

### Login not working
- Ensure you entered correct email/password
- Check that database has been seeded
- Try creating new student account (no password needed)

---

## Next Steps

1. **Customize Branding**
   - Update logo in Navbar.tsx
   - Change color scheme in Tailwind config
   - Update company name

2. **Add More Quizzes**
   - Admin → Create Quiz
   - Add questions with marks and negative marking

3. **Configure Controllers**
   - Admin → Add New Controller
   - Assign specific permissions

4. **Integrate with College SSO**
   - Update login endpoint
   - Connect to college authentication system

5. **Add Email Notifications**
   - SendGrid or similar service
   - Notify students of quiz results
   - Alert controllers of new tasks

---

## Demo Workflow

1. **Admin Setup**
   ```
   Login as admin → Add controller → Create quiz
   ```

2. **Controller Setup**
   ```
   Login as controller → See assigned quiz
   ```

3. **Student Attempt**
   ```
   Login as student → Select quiz → Choose individual/team → Attempt → Submit → View results
   ```

---

## Database Schema Quick Reference

```
User (Admin/Controller/Student)
  ↓
Quiz (Individual/Team)
  ↓
Question (Multiple choice)
  ↓
QuizAttempt (Individual or Team)
  ↓
TeamMember (if team quiz)
Task (Admin → Controller assignments)
AuditLog (Security tracking)
```

---

## Support

For issues or questions:
1. Check the README.md for detailed documentation
2. Review the code comments
3. Check browser console for errors
4. Check server logs in terminal

---

**Happy Quiz Taking! 🎓**
