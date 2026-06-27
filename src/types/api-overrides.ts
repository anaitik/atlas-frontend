/**
 * Manual type extensions that complement the auto-generated API types.
 * These are handwritten helpers that downstream pages use.
 */

export type UserRole = "system_admin" | "system_audit_officer" | "company_owner" | "sustainability_manager" | "data_reviewer" | "report_viewer";
export type UserStatus = "pending" | "active" | "suspended";
export type CompanyStatus = "active" | "suspended";
export type WorkspaceStatus = "active" | "archived";

export type AuditEventType =
  | "USER_APPROVED"
  | "USER_SUSPENDED"
  | "COMPANY_CREATED"
  | "WORKSPACE_CREATED"
  | "CONNECTOR_CONNECTED"
  | "BATCH_CREATED"
  | "RECORD_APPROVED"
  | "RECORD_REJECTED"
  | "RECORD_REEXTRACTED"
  | "METRICS_APPROVED"
  | "METRIC_OVERRIDE"
  | "REPORT_APPROVED"
  | "REPORT_REJECTED"
  | "REPORT_PUBLISHED"
  | "DOCUMENT_ANCHORED"
  | "SCHEMA_MIGRATION";

export interface UserOut {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  company_id: string | null;
  created_at: string;
  updated_at: string;
}
