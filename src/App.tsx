import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/Login'))
const RegisterPage = lazy(() => import('./pages/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const CompleteProfile = lazy(() => import('./pages/CompleteProfile'))
const TermsOfService = lazy(() => import('./pages/TermsOfService'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const Layout = lazy(() => import('./components/Layout'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const GetNumber = lazy(() => import('./pages/GetNumber'))
const Console = lazy(() => import('./pages/Console'))
const Summary = lazy(() => import('./pages/Summary'))
const AccessList = lazy(() => import('./pages/AccessList'))
const SenderRange = lazy(() => import('./pages/SenderRange'))
const Profile = lazy(() => import('./pages/Profile'))
const Payment = lazy(() => import('./pages/Payment'))
const ApiDocs = lazy(() => import('./pages/ApiDocs'))
const NewsFeed = lazy(() => import('./pages/NewsFeed'))
const ApiKeyAccess = lazy(() => import('./pages/ApiKeyAccess'))
const AdminLayout = lazy(() => import('./admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./admin/pages/AdminDashboard'))
const AdminUsers = lazy(() => import('./admin/pages/AdminUsers'))
const AdminAgents = lazy(() => import('./admin/pages/AdminAgents'))
const AdminRoles = lazy(() => import('./admin/pages/AdminRoles'))
const AdminWithdrawals = lazy(() => import('./admin/pages/AdminWithdrawals'))
const AdminAnalytics = lazy(() => import('./admin/pages/AdminAnalytics'))
const AdminMonitor = lazy(() => import('./admin/pages/AdminMonitor'))
const AdminAnnouncements = lazy(() => import('./admin/pages/AdminAnnouncements'))
const AdminSettings = lazy(() => import('./admin/pages/AdminSettings'))
const AdminNewsFeed = lazy(() => import('./admin/pages/AdminNewsFeed'))
const AdminSupport = lazy(() => import('./admin/pages/AdminSupport'))
const AdminManage = lazy(() => import('./admin/pages/AdminManage'))
const AdminServiceProvider = lazy(() => import('./admin/pages/AdminServiceProvider'))
const AdminDatabase = lazy(() => import('./admin/pages/AdminDatabase'))
const AgentLayout = lazy(() => import('./agent/AgentLayout'))
const AgentDashboard = lazy(() => import('./agent/pages/AgentDashboard'))
const AgentUsers = lazy(() => import('./agent/pages/AgentUsers'))
const AgentCommission = lazy(() => import('./agent/pages/AgentCommission'))
const AgentOTPMonitor = lazy(() => import('./agent/pages/AgentOTPMonitor'))
const AgentNewsFeed = lazy(() => import('./agent/pages/AgentNewsFeed'))
const AgentSupport = lazy(() => import('./agent/pages/AgentSupport'))
const AgentApiKey = lazy(() => import('./agent/pages/AgentApiKey'))
const AgentApiDocs = lazy(() => import('./agent/pages/AgentApiDocs'))
const AgentPendingUsers = lazy(() => import('./agent/pages/AgentPendingUsers'))
const AgentDailyReport = lazy(() => import('./agent/pages/AgentDailyReport'))
const AgentAnalytics = lazy(() => import('./agent/pages/AgentAnalytics'))

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-main, #f8fafc)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>Loading...</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>

              {/* Public Auth Routes */}
              <Route path="/login" element={<LoginPage panel="user" />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/admin/login" element={<LoginPage panel="admin" />} />
              <Route path="/agent/login" element={<LoginPage panel="agent" />} />

              <Route path="/complete-profile" element={
                <ProtectedRoute require="user">
                  <CompleteProfile />
                </ProtectedRoute>
              } />

              <Route path="/" element={<LandingPage />} />

              {/* User Panel */}
              <Route path="/" element={
                <ProtectedRoute require="user">
                  <Layout />
                </ProtectedRoute>
              }>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="get-number" element={<GetNumber />} />
                <Route path="console" element={<Console />} />
                <Route path="summary" element={<Summary />} />
                <Route path="access-list" element={<AccessList />} />
                <Route path="sender-range" element={<SenderRange />} />
                <Route path="profile" element={<Profile />} />
                <Route path="payment" element={<Payment />} />
                <Route path="api-docs" element={<ApiDocs />} />
                <Route path="newsfeed" element={<NewsFeed />} />
                <Route path="api-key" element={<ApiKeyAccess />} />
              </Route>

              {/* Admin Panel */}
              <Route path="/admin" element={
                <ProtectedRoute require="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="agents" element={<AdminAgents />} />
                <Route path="roles" element={<AdminRoles />} />
                <Route path="withdrawals" element={<AdminWithdrawals />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="monitor" element={<AdminMonitor />} />
                <Route path="announcements" element={<AdminAnnouncements />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="newsfeed" element={<AdminNewsFeed />} />
                <Route path="support" element={<AdminSupport />} />
                <Route path="admins" element={<AdminManage />} />
                <Route path="service-provider" element={<AdminServiceProvider />} />
                <Route path="database" element={<AdminDatabase />} />
              </Route>

              {/* Agent Panel */}
              <Route path="/agent" element={
                <ProtectedRoute require="agent">
                  <AgentLayout />
                </ProtectedRoute>
              }>
                <Route index element={<AgentDashboard />} />
                <Route path="users" element={<AgentUsers />} />
                <Route path="pending" element={<AgentPendingUsers />} />
                <Route path="daily-report" element={<AgentDailyReport />} />
                <Route path="analytics" element={<AgentAnalytics />} />
                <Route path="commission" element={<AgentCommission />} />
                <Route path="monitor" element={<AgentOTPMonitor />} />
                <Route path="api-key" element={<AgentApiKey />} />
                <Route path="newsfeed" element={<AgentNewsFeed />} />
                <Route path="support" element={<AgentSupport />} />
                <Route path="profile" element={<Profile />} />
                <Route path="payment" element={<Payment />} />
                <Route path="api-docs" element={<AgentApiDocs />} />
              </Route>

              <Route path="*" element={<Navigate to="/login" replace />} />

            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
