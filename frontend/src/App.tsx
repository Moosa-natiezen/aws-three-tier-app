import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./routes/AppLayout";
import { DashboardPage } from "./routes/DashboardPage";
import { LoginPage } from "./routes/LoginPage";

/**
 * Route structure (UI/UX §3):
 *   /login  — auth gate (Better Auth modal; Step 11)
 *   /       — dashboard with data tables (protected; Step 11 adds the guard)
 * Deep-link safe: S3/CloudFront returns index.html for every path (Step 12).
 */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
