import { createBrowserRouter, Navigate, useParams } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { RouteErrorBoundary } from "./components/layout/RouteErrorBoundary";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { PendingPage } from "./pages/auth/PendingPage";
import { AccessDeniedPage } from "./pages/auth/AccessDeniedPage";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { CompanyManagement } from "./pages/admin/CompanyManagement";
import { UserManagement } from "./pages/admin/UserManagement";
import { CompanyHome } from "./pages/company/CompanyHome";
import { CompanySettings } from "./pages/company/CompanySettings";
import { WorkspaceSetup } from "./pages/workspace/WorkspaceSetup";
import { ExtractionDashboard } from "./pages/workspace/ExtractionDashboard";
import { ExtractionReview } from "./pages/workspace/ExtractionReview";
import { MetricsDashboard } from "./pages/workspace/MetricsDashboard";
import { WorkspaceMembers } from "./pages/workspace/WorkspaceMembers";
import { TemplateManager } from "./pages/workspace/TemplateManager";
import { ReportStudio } from "./pages/workspace/ReportStudio";
import { WorkspaceHub } from "./pages/workspace/WorkspaceHub";
import { DocumentsPage } from "./pages/workspace/DocumentsPage";
import { EvidencePage } from "./pages/workspace/EvidencePage";

const ALL_ROLES = ["system_admin", "company_owner", "sustainability_manager", "data_reviewer", "report_viewer"];
const ANALYST_AND_UP = ["system_admin", "company_owner", "sustainability_manager", "data_reviewer"];
const MANAGER_AND_UP = ["system_admin", "company_owner", "sustainability_manager"];
const OWNER_AND_UP = ["system_admin", "company_owner"];

function StoryToEvidenceRedirect() {
  const { workspaceId } = useParams();
  return <Navigate to={workspaceId ? `/w/${workspaceId}/evidence` : "/"} replace />;
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/pending", element: <PendingPage /> },
  { path: "/access-denied", element: <AccessDeniedPage /> },
  {
    element: <AppShell />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <ProtectedRoute allowedRoles={["system_admin"]} />,
        children: [
          { path: "/admin", element: <AdminDashboard /> },
          { path: "/admin/companies", element: <CompanyManagement /> },
          { path: "/admin/users", element: <UserManagement /> },
        ]
      },
      {
        element: <ProtectedRoute allowedRoles={OWNER_AND_UP} />,
        children: [
          { path: "/c/:companyId/settings", element: <CompanySettings /> },
          { path: "/c/:companyId/workspaces/new", element: <WorkspaceSetup /> },
          { path: "/w/:workspaceId/members", element: <WorkspaceMembers /> },
        ]
      },
      {
        element: <ProtectedRoute allowedRoles={MANAGER_AND_UP} />,
        children: [
          { path: "/w/:workspaceId/extraction", element: <ExtractionDashboard /> },
          { path: "/w/:workspaceId/templates", element: <TemplateManager /> },
        ]
      },
      {
        element: <ProtectedRoute allowedRoles={ANALYST_AND_UP} />,
        children: [
          { path: "/w/:workspaceId/review", element: <ExtractionReview /> },
        ]
      },
      {
        element: <ProtectedRoute allowedRoles={ALL_ROLES} />,
        children: [
          { path: "/c/:companyId", element: <CompanyHome /> },
          { path: "/w/:workspaceId", element: <WorkspaceHub /> },
          { path: "/w/:workspaceId/documents", element: <DocumentsPage /> },
          { path: "/w/:workspaceId/evidence", element: <EvidencePage /> },
          { path: "/w/:workspaceId/metrics", element: <MetricsDashboard /> },
          { path: "/w/:workspaceId/report", element: <ReportStudio /> },
          { path: "/w/:workspaceId/story", element: <StoryToEvidenceRedirect /> },
        ]
      },
      { path: "/", element: <Navigate to="/login" replace /> },
    ],
  },
]);
