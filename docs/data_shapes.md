Four are records: DemoPrincipal, AgentGrant, ProtectedDocument, SecurityEvent. The other two are allowed sets of labels, not separate objects.

```mermaid
flowchart TD
    P["DemoPrincipal — WHO<br/>Alice · Finance Manager<br/>active: true"]
    A["Existing Agent<br/>Finance Analyst"]

    P -->|"principalId"| G
    A -->|"agentId"| G

    G["AgentGrant — PERMISSION SLIP<br/>Alice can use this Agent for Finance<br/>maximumClassification: confidential<br/>revokedAt: null"]

    C["Classification — SENSITIVITY LABEL<br/>public · internal<br/>confidential · restricted"]

    D["ProtectedDocument — WHAT<br/>FIN-001: Project Atlas Budget<br/>department: Finance<br/>allowedRoles: Finance Manager<br/>classification: confidential<br/>content: the document text"]

    C -.->|"sets the permission ceiling"| G
    C -.->|"labels the document"| D

    P -->|"active status and roles"| CHECK
    G -->|"delegated permissions"| CHECK
    D -->|"document requirements"| CHECK

    CHECK{"Policy and redaction code<br/>Is access permitted?<br/>Must sensitive fields be removed?"}

    CHECK --> DEC["PolicyDecision — VERDICT<br/>allow · allow_redacted · deny"]

    DEC --> E["SecurityEvent — AUDIT RECEIPT<br/>Which Run, person and Agent?<br/>Which document IDs?<br/>What decision and why?<br/>How many redactions? When?"]
```

A concrete example
Alice asks: “Summarize the Project Atlas budget.”
```mermaid
flowchart TD
    Q["Alice asks about FIN-001"]
    Q --> G{"Valid AgentGrant?<br/>Correct department and role?<br/>Classification permitted?"}

    G -->|"No"| DENY["deny<br/>No document content sent to the model"]

    G -->|"Yes"| R{"Sensitive fields<br/>need removal?"}

    R -->|"No"| ALLOW["allow<br/>Send the approved excerpt"]
    R -->|"Yes: account number"| REDACT["allow_redacted<br/>Send excerpt with account number removed"]

    DENY --> LOG["Write a SecurityEvent<br/>IDs, decision, reason, redaction count, timestamp<br/>Never the original sensitive value"]
    ALLOW --> LOG
    REDACT --> LOG
```
