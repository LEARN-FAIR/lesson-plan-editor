import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import githubService from '../services/githubService';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  login: () => void;
  logout: () => void;
  setRedirectPath: (path: string) => void;
  getRedirectPath: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = githubService.isAuthenticated();
        setIsAuthenticated(isAuth);
        
        if (isAuth) {
          try {
            const userInfo = await githubService.getCurrentUser();
            setUser(userInfo);
          } catch (userError) {
            console.error('Error fetching user info:', userError);
          }
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const login = () => {
    githubService.redirectToGitHub();
  };

  const logout = () => {
    githubService.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  const setRedirectPath = (path: string) => {
    localStorage.setItem('redirect_after_login', path);
  };

  const getRedirectPath = (): string => {
    return localStorage.getItem('redirect_after_login') || '/';
  };

  const value = {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
    setRedirectPath,
    getRedirectPath
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
