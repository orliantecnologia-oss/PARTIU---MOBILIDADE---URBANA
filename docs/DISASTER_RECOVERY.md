# 🚨 UniVans TOS — Plano de Disaster Recovery & PITR (V4.0)

## 1. Objetivos de Recuperação

- **RTO (Recovery Time Objective):** < 30 minutos.
- **RPO (Recovery Point Objective):** < 5 minutos no banco principal | 0% perda com buffer local de 2.000 eventos nas vans.
- **Dry-Run de Restauração:** Validação de integridade de 22 tabelas e consistência contábil do Ledger.
