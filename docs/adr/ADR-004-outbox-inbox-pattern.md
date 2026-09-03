# ADR-004: Outbox & Inbox Pattern for Event Reliability

## Context

Em sistemas distribuídos, eventos de domínio e webhooks externos podem ser perdidos ou processados em duplicidade durante instabilidades de rede.

## Decision

Adotamos o Outbox Pattern para publicação atômica de eventos no banco e Inbox Pattern com hash de payload para deduplicação idempotente de webhooks.

## Consequences

- Eliminação do problema Dual-Write.
- Resiliência contra webhooks repetidos de gateways de pagamento.
