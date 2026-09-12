# QuizNexa - Smart College Quiz Technology

A comprehensive, role-based college quiz portal built with Next.js, Prisma, and SQLite.

## Features

### 🔐 Role-Based Access Control
- **Admin**: Full platform control, manage controllers, create quizzes, view all results
- **Controller**: Manage assigned quizzes, monitor student progress, view detailed analytics
- **Student**: Attempt quizzes individually or as part of a team without registration

### 📝 Quiz Management
- **Individual Quizzes**: Students attempt alone
- **Team Quizzes**: Students can form or join teams with configurable team sizes
- **Customizable Settings**: Duration, negative marking, violation limits, question management
- **Question Types**: Multiple-choice questions with configurable marks and penalties

### 👥 Team Features
- Dynamic team creation during quiz entry
- Multiple students can join the same team by entering the team name
- Team-based results and scoring
- Individual contribution tracking within teams

### 📊 Results & Analytics
- Real-time score calculation
- Individual and team performance metrics
- Audit logs for security tracking
- Detailed attempt history

### 🔒 Security Features
- Password-protected admin and controller accounts
- JWT-based session management
- No answer keys shown during quiz attempts
- Violation tracking and disqualification support
- Audit trail for all administrative actions

### 💎 User Experience
- Modern, interactive UI with Tailwind CSS
- Real-time feedback and error messages
- Responsive design for mobile and desktop
- Smooth navigation between role-specific dashboards
- Beautiful gradient backgrounds and animations

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Prisma ORM with SQLite
- **Authentication**: JWT tokens
- **Icons**: Lucide React

## Installation & Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### Quick Start

1. **Clone the repository and navigate to project folder**
   ```bash
   cd college-quiz-portal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env.local
   ```

4. **Initialize database**
   ```bash
   npm run db:push
   ```

5. **Create default admin account** (Optional - for development)
   ```bash
   npm run seed
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Initial Access

The first administrator chooses their own name, email, and password from the portal login page. After signing in, the administrator creates controller accounts and chooses their credentials. Students join only through generated quiz links or QR codes.

## Database Schema

### Key Models

- **User**: Admin, Controller, and Student accounts
- **Quiz**: Quiz configurations (title, duration, type, settings)
- **Question**: Quiz questions with multiple options
- **Team**: Team configurations for group quizzes
- **TeamMember**: Student membership in teams
- **QuizAttempt**: Student/Team quiz attempts and responses
- **Task**: Administrative tasks assigned to controllers
- **AuditLog**: Security audit trail

## User Workflows

### Admin Workflow
1. Login to admin dashboard
2. Add new controller accounts with email and password
3. Create quizzes (individual or team-based)
4. Configure questions and scoring
5. Assign tasks to controllers
6. Monitor all quiz attempts and results
7. View audit logs and security metrics

### Controller Workflow
1. Login with provided credentials
2. Access assigned quizzes and tasks
3. Create and manage quizzes
4. Monitor student progress in real-time
5. View detailed results and analytics
6. Update task status

### Student Workflow
1. Navigate to student portal
2. Enter name and email (no password)
3. Choose a quiz from available list
4. Select quiz mode (individual or team)
5. If team: enter or create team name
6. Attempt quiz within time limit
7. Submit answers
8. View results

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login endpoint (supports all roles)
- `POST /api/auth/logout` - Logout endpoint

### Admin
- `POST /api/admin/controllers/add` - Add new controller
- `GET /api/admin/controllers` - List controllers
- `GET /api/admin/quizzes` - List all quizzes
- `POST /api/admin/tasks` - Create task for controller

### Quiz Management
- `GET /api/quizzes/:id` - Get quiz details
- `POST /api/quizzes/:id/start` - Start quiz attempt
- `POST /api/quizzes/:id/submit` - Submit quiz
- `GET /api/quizzes/:id/results` - Get quiz results

## Security Considerations

⚠️ **Important for Production**

1. **Password Security**
   - Currently using plaintext comparison for demo
   - Implement `bcrypt` for production: `npm install bcryptjs`
   - Update auth logic to use bcrypt hashing

2. **Environment Variables**
   - Change `JWT_SECRET` to a strong random value
   - Use strong, unique secrets in production
   - Store sensitive data in environment variables only

3. **HTTPS**
   - Always use HTTPS in production
   - Set `secure: true` in cookie configuration

4. **Database**
   - Back up SQLite database regularly
   - Consider PostgreSQL for production
   - Implement database access controls

5. **Session Security**
   - Implement CSRF protection
   - Add rate limiting on login attempts
   - Implement session timeout
   - Add IP whitelisting for admins

## File Structure

```
college-quiz-portal/
├── src/
│   ├── app/
│   │   ├── admin/               # Admin dashboard & pages
│   │   ├── controller/          # Controller dashboard & pages
│   │   ├── student/             # Student quiz pages
│   │   ├── api/                 # API routes
│   │   └── page.tsx             # Login page
│   ├── components/              # Reusable components
│   ├── lib/                     # Utilities (auth, database)
│   └── globals.css              # Global styles
├── prisma/
│   └── schema.prisma            # Database schema
└── package.json
```

## Development Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Database commands
npm run db:push      # Push schema changes
npm run db:generate  # Generate Prisma client
```

## Features Roadmap

- [ ] Email notifications
- [ ] Question randomization
- [ ] Negative marking
- [ ] Proctoring features
- [ ] Advanced analytics dashboard
- [ ] Certificate generation
- [ ] Multi-language support
- [ ] Mobile app

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT License - feel free to use this project for your college needs.

## Support

For issues, questions, or suggestions, please create an issue in the repository.

---

**Built with ❤️ for better college examinations**
