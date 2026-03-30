import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, UserResponse, RegisterData, LoginData } from '@/lib/auth-service';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthContextType {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check authentication status on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const storedUser = authService.getUser();
          if (storedUser) {
            setUser(storedUser);
            // Optionally refresh user data from server
            await refreshUser();
          } else {
            await refreshUser();
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        authService.logout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (data: LoginData) => {
    try {
      setIsLoading(true);
      await authService.login(data);
      const currentUser = authService.getUser();
      setUser(currentUser);
      toast.success('Login successful!');
      navigate('/');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Login failed. Please check your credentials.';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setIsLoading(true);
      await authService.register(data);
      toast.success('Registration successful! You can now log in.');
      navigate('/login');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Registration failed. Please try again.';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    toast.info('Logged out successfully');
    navigate('/login');
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      authService.logout();
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
