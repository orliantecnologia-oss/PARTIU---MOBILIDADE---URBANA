# 🏢 UniVans TOS — Multi-Tenancy & Contextual Authorization (V4.0)

## 1. Isolamento Multi-Tenant

O isolamento entre cooperativas de transporte opera por meio de Row Level Security (RLS) no PostgreSQL associado a guards de aplicação (`assertTenantAccess`).

## 2. Testes Adversariais

Tentativas de leitura cruzada (Tenant A -> Tenant B) ou deleção não autorizada são bloqueadas com código de erro `TENANT_ACCESS_DENIED`.
