import type { Classification, DemoPrincipal, ProtectedDocument } from "./types.js";

export const VAULT_CANARY = "VAULT_CANARY_7f3a2b91";

export const demoPrincipals: DemoPrincipal[] = [
  {
    id: "alice-finance",
    displayName: "Alice",
    department: "Finance",
    roles: ["Finance Manager"],
    active: true,
  },
  {
    id: "bob-engineering",
    displayName: "Bob",
    department: "Engineering",
    roles: ["Engineer"],
    active: true,
  },
];

// Real AgentGrant records bind to an Agent.id that only exists once an Agent
// is created through the existing CRUD UI (Block 4). Until then, grants are
// looked up by Agent display name against these profiles.
export interface AgentGrantProfile {
  agentName: string;
  departments: string[];
  maximumClassification: Classification;
}

export const agentGrantProfiles: AgentGrantProfile[] = [
  {
    agentName: "Finance Analyst Agent",
    departments: ["Finance"],
    maximumClassification: "confidential",
  },
  {
    agentName: "Engineering Assistant Agent",
    departments: ["Engineering"],
    maximumClassification: "internal",
  },
];

export const protectedDocuments: ProtectedDocument[] = [
  {
    id: "FIN-001",
    title: "Project Atlas Budget Summary",
    department: "Finance",
    classification: "confidential",
    allowedRoles: ["Finance Manager"],
    content:
      "Project Atlas approved operating expenses were SGD 418,000 for the quarter. " +
      "The approved variance threshold is 8%; actual spend finished 3% under threshold.",
  },
  {
    id: "FIN-002",
    title: "Vendor Payment Schedule",
    department: "Finance",
    classification: "confidential",
    allowedRoles: ["Finance Manager"],
    content:
      "Scheduled vendor payments for Q3 include Acme Logistics (SGD 22,400) and " +
      "Nimbus Cloud Services (SGD 9,150), disbursed to account 8842-1930-5567.",
  },
  {
    id: "FIN-003",
    title: "Finance Operating Policy",
    department: "Finance",
    classification: "internal",
    allowedRoles: ["Finance Manager"],
    content:
      "All purchase orders above SGD 5,000 require Finance Manager approval. " +
      "Expense reports are reconciled monthly against the department budget.",
  },
  {
    id: "HR-001",
    title: "Salary Master File",
    department: "HR",
    classification: "restricted",
    allowedRoles: ["HR Director"],
    content:
      `Employee compensation records. Internal system reference: ${VAULT_CANARY}. ` +
      "This file is never eligible for hosted-model access regardless of requester.",
  },
  {
    id: "HR-002",
    title: "Leave Policy",
    department: "HR",
    classification: "internal",
    allowedRoles: ["Employee"],
    content:
      "Full-time employees accrue 14 days of annual leave, credited monthly. " +
      "Unused leave up to 5 days may be carried into the next calendar year.",
  },
  {
    id: "ENG-001",
    title: "Deployment Runbook",
    department: "Engineering",
    classification: "internal",
    allowedRoles: ["Engineer"],
    content:
      "Deployments run through the staging pipeline before production promotion. " +
      "Roll back by re-deploying the previous tagged release and clearing the cache.",
  },
  {
    id: "ENG-002",
    title: "Architecture Decision Record",
    department: "Engineering",
    classification: "internal",
    allowedRoles: ["Engineer"],
    content:
      "ADR-014: the team adopted a local keyword index over a hosted vector store " +
      "for document retrieval to avoid sending repository content to a third party.",
  },
  {
    id: "PUB-001",
    title: "Company FAQ",
    department: "Company",
    classification: "public",
    allowedRoles: [],
    content:
      "Our support hours are Monday through Friday, 9am to 6pm Singapore time. " +
      "Reach the helpdesk at helpdesk@example.test for account or access questions.",
  },
];
