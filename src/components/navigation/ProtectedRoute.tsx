import React from 'react';
import { Navigate, Route, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

/**
 * ProtectedRouteElement component for React Router v6
 * It checks authentication status and redirects to login if not authenticated
 * This is used internally by the ProtectedRoute component
 */
interface ProtectedRouteElementProps {
    element: React.ReactNode;
}

const ProtectedRouteElement: React.FC<ProtectedRouteElementProps> = ({ element }) => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    // Show loading indicator while checking authentication
    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    // If not authenticated, redirect to login with redirect_url query parameter
    if (!isAuthenticated) {
        // Encode the current path for redirect after login
        if (location.pathname !== '/login' && location.pathname !== '/github-callback') {
            const fullPath = location.pathname +
                (location.search ? location.search : '') +
                (location.hash ? location.hash : '');
            console.log('Redirecting to login with redirect_url:', fullPath);

            // Use query parameter instead of session storage
            const encodedRedirectUrl = encodeURIComponent(fullPath);
            return <Navigate to={`/login?redirect_url=${encodedRedirectUrl}`} replace />;
        }

        return <Navigate to="/login" replace />;
    }

    // If authenticated, render the protected content
    return <>{element}</>;
};

/**
 * ProtectedRoute component that extends Route
 * This allows using ProtectedRoute with the same syntax as Route
 * Usage: <ProtectedRoute path="/" element={<Component/>} />
 */
type ProtectedRouteProps = {
    path: string;
    element: React.ReactNode;
    index?: boolean;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ path, element, index }) => {
    return (
        <Route
            path={path}
            index={index}
            element={<ProtectedRouteElement element={element} />}
        />
    );
};

export default ProtectedRoute;
export { ProtectedRouteElement };
