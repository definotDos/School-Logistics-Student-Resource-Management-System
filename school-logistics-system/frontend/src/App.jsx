import { Routes, Route, Navigate } from "react-router-dom";

import AuthPage from "./pages/Auth/AuthPage";
import StudentDashboard from "./pages/Auth/StudentDashboard";
import Resources from "./pages/Auth/Resources";
import Requests from "./pages/Auth/Requests";
import ClaimSchedule from "./pages/Auth/ClaimSchedule";
import DistributionHistory from "./pages/Auth/DistributionHistory";
import AdminDashboard from "./pages/Auth/AdminDashboard";
import Inventory from "./pages/Auth/Inventory";
import Reports from "./pages/Auth/Reports";
import { useAuth } from "./context/useAuth";

function ProtectedRoute({ children, role }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/student"} replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>

      {/* Default */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Authentication */}
      <Route path="/login" element={<AuthPage />} />

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

      {/* Unknown URL */}
      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />

    </Routes>
  );
}

export default App;