# ADR-003: Balanced Double-Entry Financial Ledger

## Context

A plataforma processa split financeiro entre cooperativa, motoristas e gateway PIX. Atualizações destrutivas de saldo geram risco de corrupção contábil e impossibilidade de auditoria.

## Decision

Implementamos um Livro-Razão imutável (_Double-Entry Bookkeeping_) onde todo pagamento gera um Journal com $\sum \text{Débitos} = \sum \text{Créditos}$. Alterações são feitas exclusivamente por estornos (Reversals).

## Alternatives Considered

- Coluna simples `wallet_balance` com `UPDATE vehicles SET balance = balance + X` (vulnerável a race conditions).

## Consequences

- Auditoria e conciliação bancária 100% determinística.
- Garantia de conformidade fiscal e contábil.
