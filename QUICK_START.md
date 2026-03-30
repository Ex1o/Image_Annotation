# VisionRapid - Quick Start Guide

## 📦 What You've Got

This repository now includes:

✅ **Comprehensive README.md** - Full project documentation with setup instructions
✅ **Login Page** - Beautiful authentication UI at `/login` route
✅ **LICENSE** - MIT License for open source
✅ **CONTRIBUTING.md** - Guidelines for contributors
✅ **SECURITY.md** - Security policy and reporting
✅ **CHANGELOG.md** - Version history tracking
✅ **.env.example** - Environment variables template
✅ **.gitignore** - Already configured for Node.js and Python
✅ **GitHub Ready** - All necessary files for a professional GitHub repository

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
# Frontend
npm install

# Backend
cd Backend
python -m venv venv
venv\Scripts\activate  # On Windows
pip install -r requirements.txt
```

### Step 2: Run the Application

```bash
# Terminal 1 - Frontend (from root directory)
npm run dev

# Terminal 2 - Backend (from Backend directory)
cd Backend
python Server.py
```

### Step 3: Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Login Page**: http://localhost:5173/login

## 🎨 Login Page Features

The new login page includes:
- **Tab-based Interface** - Switch between Login and Sign Up
- **Form Validation** - Email and password validation
- **Password Toggle** - Show/hide password
- **Remember Me** - Option to stay logged in
- **Social Login Placeholders** - Google and GitHub integration ready
- **Responsive Design** - Works on all devices
- **Beautiful UI** - Using Shadcn/UI components
- **Toast Notifications** - User feedback for actions

### Access the Login Page

Navigate to: `http://localhost:5173/login`

## 📤 Push to GitHub

### First Time Setup

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Create first commit
git commit -m "feat: initial commit with login page and documentation"

# Add your GitHub repository
git remote add origin https://github.com/yourusername/image-annotation.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Subsequent Pushes

```bash
git add .
git commit -m "your commit message"
git push
```

## 🔐 Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```

2. Update the values in `.env` as needed

## 📋 Next Steps

1. ✅ **Customize the README** - Update repository URL and contact information
2. ✅ **Test the Login Page** - Visit `/login` and test the UI
3. ✅ **Configure Environment** - Set up your `.env` file
4. ✅ **Push to GitHub** - Follow the commands above
5. 🔄 **Add Backend Auth** - Implement actual authentication logic
6. 🔄 **Connect to Database** - Set up user storage
7. 🔄 **Add Protected Routes** - Secure your application pages

## 🎯 Features to Implement

### Authentication (Backend)
- [ ] JWT token generation
- [ ] User registration endpoint
- [ ] Login endpoint
- [ ] Password hashing (bcrypt)
- [ ] Token validation middleware

### Frontend Integration
- [ ] Auth context/state management
- [ ] Protected routes
- [ ] Token storage (localStorage/cookies)
- [ ] Auto-redirect on auth status
- [ ] Session management

### Database
- [ ] User model
- [ ] Database connection
- [ ] User CRUD operations

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Shadcn/UI Components](https://ui.shadcn.com/)
- [YOLOv8 Documentation](https://docs.ultralytics.com/)

## 💡 Tips

1. **Keep Secrets Safe**: Never commit `.env` files
2. **Regular Commits**: Commit frequently with clear messages
3. **Test Before Push**: Always test your changes locally
4. **Update Docs**: Keep README.md updated with changes
5. **Use Branches**: Create feature branches for new work

## 🐛 Troubleshooting

### Login page not showing?
- Make sure you've added the route in App.tsx ✅ (Already done!)
- Check the browser console for errors
- Verify the development server is running

### Styles not loading?
- Ensure Tailwind CSS is properly configured
- Check that `index.css` is imported in `main.tsx`

### Backend not connecting?
- Verify Python dependencies are installed
- Check that the server is running on port 8000
- Ensure CORS is configured in FastAPI

## 📧 Support

For issues or questions:
1. Check existing GitHub issues
2. Review the documentation
3. Create a new issue with details

---

**Happy Coding! 🚀**

Made with ❤️ by VisionRapid Team
