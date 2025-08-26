import React from 'react';
import {BrowserRouter as Router, Navigate, Route, Routes} from 'react-router-dom';
import {CssBaseline, ThemeProvider} from '@mui/material';
import theme from './theme/theme';

// Pages
import EditorPage from './pages/EditorPage';
import SetupPage from './pages/SetupPage';
import LoginPage from './pages/LoginPage';

// Components
import GitHubCallback from './components/GitHubCallback';
import ProtectedRoute from './components/navigation/ProtectedRoute';
import Layout from './components/Layout';

// Context
import {AuthProvider} from './contexts/AuthContext';
import {RepositoryProvider} from './contexts/RepositoryContext';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <RepositoryProvider>
          <Router>
            <Layout>
              <CssBaseline />
              <Routes>
              {/* Login Page Route */}
              <Route path="/login" element={<LoginPage />} />
              
              {/* Setup Page Route */}
              <Route path="/" element={
                <ProtectedRoute>
                  <SetupPage />
                </ProtectedRoute>
              } />
              
              {/* Editor Page Route */}
              <Route path="/editor/:owner/:repo/:branch/:category/:lesson" element={
                <ProtectedRoute>
                  <EditorPage />
                </ProtectedRoute>
              } />
              
              {/* GitHub OAuth Callback */}
              <Route path="/github-callback" element={<GitHubCallback />} />
              
              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </Router>
        </RepositoryProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
