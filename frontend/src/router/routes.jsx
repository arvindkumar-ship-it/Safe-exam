import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "../auth/ProtectedRoute";
import { useAuth } from "../auth/useAuth";
import Loading from "../components/Loading";
import InstructorDashboard from "../pages/InstructorDashboard";
import LoginPage from "../pages/LoginPage";
import NotFoundPage from "../pages/NotFoundPage";

export function homePathFor(role) {
  if (role === "STUDENT") return "/student";
  if (role === "REVIEWER") return "/reviews";
  return "/instructor"; // INSTRUCTOR, ADMIN
}

function HomeRedirect() {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <Loading />;
  return <Navigate to={isAuthenticated ? homePathFor(user.role) : "/login"} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute roles={["INSTRUCTOR", "ADMIN"]} />}>
        <Route path="/instructor" element={<InstructorDashboard />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export { ProtectedRoute };
