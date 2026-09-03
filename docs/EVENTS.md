# 📦 UniVans TOS — Arquitetura Orientada a Eventos & Outbox (V4.0)

## 1. Transactional Outbox Pattern

Garantia at-least-once: eventos de domínio são persistidos na mesma transação atômica do banco de dados na tabela `outbox_events`.

## 2. Dead-Letter Queue (DLQ)

Eventos que excedem o limite de tentativas (5 tentativas com exponential backoff) são direcionados para a DLQ para auditoria e reprocessamento seguro.
