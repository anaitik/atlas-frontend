const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Canonical metric codes used in reports (mirrors backend metric_definitions.json keys). */
export const CANONICAL_REPORT_METRIC_CODES = new Set([
  "electricity_kwh_total",
  "gas_kwh_total",
  "fuel_litres_total",
  "scope1_kgco2e",
  "scope2_kgco2e",
  "scope1_tco2e",
  "scope2_tco2e",
  "total_ghg_tco2e",
  "water_consumption_m3_total",
  "waste_generated_kg_total",
]);

export function isCanonicalReportMetric(metricCode?: string | null): boolean {
  return !!metricCode && CANONICAL_REPORT_METRIC_CODES.has(metricCode);
}

export function metricSourceTypeRaw(metric: { metadata?: Record<string, unknown> }): string {
  const type = metric.metadata?.source_type;
  return typeof type === "string" ? type : "unknown";
}

export function isUuid(value?: string | null): boolean {
  return !!value && UUID_RE.test(value.trim());
}

/** Turn snake_case / dot paths into readable labels */
export function humanizeKey(key: string): string {
  return key
    .replace(/\[(\d+)\]/g, " $1")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatFieldPath(path?: string | null): string {
  if (!path) return "Unknown field";
  return path
    .replace(/^payload\./, "")
    .split(".")
    .flatMap((part) => {
      const bracket = part.match(/^(.+)\[(\d+)\]$/);
      if (bracket) return [humanizeKey(bracket[1]), `#${Number(bracket[2]) + 1}`];
      return [humanizeKey(part)];
    })
    .join(" › ");
}

export function formatMetricCode(code?: string | null): string {
  if (!code) return "Unknown metric";
  if (isUuid(code)) return "Linked metric";
  return humanizeKey(code);
}

export function displayDocumentLabel(filename?: string | null, _docId?: string | null): string {
  if (filename && !isUuid(filename)) {
    const trimmed = filename.trim();
    if (/^Document [0-9a-f]{8}$/i.test(trimmed)) return "Source document";
    return trimmed;
  }
  return "Source document";
}

export function displayTemplateLabel(templateName?: string | null, _templateId?: string | null): string {
  if (templateName && !isUuid(templateName)) return templateName;
  return "Document type";
}

export function displayRecordTitle(filename?: string | null, createdAt?: string): string {
  const doc = displayDocumentLabel(filename);
  if (doc !== "Source document") return doc;
  if (createdAt) {
    return `Upload from ${new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return "Uploaded document";
}

export function formatAuditActor(actorId?: string | null): string {
  if (!actorId) return "System";
  if (isUuid(actorId)) return "Team member";
  return actorId;
}

const ENTITY_TABLE_LABELS: Record<string, string> = {
  documents: "Document",
  extractions: "Extraction",
  metrics: "Metric",
  reports: "Report",
  workspaces: "Reporting period",
  users: "User",
  templates: "Document type",
};

export function formatEntityTable(table?: string | null): string {
  if (!table) return "Record";
  return ENTITY_TABLE_LABELS[table] || humanizeKey(table);
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  document_uploaded: "Document uploaded",
  document_verified: "Document verified",
  extraction_created: "Data extracted",
  extraction_approved: "Extraction approved",
  extraction_rejected: "Extraction rejected",
  extraction_reviewed: "Extraction reviewed",
  metric_computed: "Metric calculated",
  metric_approved: "Metric approved",
  report_generated: "Report generated",
  report_published: "Report published",
  report_submitted: "Report submitted for review",
};

export function formatEventType(eventType?: string | null): string {
  if (!eventType) return "Activity";
  const normalized = eventType.toLowerCase().replace(/[\s.]+/g, "_");
  if (EVENT_TYPE_LABELS[normalized]) return EVENT_TYPE_LABELS[normalized];
  return humanizeKey(eventType.replace(/[._]/g, " "));
}

export function truncateHash(hash: string, visible = 8): string {
  if (!hash) return "";
  if (hash.length <= visible * 2 + 1) return hash;
  return `${hash.slice(0, visible)}…${hash.slice(-visible)}`;
}

export function formatLineageMetricLabel(item: { name?: string; metric_code?: string }): string {
  if (item.name && !isUuid(item.name)) return item.name;
  return formatMetricCode(item.metric_code);
}

export function formatLineageSource(item: {
  source_document?: string;
  source_file?: string;
  document_name?: string;
  source_document_name?: string;
}): string | undefined {
  const raw = item.source_document_name || item.source_document || item.source_file || item.document_name;
  if (!raw) return undefined;
  return displayDocumentLabel(raw);
}

export function formatStatusLabel(status?: string | null): string {
  if (!status) return "Unknown";
  const normalized = status.toLowerCase().replace(/[\s-]+/g, "_");
  const labels: Record<string, string> = {
    active: "Active",
    complete: "Complete",
    completed: "Completed",
    approved: "Approved",
    verified: "Verified",
    published: "Published",
    draft: "Draft",
    in_progress: "In progress",
    processing: "Processing",
    extracting: "Extracting",
    pending: "Pending",
    pending_review: "Awaiting review",
    needs_review: "Needs review",
    pending_approval: "Awaiting approval",
    rejected: "Rejected",
    failed: "Failed",
    error: "Error",
    review: "In review",
  };
  return labels[normalized] || humanizeKey(status);
}

const FRAMEWORK_LABELS: Record<string, string> = {
  csrd: "CSRD / ESRS",
  gri: "GRI Standards",
  tcfd: "TCFD",
  integrated: "Integrated",
  xhtml: "Web report",
};

export function formatFrameworkCode(code?: string | null): string {
  if (!code) return "Report";
  const key = code.toLowerCase();
  return FRAMEWORK_LABELS[key] || humanizeKey(code);
}

export function displayMetricLabel(
  metric: {
    name?: string;
    metric_code?: string;
    metadata?: Record<string, unknown>;
    source_extracted_data_ids?: string[];
  },
  extractionsById?: Map<string, { document_filename?: string; template_name?: string; created_at?: string }>,
): { title: string; subtitle?: string } {
  const sourceType = metricSourceTypeRaw(metric);
  const templateName =
    typeof metric.metadata?.template_name === "string" ? metric.metadata.template_name : undefined;
  const storedFilename =
    typeof metric.metadata?.source_document_name === "string"
      ? metric.metadata.source_document_name
      : undefined;

  if (sourceType === "extraction_sync") {
    const extractionId = metric.source_extracted_data_ids?.[0];
    const extraction = extractionId ? extractionsById?.get(extractionId) : undefined;
    const filename = storedFilename || extraction?.document_filename;
    const title = filename
      ? displayDocumentLabel(filename)
      : metric.name || formatMetricCode(metric.metric_code);
    const subtitle = displayTemplateLabel(templateName || extraction?.template_name);
    if (subtitle !== "Document type" && subtitle !== title) {
      return { title, subtitle };
    }
    return { title };
  }

  return { title: metric.name || formatMetricCode(metric.metric_code) };
}

export function formatSourceType(type?: string | null): string {
  if (!type || type === "unknown") return "Calculated";
  return humanizeKey(type);
}

export function formatChangeType(type: string): string {
  const map: Record<string, string> = {
    added: "Added",
    removed: "Removed",
    updated: "Updated",
  };
  return map[type] || humanizeKey(type);
}

export function formatRoleLabel(role?: string | null): string {
  if (!role) return "Unknown role";
  const map: Record<string, string> = {
    company_owner: "Organization owner",
    sustainability_manager: "Sustainability manager",
    data_reviewer: "Data reviewer",
    report_viewer: "Report viewer",
    system_admin: "System administrator",
  };
  return map[role] || humanizeKey(role);
}

export function formatLineageBreadcrumb(parts: {
  metric?: string | null;
  document?: string | null;
  field?: string | null;
}): string {
  const segments = [
    parts.metric ? formatMetricCode(parts.metric) : null,
    parts.document ? displayDocumentLabel(parts.document) : null,
    parts.field ? formatFieldPath(parts.field) : null,
  ].filter(Boolean);
  return segments.length > 0 ? segments.join(" → ") : "Trace not available";
}

export function formatProjectedMetric(metricKey?: string | null, metricLabel?: string | null): string {
  if (metricLabel && !isUuid(metricLabel)) return metricLabel;
  return formatMetricCode(metricKey);
}

export function resolveActorName(actorId?: string | null, actorName?: string | null): string {
  if (actorName?.trim()) return actorName.trim();
  return formatAuditActor(actorId);
}

/** Turn backend log-style detail into plain language when possible */
export function formatStoryDetail(detail?: string | null, entityLabel?: string | null): string {
  if (entityLabel?.trim()) return entityLabel.trim();
  if (!detail) return "Activity recorded for this reporting period.";
  const entityMatch = detail.match(/^Entity:\s*(\w+)\s*\(([0-9a-f-]+)\)$/i);
  if (entityMatch) {
    return `${formatEntityTable(entityMatch[1])} updated in this period.`;
  }
  if (isUuid(detail.trim())) return "Record updated in this period.";
  return detail;
}

const SCHEMA_TYPE_LABELS: Record<string, string> = {
  STRING: "Text",
  FLOAT: "Number",
  INTEGER: "Whole number",
  BOOLEAN: "Yes/No",
  DATE: "Date",
};

export function formatSchemaType(type?: string | null): string {
  if (!type) return "Text";
  return SCHEMA_TYPE_LABELS[type.toUpperCase()] || humanizeKey(type);
}

const PILLAR_LABELS: Record<string, string> = {
  environmental: "Environmental",
  social: "Social",
  governance: "Governance",
  strategy: "Strategy",
  materiality: "Materiality",
};

export function formatPillarLabel(pillar?: string | null): string {
  if (!pillar) return "All";
  return PILLAR_LABELS[pillar.toLowerCase()] || humanizeKey(pillar);
}

/** Flatten payload object into human-labeled field rows */
export function flattenPayloadFields(
  payload: Record<string, unknown> | null | undefined,
  prefix = ""
): { key: string; path: string; label: string; value: string }[] {
  if (!payload || typeof payload !== "object") return [];
  const rows: { key: string; path: string; label: string; value: string }[] = [];
  for (const [key, value] of Object.entries(payload)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      rows.push(...flattenPayloadFields(value as Record<string, unknown>, path));
    } else {
      rows.push({
        key,
        path,
        label: formatFieldPath(path),
        value: value == null ? "" : Array.isArray(value) ? JSON.stringify(value) : String(value),
      });
    }
  }
  return rows;
}
