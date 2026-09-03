# 💰 UniVans TOS — FinOps Minor Units & Double-Entry Ledger (V4.0)

## 1. Representação em Centavos Inteiros (Minor Units)

Valores monetários são processados como inteiros (centavos) para eliminar erros de ponto flutuante:

- R$ 38,00 -> 3800 centavos
- Taxa Cooperativa (8.5%) -> 323 centavos
- Taxa PSP -> 45 centavos
- Repasse Motorista -> 3477 centavos
- Invariante Estrita: SUM(Débitos) === SUM(Créditos) [3845 === 3845]

## 2. Imutabilidade & Estornos

Modificações são realizadas exclusivamente via lançamentos de estorno (`reversal_of`) imutáveis.
