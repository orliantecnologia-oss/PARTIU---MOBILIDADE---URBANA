# 🏛️ UniVans TOS — Arquitetura de Produção V4.0 (Enterprise Hardened)

## 1. Visão Geral

O UniVans TOS V4.0 é o Sistema Operacional de Transporte projetado sob os princípios de Clean Architecture, Domain-Driven Design (DDD), Transactional Outbox e Zero-Trust Defense-in-Depth.

## 2. Camadas da Plataforma

```text
Experience Layer (Web / PWA / Mobile / Cockpit)
       ↓
API / BFF (Auth, Rate Limiting, Idempotency, Correlation)
       ↓
Application Core (Commands, Queries, Policies)
       ↓
Domain Core (Trips, Tickets, Payments, Ledger, SOS, Fleet, Devices)
       ↓
Transactional Outbox ➔ Event Bus ➔ Consumers (Telemetry, Notifications, Analytics)
       ↓
PostgreSQL 15+ & PostGIS / RLS Multi-Tenant
```
