# 🔐 UniVans TOS — Criptografia & Gestão de Chaves Ed25519 (V4.0)

## 1. Algoritmos e Assinatura

- Assinatura assimétrica Ed25519 para emissão e validação offline de bilhetes.
- Suporte a rotação de chaves com coexistência de versões N (ativa) e N-1 (depreciada).
- Bloqueio imediato para chaves no estado `REVOKED` ou `EXPIRED`.
