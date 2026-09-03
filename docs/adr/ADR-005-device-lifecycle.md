# ADR-005: Device Security Lifecycle & Revocation

## Context

Tablets e rastreadores IoT operam fisicamente em veículos e estão sujeitos a furto ou comprometimento.

## Decision

Criamos máquina de estados formal (`PROVISIONING`, `ACTIVE`, `OFFLINE`, `SUSPENDED`, `REVOKED`, `RETIRED`) com revogação instantânea e bloqueio de telemetria/validação.

## Consequences

- Dispositivos comprometidos são bloqueados imediatamente em todo o ecossistema.
