import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import theme from './theme/theme';

// Pages
import EditorPage from './pages/EditorPage';
import SetupPage from './pages/SetupPage';

// Components
import GitHubCallback from './components/GitHubCallback';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Layout>
          <CssBaseline />
          <Routes>
          {/* Setup Page Route */}
          <Route path="/" element={
            <AuthGuard>
              <SetupPage />
            </AuthGuard>
          } />
          
          {/* Editor Page Route */}
          <Route path="/edit/:owner/:repo/:branch/:category/:lesson" element={
            <AuthGuard>
              <EditorPage />
            </AuthGuard>
          } />
          
          {/* GitHub OAuth Callback */}
          <Route path="/github-callback" element={<GitHubCallback />} />
          
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
