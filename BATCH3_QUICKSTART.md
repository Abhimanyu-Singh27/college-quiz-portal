# Batch 3 Quick Start Guide

## ⚡ 5-Minute Setup

### Step 1: Database Migration
```bash
npm run db:push
```
This creates all new tables and fields needed for this batch.

### Step 2: Start Development Server
```bash
npm run dev
```

### Step 3: Test the System

#### Test Controller Verification
1. Go to http://localhost:3000
2. Select "CONTROLLER" tab
3. Enter email: `testcontroller@college.edu`
4. Enter name: `John Controller`
5. Enter password: `password123`
6. Click "Sign In"
7. Should see: "Your controller account is pending verification"
8. Login as ADMIN (email: `admin@college.edu`, password: `admin`)
9. Click "Review Now" in the alert
10. Approve the controller
11. Controller can now login

#### Test Student Avatar Selection
1. Go to http://localhost:3000
2. Select "STUDENT" tab
3. Enter email: `student@college.edu`
4. Enter name: `John Student`
5. Click "Enter Portal"
6. Should redirect to avatar selection page
7. Click an avatar
8. Should redirect to student dashboard
9. Avatar shows in welcome section

#### Test Quiz Flow
1. From student dashboard, click "Start Quiz"
2. On entry page, select individual mode
3. Click "Start Quiz Now"
4. Should see quiz attempt page with questions
5. Select an answer and click "Next Question"
6. After last question, see "Submit Quiz" button
7. Should redirect to results page
8. Should show score and performance feedback

## 📊 Key Pages to Test

| Page | URL | Role | Status |
|------|-----|------|--------|
| Controller Verify | `/admin/controllers/verify` | Admin | ✅ NEW |
| Student Dashboard | `/student/dashboard` | Student | ✅ NEW |
| Avatar Selection | `/student/avatar` | Student | ✅ UPDATED |
| Quiz Attempt | `/student/quiz/[id]/attempt` | Student | ✅ NEW |
| Quiz Results | `/student/quiz/[id]/results` | Student | ✅ NEW |

## 🧪 API Endpoints to Test

### Using Postman or cURL

#### Get Progress Metrics
```bash
curl "http://localhost:3000/api/quizzes/quiz-id/progress?attemptId=attempt-id"
```

#### Get Speed Comparison
```bash
curl "http://localhost:3000/api/quizzes/quiz-id/speed?attemptId=attempt-id"
```

#### Submit Answer
```bash
curl -X POST "http://localhost:3000/api/quizzes/quiz-id/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "attemptId": "attempt-id",
    "questionId": "question-id",
    "answer": "Option B",
    "timeSeconds": 30
  }'
```

#### Get Unverified Controllers
```bash
curl "http://localhost:3000/api/admin/controllers/verify"
```

#### Verify Controller
```bash
curl -X POST "http://localhost:3000/api/admin/controllers/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "controllerId": "controller-id",
    "approved": true,
    "notes": "Approved by admin"
  }'
```

## 🗂️ File Structure Overview

```
college-quiz-portal/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── controllers/
│   │   │   │   └── verify/          [NEW]
│   │   │   └── dashboard/           [UPDATED]
│   │   ├── student/
│   │   │   ├── avatar/              [RECREATED]
│   │   │   ├── dashboard/           [NEW]
│   │   │   └── quiz/[id]/
│   │   │       ├── attempt/         [NEW]
│   │   │       └── results/         [NEW]
│   │   ├── api/
│   │   │   ├── admin/controllers/verify/ [NEW]
│   │   │   ├── quizzes/[id]/
│   │   │   │   ├── progress/        [NEW]
│   │   │   │   ├── speed/           [NEW]
│   │   │   │   └── submit/          [UPDATED]
│   │   │   └── auth/login/          [UPDATED]
│   │   └── page.tsx                 [UPDATED]
│   └── lib/
│       └── auth.ts                  [UPDATED - role hierarchy]
├── prisma/
│   └── schema.prisma                [UPDATED - new models]
└── docs/
    ├── BATCH3_SUMMARY.md            [NEW]
    └── BATCH3_CHECKLIST.md          [NEW]
```

## 🎯 Demo Credentials

### Admin Account
- **Email**: admin@college.edu
- **Password**: admin
- **Role**: ADMIN

### Controller Account (Pre-verified in seed)
- **Email**: controller@college.edu
- **Password**: password123
- **Role**: CONTROLLER
- **Status**: Verified (ready to use)

### New Controller (Requires Verification)
- **Email**: newcontroller@college.edu
- **Password**: newpass123
- **Role**: CONTROLLER
- **Status**: Pending verification

### Student Account
- **Email**: student@college.edu
- **Name**: John Student
- **Role**: STUDENT
- **Note**: No password required

## ✅ Quick Verification Checklist

After running `npm run dev`, verify:

- [ ] Home page loads with login form
- [ ] Can select between STUDENT/CONTROLLER/ADMIN tabs
- [ ] Student login redirects to avatar selection
- [ ] Admin can see controller verification alert
- [ ] Controller verification page shows pending controllers
- [ ] Admin can approve/reject controllers
- [ ] Student dashboard shows featured quizzes
- [ ] Avatar selection page has beautiful UI
- [ ] Quiz entry page works
- [ ] Quiz attempt page displays questions
- [ ] Results page shows score and feedback
- [ ] Timer counts up during quiz
- [ ] Progress bar advances with questions

## 🐛 Troubleshooting

### Database Error on Migration
```
Error: Database file locked
```
**Solution**: Make sure no other process is using the database
```bash
killall node  # Kill all Node processes
npm run db:push
```

### Page Not Loading
```
404 Not Found
```
**Solution**: Clear browser cache and restart dev server
```bash
npm run dev
```

### Cookies Not Saving
```
Can't maintain session
```
**Solution**: Make sure you're using `http://localhost:3000`, not `127.0.0.1:3000`

### Avatar Not Showing
```
Avatar displays as ✨
```
**Solution**: Verify user has avatarId in database
```bash
npx prisma studio
```

## 📖 Documentation Files

1. **BATCH3_SUMMARY.md** - Complete feature overview and architecture
2. **BATCH3_CHECKLIST.md** - Implementation checklist and testing guide
3. **BATCH3_QUICKSTART.md** - This file
4. **README.md** - General project documentation
5. **IMPLEMENTATION_SUMMARY.md** - Previous batch work

## 🚀 Next Steps

After confirming all features work:

1. Test with multiple users simultaneously
2. Check database for audit logs
3. Verify performance metrics
4. Plan quiz creation UI development
5. Prepare for next batch features

## 💡 Pro Tips

- Use browser DevTools Network tab to monitor API calls
- Check browser console for errors
- Database is stored in `./dev.db` - can reset by deleting and running `npm run db:push` again
- All timestamps are UTC - check your browser console logs for exact times
- Avatar colors are stored as hex codes (e.g., `#ff6b6b`)

## 🤝 Support

For issues or questions, check:
1. Console error messages
2. `BATCH3_SUMMARY.md` for API documentation
3. Source code comments in relevant files
4. Check Prisma schema for data structure questions

---

**Ready to test? Run `npm run dev` and start exploring!** 🎉
