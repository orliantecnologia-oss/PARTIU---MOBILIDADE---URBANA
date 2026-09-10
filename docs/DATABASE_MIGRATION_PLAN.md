# DATABASE MIGRATION PLAN — PARTIU ENTERPRISE (V1.0)
### Plano de Execução e Rollback de Migrações de Banco de Dados

> **Arquivo de Migração Relacionado:** [`supabase/migrations/20260907_partiu_production_schema.sql`](file:///c:/Users/Suporte/Desktop/PARTIU-%20MOBILIDADE%20URBANA/supabase/migrations/20260907_partiu_production_schema.sql)

---

## 1. SEQUÊNCIA DE APLICAÇÃO EM STAGING & PRODUÇÃO
1. **Verificação de Extensões:**  
   Garantir a presença de `uuid-ossp`, `postgis` e `pgcrypto`.
2. **Criação de Tipos e Enums:**  
   Instanciação dos tipos seguros `partiu_modalidade_enum`, `partiu_status_corrida_enum`, `partiu_driver_status_enum` e `partiu_ledger_entry_type`.
3. **Criação de Tabelas Core:**  
   Provisionamento de `partiu_passageiros`, `partiu_motoristas`, `partiu_driver_status` e `partiu_corridas`.
4. **Criação de Tabelas Financeiras & B2B:**  
   Provisionamento de `partiu_wallets`, `partiu_ledger_entries`, `partiu_pix_transactions`, `partiu_entregas`, `partiu_corporate_accounts` e `partiu_sos_events`.
5. **Índices de Performance:**  
   Criação de índices espaciais `GIST` em colunas `geography(Point, 4326)` para busca de raio ultra-rápida ($< 10\text{ms}$).
6. **Deploy de Funções RPC Atômicas:**  
   Instalação das funções `partiu_solicitar_corrida`, `partiu_aceitar_corrida_atomica`, `partiu_validar_pin_embarque` e `partiu_concluir_corrida_split`.
7. **Habilitação de Row Level Security (RLS):**  
   Ativação das políticas de proteção e permissão de leitura/escrita em todas as tabelas.

---

## 2. PLANO DE ROLLBACK (SE NECESSÁRIO)
Caso ocorra erro imprevisto durante a aplicação:
```sql
DROP FUNCTION IF EXISTS public.partiu_concluir_corrida_split(UUID);
DROP FUNCTION IF EXISTS public.partiu_validar_pin_embarque(UUID, VARCHAR);
DROP FUNCTION IF EXISTS public.partiu_aceitar_corrida_atomica(UUID, UUID);
DROP FUNCTION IF EXISTS public.partiu_solicitar_corrida;

DROP TABLE IF EXISTS public.partiu_sos_events CASCADE;
DROP TABLE IF EXISTS public.partiu_corporate_cost_centers CASCADE;
DROP TABLE IF EXISTS public.partiu_corporate_accounts CASCADE;
DROP TABLE IF EXISTS public.partiu_entregas CASCADE;
DROP TABLE IF EXISTS public.partiu_pix_transactions CASCADE;
DROP TABLE IF EXISTS public.partiu_ledger_entries CASCADE;
DROP TABLE IF EXISTS public.partiu_wallets CASCADE;
DROP TABLE IF EXISTS public.partiu_trip_offers CASCADE;
DROP TABLE IF EXISTS public.partiu_corridas CASCADE;
DROP TABLE IF EXISTS public.partiu_driver_status CASCADE;
DROP TABLE IF EXISTS public.partiu_motoristas CASCADE;
DROP TABLE IF EXISTS public.partiu_passageiros CASCADE;
```
