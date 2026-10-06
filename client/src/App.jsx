import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ErrorLogProvider } from './context/ErrorLogContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
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
import UnauthorizedPage from './pages/UnauthorizedPage';
import UserManagementPage from './pages/UserManagementPage';

import SimulatorPage from './pages/SimulatorPage';
import InvestigationPage from './pages/InvestigationPage';
import CreatorWorkspacePage from './pages/CreatorWorkspacePage';
import InstagramAnalyzerPage from './pages/InstagramAnalyzerPage';
import PostVerificationPage from './pages/PostVerificationPage';
import BrandCollaborationPage from './pages/BrandCollaborationPage';
import BatchAnalysisPage from './pages/BatchAnalysisPage';

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
                {/* Shared Dashboard Routes */}
                <Route index element={<HomePage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="batch" element={<BatchAnalysisPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="api-tester" element={<ApiTesterPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="analysis/:id" element={<AnalysisDetailsPage />} />
                <Route path="unauthorized" element={<UnauthorizedPage />} />

                {/* Content Creator Protected Routes (CONTENT_CREATOR & ADMIN) */}
                <Route element={<RoleProtectedRoute allowedRoles={['CONTENT_CREATOR']} />}>
                  <Route path="creator" element={<CreatorWorkspacePage />} />
                  <Route path="post-verification" element={<PostVerificationPage />} />
                  <Route path="brand-collaboration" element={<BrandCollaborationPage />} />
                  <Route path="instagram" element={<InstagramAnalyzerPage />} />
                </Route>

                {/* Industry Analyst Protected Routes (INDUSTRY_ANALYST & ADMIN) */}
                <Route element={<RoleProtectedRoute allowedRoles={['INDUSTRY_ANALYST']} />}>
                  <Route path="document" element={<DocumentPage />} />
                  <Route path="image" element={<ImagePage />} />
                  <Route path="website" element={<WebsitePage />} />
                  <Route path="text" element={<TextPage />} />
                  <Route path="trust-score" element={<TrustScorePage />} />
                  <Route path="simulator" element={<SimulatorPage />} />
                  <Route path="investigation" element={<InvestigationPage />} />
                </Route>

                {/* Admin-Only Protected Routes (ADMIN) */}
                <Route element={<RoleProtectedRoute allowedRoles={['ADMIN']} />}>
                  <Route path="users" element={<UserManagementPage />} />
                  <Route path="error-logs" element={<ErrorLogsPage />} />
                </Route>
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
