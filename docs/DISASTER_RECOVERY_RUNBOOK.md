# 🚨 UniVans TOS — Disaster Recovery Runbook (v3.3)

Este documento define os procedimentos de contingência operacional e recuperação de desastres do sistema UniVans TOS.

---

## 🎯 Objetivos de Resiliência

- **RTO (Recovery Time Objective):** < 30 minutos.
- **RPO (Recovery Point Objective):** < 5 minutos (Banco de dados) | 0% perda com buffer offline na van.

---

## 📋 Matriz de Contingência por Subsistema

### 1. Falha no Banco de Dados Principal (PostgreSQL / Supabase)

1. **Detecção:** O endpoint `/health` ou monitoramento Sentry reporta falha de conexão $> 30\text{s}$.
2. **Procedimento:**
   - O tráfego do pooler é chaveado para a réplica de leitura no standby.
   - Dispositivos embarcados nas vans entram automaticamente em modo _Offline-First Durable Queue_.
   - Acionar snapshot de restauração PITR (Point-in-Time-Recovery) via Supabase Dashboard / CLI.
3. **Pós-Recuperação:** Executar `executarConciliacaoFinOps()` para validar a integridade do Livro-Razão.

### 2. Falha no Gateway PIX Primário (Mercado Pago)

1. **Detecção:** Taxa de erro nos webhooks $> 5\%$ ou tempo de resposta $> 5\text{s}$.
2. **Procedimento:**
   - Chavear chave de configuração `gateway_provider` para provedor secundário (Asaas / EFI Banco).
   - Inserir transações pendentes na fila `inbox_events` para conciliação retroativa.

### 3. Falha ou Queda de Conectividade Starlink / 4G na Rodovia

1. **Detecção:** Ausência de eventos de telemetria por $> 30\text{s}$.
2. **Procedimento:**
   - O app do motorista ativa o buffer local de até 2.000 eventos (`offline-durable-queue`).
   - A bilhetagem opera 100% offline via validação de assinatura Ed25519 e cache `USED_TICKETS_LOCAL`.
   - Ao restabelecer o sinal, os lotes são sincronizados com resolução de conflitos _First-Claimed_.

### 4. Comprometimento de Dispositivo / Chave Privada

1. **Procedimento:**
   - Acessar o Control Room e transicionar o dispositivo para o estado `REVOKED`.
   - O backend rejeitará imediatamente qualquer requisição de telemetria ou bilhete emitido pelo dispositivo.
   - Rotacionar o par de chaves mestras e distribuir a nova versão de chave pública via OTA.
