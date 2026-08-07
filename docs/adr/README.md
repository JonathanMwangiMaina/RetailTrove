# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the RetailTrove platform. ADRs document significant architectural choices, including the context, the decision, and its consequences.

## Format

Each ADR follows the [MADR](https://adr.github.io/madr/) template:

- **Title:** Clear statement of the decision
- **Status:** Proposed, Accepted, Deprecated, or Superseded
- **Context:** Why this decision was needed
- **Decision:** What was decided
- **Consequences:** Trade-offs, benefits, and risks

## Index

| ADR | Title | Status |
|-----|-------|--------|
| 001 | [Monorepo with Shared Schema](ADR-001-monorepo-with-shared-schema.md) | ✅ Accepted |
| 002 | [Repository Pattern with IStorage](ADR-002-repository-pattern.md) | ✅ Implemented |
| 003 | [Dual-Mode Deployment (Dev + Serverless)](ADR-003-dual-mode-deployment.md) | ✅ Implemented |
| 004 | [PostgreSQL-Backed Sessions](ADR-004-postgres-backed-sessions.md) | ✅ Accepted |
| 005 | [Drizzle ORM as Data Layer](ADR-005-drizzle-orm.md) | ✅ Accepted |
| 006 | [Payment Idempotency Strategy](ADR-006-payment-idempotency.md) | ✅ Implemented |
| 007 | [Sentry Guard Pattern](ADR-007-sentry-guard-pattern.md) | ✅ Accepted |
| 008 | [Server-Side Order Total Verification](ADR-008-server-side-total-verification.md) | ✅ Accepted |
| 009 | [Self-Hosted Image Optimization Proxy](ADR-009-self-hosted-image-optimization-proxy.md) | ✅ Accepted |
