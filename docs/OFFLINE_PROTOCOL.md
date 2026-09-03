# ⛓️ UniVans TOS — Protocolo de Bilhetagem Offline & Hash Chain (V4.0)

## 1. Fila Durável Offline

- Contador monotônico sequencial por dispositivo e `epoch_id`.
- Detecção automática de Sequence Gaps e Counter Rollbacks.
- Protocolo ACK: O evento local só transiciona para `ACKNOWLEDGED` após confirmação do backend.
