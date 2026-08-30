import { Routes, Route, Navigate } from "react-router-dom";

import AuthPage from "./pages/Auth/AuthPage";
import LandingPage from "./pages/LandingPage";
import StudentDashboard from "./pages/Auth/StudentDashboard";
import Resources from "./pages/Auth/Resources";
import Requests from "./pages/Auth/Requests";
import ClaimSchedule from "./pages/Auth/ClaimSchedule";
import DistributionHistory from "./pages/Auth/DistributionHistory";
import AdminDashboard from "./pages/Auth/AdminDashboard";
import StaffServicesDashboard from "./pages/Auth/StaffServicesDashboard";
import Inventory from "./pages/Auth/Inventory";
import Reports from "./pages/Auth/Reports";
import { useAuth } from "./context/useAuth";

function ProtectedRoute({ children, role }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "staff") return <Navigate to="/staff" replace />;
    return <Navigate to="/student" replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>

      {/* Landing page */}
      <Route path="/" element={<LandingPage />} />

      {/* Authentication */}
      <Route path="/login" element={<AuthPage />} />
      <Route path="/signup" element={<AuthPage />} />

      {/* Student */}
      <Route path="/student" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
      <Route path="/resources" element={<ProtectedRoute role="student"><Resources /></ProtectedRoute>} />
      <Route path="/requests" element={<ProtectedRoute role="student"><Requests /></ProtectedRoute>} />
      <Route path="/claim-schedule" element={<ProtectedRoute role="student"><ClaimSchedule /></ProtectedRoute>} />
      <Route
        path="/distribution-history"
        element={<ProtectedRoute role="student"><DistributionHistory /></ProtectedRoute>}
      />

      {/* Administrator */}
      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/:section" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute role="admin"><Inventory /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute role="admin"><Reports /></ProtectedRoute>} />

      {/* Staff & Services */}
      <Route path="/staff" element={<ProtectedRoute role="staff"><StaffServicesDashboard /></ProtectedRoute>} />
      <Route path="/staff/:section" element={<ProtectedRoute role="staff"><StaffServicesDashboard /></ProtectedRoute>} />

      {/* Unknown URL */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />

    </Routes>
  );
}

export default App;