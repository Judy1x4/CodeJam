import { agentGrantProfiles, type AgentGrantProfile } from "./fixtures.js";
import type { Classification, DemoPrincipal, ProtectedDocument } from "./types.js";

export interface PolicyCheckInput {
  principal: DemoPrincipal;
  agentName: string;
  document: ProtectedDocument;
}

export interface PolicyCheckResult {
  authorized: boolean;
  reasonCode: string;
}

const classificationRank: Record<Classification, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
};

export function evaluateDocumentAccess(
  input: PolicyCheckInput,
  grants: AgentGrantProfile[] = agentGrantProfiles,
): PolicyCheckResult {
  const { principal, agentName, document } = input;

  if (!principal.active) {
    return { authorized: false, reasonCode: "principal_inactive" };
  }

  const grant = grants.find(
    (candidate) => candidate.principalId === principal.id && candidate.agentName === agentName,
  );
  if (!grant || grant.revokedAt !== null) {
    return { authorized: false, reasonCode: "grant_missing_or_revoked" };
  }

  if (!grant.departments.includes(document.department)) {
    return { authorized: false, reasonCode: "department_not_permitted" };
  }

  if (document.classification === "restricted") {
    return { authorized: false, reasonCode: "restricted_always_blocked" };
  }

  if (classificationRank[document.classification] > classificationRank[grant.maximumClassification]) {
    return { authorized: false, reasonCode: "classification_exceeds_grant" };
  }

  return { authorized: true, reasonCode: "authorized" };
}
