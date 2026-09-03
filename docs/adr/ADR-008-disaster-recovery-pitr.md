# ADR-008: Disaster Recovery & PITR Resiliency

## Context

Falhas catastróficas em data centers ou indisponibilidade de rede exigem restauração rápida sem perda de dados financeiros.

## Decision

Definimos SLA com RTO < 30min e RPO < 5min com snapshots automáticos de WAL e buffer offline local nas vans.

## Consequences

- Continuidade do negócio garantida mesmo em contingência severa.
