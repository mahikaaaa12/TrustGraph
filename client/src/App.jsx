import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ErrorLogProvider } from './context/ErrorLogContext';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import DashboardLayout from './layouts/DashboardLayout';
import ErrorBoundary from './components/ErrorBoundary';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import HomePage from './pages/HomePage';
import DocumentPage from './pages/DocumentPage';
import ImagePage from './pages/ImagePage';
import WebsitePage from './pages/WebsitePage';
import TextPage from './pages/TextPage';
import TrustScorePage from './pages/TrustScorePage';
import HistoryPage from './pages/HistoryPage';
import AnalysisDetailsPage from './pages/AnalysisDetailsPage';
import ReportsPage from './pages/ReportsPage';
import NotificationsPage from './pages/NotificationsPage';
import ApiTesterPage from './pages/ApiTesterPage';
import ErrorLogsPage from './pages/ErrorLogsPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  return (
    <ErrorLogProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public SaaS Web Routes */}
            <Route path="/" element={<LandingPage />} />

            {/* Guest-Only Authentication Routes (Redirects to /dashboard if logged in) */}
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>

            {/* Protected Enterprise Dashboard Routes (Redirects to /login if unauthenticated) */}
            <Route element={<ProtectedRoute />}>
              <Route
                path="/dashboard"
                element={
                  <ErrorBoundary>
                    <DashboardLayout />
                  </ErrorBoundary>
                }
              >
                <Route index element={<HomePage />} />
                <Route path="document" element={<DocumentPage />} />
                <Route path="image" element={<ImagePage />} />
                <Route path="website" element={<WebsitePage />} />
                <Route path="text" element={<TextPage />} />
                <Route path="trust-score" element={<TrustScorePage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="analysis/:id" element={<AnalysisDetailsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="api-tester" element={<ApiTesterPage />} />
                <Route path="error-logs" element={<ErrorLogsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>
            </Route>

            {/* Fallback Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorLogProvider>
  );
}
