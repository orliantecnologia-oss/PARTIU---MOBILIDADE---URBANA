# 🔑 UniVans TOS — Motor Global de Idempotência V4.0

## 1. Cobertura de Comandos Críticos

Aplica-se a: START_TRIP, END_TRIP, CANCEL_TRIP, CREATE_TICKET, VALIDATE_TICKET, BOARD_PASSENGER, CREATE_PAYMENT, CONFIRM_PAYMENT, REFUND_PAYMENT, SEND_SOS, etc.

## 2. Proteção contra Payload Mismatch

Se a mesma Idempotency-Key for reutilizada com parâmetros diferentes, a requisição é rejeitada imediatamente com `IDEMPOTENCY_CONFLICT`.
