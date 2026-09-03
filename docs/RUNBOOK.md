# 📖 UniVans TOS — Runbook Operacional de Produção (V4.0)

## 1. Procedimentos de Contingência

- **Queda de Banco PostgreSQL:** Ativação de réplica em standby e verificação de integridade do Ledger.
- **Instabilidade de Gateway PIX:** Acionamento de Circuit Breaker para buffer de contingência offline.
- **Comprometimento de Dispositivo / Chave:** Transição imediata para `REVOKED` no Control Room (< 1 min).
