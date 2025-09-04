import React, {createContext, ReactNode, useContext, useEffect, useState} from 'react';
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

export const AuthProvider: React.FC<AuthProviderProps> = ({children}) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [user, setUser] = useState<any | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // First check if we have a token in localStorage and initialize the service
                await githubService.initialize();
                
                // Then check authentication status from the backend
                const isAuth = await githubService.checkAuthenticationStatus();
                setIsAuthenticated(isAuth);

                if (isAuth) {
                    try {
                        // Fetch fresh user data from the backend
                        const userInfo = await githubService.getCurrentUser();
                        setUser(userInfo);
                    } catch (userError) {
                        console.error('Error fetching user info:', userError);
                    }
                }
            } catch (error) {
                console.error('Authentication check failed:', error);
                // If authentication check fails, ensure we're marked as not authenticated
                setIsAuthenticated(false);
                setUser(null);
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
