import axios from 'axios';

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface MessageResponse {
  message: string;
}

class AuthService {
  private TOKEN_KEY = 'visionrapid_access_token';
  private REFRESH_TOKEN_KEY = 'visionrapid_refresh_token';
  private USER_KEY = 'visionrapid_user';

  async register(data: RegisterData): Promise<UserResponse> {
    const response = await axios.post('/auth/register', data);
    return response.data;
  }

  async login(data: LoginData): Promise<TokenResponse> {
    const response = await axios.post('/auth/login', data);
    const { access_token, refresh_token } = response.data;
    
    // Store tokens
    this.setToken(access_token);
    this.setRefreshToken(refresh_token);
    
    // Fetch and store user info
    await this.fetchAndStoreCurrentUser();
    
    return response.data;
  }

  async refreshToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await axios.post('/auth/refresh', {
        refresh_token: refreshToken
      });
      const { access_token, refresh_token } = response.data;
      
      this.setToken(access_token);
      this.setRefreshToken(refresh_token);
      
      return true;
    } catch (error) {
      this.logout();
      return false;
    }
  }

  async getCurrentUser(): Promise<UserResponse | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const response = await axios.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      // Try to refresh token
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Retry with new token
        const newToken = this.getToken();
        const response = await axios.get('/auth/me', {
          headers: {
            Authorization: `Bearer ${newToken}`
          }
        });
        return response.data;
      }
      this.logout();
      return null;
    }
  }

  async fetchAndStoreCurrentUser(): Promise<void> {
    const user = await this.getCurrentUser();
    if (user) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  getUser(): UserResponse | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }
}

export const authService = new AuthService();
