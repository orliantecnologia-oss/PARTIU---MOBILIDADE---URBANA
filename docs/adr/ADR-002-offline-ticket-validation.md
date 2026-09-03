# ADR-002: Offline-First Ticket Validation with Ed25519 & Anti-Replay

## Context

Em trechos rodoviários remotos (ex: AL-101 Sul / BR-104), vans operam sem conectividade celular. A validação de bilhetes precisa ser 100% offline e imune a fraudes de clonagem.

## Decision

Utilizamos assinaturas assimétricas Ed25519 com verificação por chave pública em cache local, cache anti-replay no dispositivo (`USED_TICKETS_LOCAL`), e sincronização durável com resolução _First-Claimed_.

## Alternatives Considered

- Validação online síncrona obrigatória (inviabiliza a operação em áreas de sombra).
- QR Codes estáticos em texto puro (altíssimo risco de falsificação).

## Consequences

- Embarque instantâneo mesmo sem sinal 4G/Starlink.
- Bloqueio imediato de prints e QR Codes reaproveitados.
