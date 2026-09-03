# ADR-001: Multi-Tenancy & Data Isolation via PostgreSQL RLS

## Context

O UniVans TOS atende múltiplas cooperativas de vans independentes no mesmo cluster de banco de dados. É imperativo garantir que nenhuma cooperativa acesse dados de outra.

## Decision

Adotamos isolamento por tenant no nível do banco via PostgreSQL Row Level Security (RLS) associado a `organization_id`, complementado por guards na camada de aplicação.

## Alternatives Considered

- Bancos de dados separados por cooperativa (alto custo operacional e complexidade de migração).
- Filtragem exclusiva na camada de aplicação (alto risco de vazamento por falha de query).

## Consequences

- Isolamento criptograficamente garantido no PostgreSQL.
- Obrigatoriedade de políticas RLS em todas as tabelas tenant-scoped.
