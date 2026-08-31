export type Classification = "public" | "internal" | "confidential" | "restricted";
export type PolicyDecision = "allow" | "allow_redacted" | "deny";

export interface DemoPrincipal {
  id: string;
  displayName: string;
  department: string;
  roles: string[];
  active: boolean;
}

export interface ProtectedDocument {
  id: string;
  title: string;
  department: string;
  classification: Classification;
  allowedRoles: string[];
  content: string;
}

export interface AgentGrant {
  agentId: string;
  principalId: string;
  departments: string[];
  maximumClassification: Classification;
  revokedAt: string | null;
}

export interface RevokedGrant {
  principalId: string;
  agentName: string;
  revokedAt: string;
}

export interface SecurityEvent {
  id: string;
  runId: string | null;
  agentId: string;
  principalId: string;
  action: "document.search" | "document.read" | "grant.revoke";
  resourceIds: string[];
  decision: PolicyDecision;
  reasonCode: string;
  redactionCount: number;
  createdAt: string;
}
