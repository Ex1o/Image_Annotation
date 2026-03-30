// Frontend Authentication - Component Test
// This file verifies all auth-related imports work correctly

// Test 1: Auth Service imports
import { authService, RegisterData, LoginData, UserResponse } from './lib/auth-service';

// Test 2: Auth Context imports
import { useAuth, AuthProvider } from './contexts/AuthContext';

// Test 3: Protected Route
import { ProtectedRoute } from './components/ProtectedRoute';

// Test 4: Axios setup (side effects only)
import './lib/axios-setup';

console.log('✅ All auth imports successful!');

// Type checks
const testRegister: RegisterData = {
  username: 'test',
  email: 'test@example.com',
  password: 'test123',
  full_name: 'Test User'
};

const testLogin: LoginData = {
  email: 'test@example.com',
  password: 'test123'
};

console.log('✅ All type definitions valid!');

export const authTestPassed = true;
