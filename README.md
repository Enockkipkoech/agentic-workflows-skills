# Enock's Agentic Workflows & Skills

![Agent Skills](https://img.shields.io/badge/Agent-Skills-blue)
![License](https://img.shields.io/badge/license-MIT-green)

[![skills.sh](https://skills.sh/b/Enockkipkoech/agentic-workflows-skills)](https://skills.sh/Enockkipkoech/agentic-workflows-skills)



## Core concept:
- Reusable Skills + Composable Workflows.
- A collection of reusable Agent Skills and repeatable workflows for
software engineering, backend development, Web3, DevOps, security,
research, and technical problem solving.

## Installation

### Install the collection

```bash
npx skills@latest add Enockkipkoech/agentic-workflows-skills
```

### Install with a specific agent(claude-code, copilot,  gpt-5, codex,kimi etc.)
```bash
npx skills@latest add Enockkipkoech/agentic-workflows-skills \
  -a claude-code
 ``` 

 ### commands
 ```bash
npx skills@latest add Enockkipkoech/agentic-workflows-skills \
  --list

npx skills@latest add Enockkipkoech/agentic-workflows-skills \
  --skill nodejs-typescript

 ```

### skills
```bash
/nodejs-typescript
/javascript
/testing
/backend-engineering
/api-design
/database-design
/distributed-systems
/blockchain-web3
/solidity
/evm
/defi
/docker
/kubernetes
/cloud
/ci-cd
/application-security
/api-security
/smart-contract-security
``` 

### workflows
```bash
/architect
/scope
/audit
/check
/debug
/develop
/document
/sync
/test
/research
/software-development
/code-review
/security-audit
/system-design
/technical-interview
```

### Skill Templates

- Use When -> Don't Use When -> Workflow -> Rules -> Examples ->  Edge Cases -> References
## Repository Structure

```mermaid
graph TD
    ROOT["agentic-workflows-skills/"]

    %% Root files
    ROOT --> CLAUDE["CLAUDE.md"]
    ROOT --> LICENSE["LICENSE"]
    ROOT --> ENOCK_LICENSE["Enock's-License.txt"]
    ROOT --> PACKAGE["package.json"]
    ROOT --> PACKAGE_LOCK["package-lock.json"]
    ROOT --> README["README.md"]

    %% Documentation
    ROOT --> DOCS["docs/"]
    DOCS --> CONVENTIONS["conventions.md"]
    DOCS --> WORKFLOW_GUIDE["workflow-guide.md"]

    %% Scripts
    ROOT --> SCRIPTS["scripts/"]
    SCRIPTS --> TOKEN_USAGE["analyze-token-usage.mjs"]
    SCRIPTS --> PORTABILITY["check-portability.mjs"]

    %% Skills
    ROOT --> SKILLS["skills/"]
    SKILLS --> NODE_TS["nodejs-typescript/"]
    NODE_TS --> NODE_TS_SKILL["SKILL.md"]

    %% Workflows
    ROOT --> WORKFLOWS["workflows/"]

    %% Architect
    WORKFLOWS --> ARCHITECT["architect/"]
    ARCHITECT --> ARCH_SKILL["SKILL.md"]
    ARCHITECT --> ARCH_PROMPT["agent-prompt.md"]
    ARCHITECT --> ARCH_TEMPLATE["spec-template.md"]
    ARCHITECT --> ARCH_MODES["agent-modes/"]
    ARCH_MODES --> ARCHITECTURE["architecture.md"]
    ARCH_MODES --> CROSS_CUTTING["cross-cutting.md"]
    ARCH_MODES --> ENHANCEMENT["enhancement.md"]
    ARCH_MODES --> FEATURE["feature.md"]
    ARCHITECT --> ARCH_AGENTS["agents/"]
    ARCH_AGENTS --> ARCH_OPENAI["openai.yaml"]
    ARCHITECT --> ARCH_INTERNAL["internal/"]
    ARCH_INTERNAL --> AFTER_SUBAGENT["after-subagent.md"]
    ARCH_INTERNAL --> DESIGN_CONVERSATION["design-conversation.md"]
    ARCH_INTERNAL --> TOOL_DISCOVERY["tool-discovery.md"]

    %% Audit
    WORKFLOWS --> AUDIT["audit/"]
    AUDIT --> AUDIT_SKILL["SKILL.md"]
    AUDIT --> AUDIT_PROMPT["agent-prompt.md"]
    AUDIT --> AUDIT_AGENTS["agents/"]
    AUDIT_AGENTS --> AUDIT_OPENAI["openai.yaml"]
    AUDIT --> AUDIT_MODES["modes/"]
    AUDIT_MODES --> AREA["area.md"]
    AUDIT_MODES --> GAPFILL["gapfill.md"]
    AUDIT_MODES --> GREENFIELD["greenfield.md"]
    AUDIT_MODES --> TOOL_SKILLS["tool-skills.md"]
    AUDIT_MODES --> WHOLE_REPO["whole-repo.md"]
    AUDIT --> AUDIT_PATTERNS["patterns/"]
    AUDIT_PATTERNS --> CLEAN_ARCH["clean-architecture.md"]
    AUDIT_PATTERNS --> DOMAIN_DRIVEN["domain-driven.md"]
    AUDIT_PATTERNS --> FUNCTIONAL["functional.md"]
    AUDIT_PATTERNS --> SOLID_OOP["solid-oop.md"]

    %% Check
    WORKFLOWS --> CHECK["check/"]
    CHECK --> CHECK_SKILL["SKILL.md"]
    CHECK --> REVIEW_AGENT["review-agent-prompt.md"]
    CHECK --> REVIEW_GUIDE["review-guide.md"]
    CHECK --> CHECK_AGENTS["agents/"]
    CHECK_AGENTS --> CHECK_OPENAI["openai.yaml"]
    CHECK --> CHECK_MODES["modes/"]
    CHECK_MODES --> REVIEW["review.md"]
    CHECK_MODES --> VERIFY["verify.md"]

    %% Debug
    WORKFLOWS --> DEBUG["debug/"]
    DEBUG --> DEBUG_SKILL["SKILL.md"]
    DEBUG --> DEBUG_AGENTS["agents/"]
    DEBUG_AGENTS --> DEBUG_OPENAI["openai.yaml"]

    %% Develop
    WORKFLOWS --> DEVELOP["develop/"]
    DEVELOP --> DEVELOP_SKILL["SKILL.md"]
    DEVELOP --> DEVELOP_CHECKLIST["checklist.md"]
    DEVELOP --> DEVELOP_GUIDE["logical-guide.md"]
    DEVELOP --> DEVELOP_UI_GUIDE["ui-guide.md"]
    DEVELOP --> DEVELOP_AGENTS["agents/"]
    DEVELOP_AGENTS --> DEVELOP_OPENAI["openai.yaml"]
    DEVELOP --> DEVELOP_FLOW["flow/"]
    DEVELOP_FLOW --> BUILD["build.md"]
    DEVELOP_FLOW --> GIT["git.md"]
    DEVELOP --> DEVELOP_UI["ui/"]
    DEVELOP_UI --> EXISTING["existing.md"]
    DEVELOP_UI --> GENERATE["generate.md"]
    DEVELOP_UI --> IMAGE["image.md"]
    DEVELOP_UI --> IMPLEMENTATION["implementation.md"]
    DEVELOP_UI --> MCP["mcp.md"]

    %% Document
    WORKFLOWS --> DOCUMENT["document/"]
    DOCUMENT --> DOCUMENT_SKILL["SKILL.md"]
    DOCUMENT --> DOCUMENT_PROMPT["agent-prompt.md"]
    DOCUMENT --> DOCUMENT_AGENTS["agents/"]
    DOCUMENT_AGENTS --> DOCUMENT_OPENAI["openai.yaml"]
    DOCUMENT --> DOCUMENT_TEMPLATES["templates/"]
    DOCUMENT_TEMPLATES --> CHANGELOG["changelog.md"]
    DOCUMENT_TEMPLATES --> POSTMORTEM["postmortem.md"]
    DOCUMENT_TEMPLATES --> PR["pr.md"]
    DOCUMENT_TEMPLATES --> RELEASE_NOTE["release-note.md"]

    %% Scope
    WORKFLOWS --> SCOPE["scope/"]
    SCOPE --> SCOPE_SKILL["SKILL.md"]
    SCOPE --> SCOPE_TEMPLATE["scope-template.md"]
    SCOPE --> SCOPE_AGENTS["agents/"]
    SCOPE_AGENTS --> SCOPE_OPENAI["openai.yaml"]
    SCOPE --> SCOPE_APPROACHES["approaches/"]
    SCOPE_APPROACHES --> FACADE["facade.md"]
    SCOPE_APPROACHES --> JOURNEY["journey.md"]
    SCOPE_APPROACHES --> SKATEBOARD["skateboard.md"]
    SCOPE_APPROACHES --> TRACER["tracer-bullet.md"]
    SCOPE --> SCOPE_MODES["modes/"]
    SCOPE_MODES --> ADD["add.md"]
    SCOPE_MODES --> PLAN_BROWNFIELD["plan-brownfield.md"]
    SCOPE_MODES --> PLAN_GREENFIELD["plan-greenfield.md"]
    SCOPE_MODES --> PLAN["plan.md"]
    SCOPE_MODES --> PLAN_MONOREPO["plan-monorepo.md"]
    SCOPE_MODES --> REPLAN["replan.md"]

    %% Sync
    WORKFLOWS --> SYNC["sync/"]
    SYNC --> SYNC_SKILL["SKILL.md"]
    SYNC --> SYNC_PROMPT["agent-prompt.md"]
    SYNC --> SYNC_AGENTS["agents/"]
    SYNC_AGENTS --> SYNC_OPENAI["openai.yaml"]

    %% Test
    WORKFLOWS --> TEST["test/"]
    TEST --> TEST_SKILL["SKILL.md"]
    TEST --> TEST_PROMPT["agent-prompt.md"]
    TEST --> TEST_GUIDE["writing-guide.md"]
    TEST --> TEST_AGENTS["agents/"]
    TEST_AGENTS --> TEST_OPENAI["openai.yaml"]
    TEST --> TEST_MODES["modes/"]
    TEST_MODES --> SETUP["setup.md"]


## Philosophy

These skills are designed around:

Clear instructions
Reusable knowledge
Repeatable workflows
Progressive disclosure
Production-oriented engineering
Security-conscious development
Evidence-based research

## Author
 **Enock Kipkoech**

GitHub: **https://github.com/Enockkipkoech**    

## License

Copyright © 2026 Enock Kipkoech.

This project is proprietary software. See the [LICENSE](Enock's-License.txt) file for
the terms governing its use, modification, and distribution.

### EDUCATIONAL PURPOSES ONLY
This project is licensed under the MIT License - see the [LICENSE](https://opensource.org/licenses?categories=non-reusable) file for details

