# REDLOCK & DISTRIBUTED LOCKING IMPLEMENTATION PLAN — PARTIU
### Arquitetura de Semáforos Distribuídos para Garantia de 0 Duplo Aceite no Trip Radar

---

## 1. O DESAFIO DE CONCORRÊNCIA DO TRIP RADAR
Quando uma corrida é transmitida via Trip Radar para 10 motoristas em uma mesma praça, há uma janela crítica de 50 a 300 milissegundos onde dois motoristas podem tocar no botão "Aceitar" simultaneamente. Sem controle atômico, ambos os aparelhos confirmariam a viagem, gerando o pior cenário de marketplace: **dois motoristas deslocando-se para o mesmo passageiro**.

---

## 2. A SOLUÇÃO DE DUPLA CAMADA (DEFENSE IN DEPTH)

```mermaid
sequenceDiagram
    autonumber
    actor MotoristaA as Motorista A (Celular 1)
    actor MotoristaB as Motorista B (Celular 2)
    participant Gateway as API Gateway / WebSocket
    participant Redlock as Redis Redlock (Cluster)
    participant Postgres as PostgreSQL RPC (FOR UPDATE NOWAIT)

    MotoristaA->>Gateway: Aceitar Corrida (COR-123456)
    MotoristaB->>Gateway: Aceitar Corrida (COR-123456)
    
    par Lock Layer
        Gateway->>Redlock: AcquireLock("lock:trip:COR-123456", ttl=12s)
        Redlock-->>Gateway: Sucesso (Motorista A obteve o lock)
    and
        Gateway->>Redlock: AcquireLock("lock:trip:COR-123456", ttl=12s)
        Redlock-->>Gateway: Falha (Chave já travada)
    end

    Gateway->>Postgres: partiu_aceitar_corrida_atomica(COR-123456, MotA)
    Note over Postgres: SELECT * FROM partiu_corridas WHERE id = COR-123456 FOR UPDATE NOWAIT
    Postgres-->>Gateway: Corrida Atribuída ao Motorista A (Status: A_CAMINHO)

    Gateway-->>MotoristaA: 🟢 "Corrida confirmada! Vá ao local de embarque."
    Gateway-->>MotoristaB: 🔴 "Outro motorista parceiro aceitou a corrida no mesmo instante."
```

### Camada 1: Semáforo em Memória (Redis Redlock)
* **Chave:** `lock:trip:{corrida_id}`
* **TTL (Time to Live):** 12 segundos (tempo máximo da oferta).
* **Operação:** `SET lock:trip:{corrida_id} {motorista_id} NX PX 12000`.
* Se retornar `OK`, o condutor ganha o direito exclusivo de processar o aceite. Se retornar `NULL`, a requisição é rejeitada em 1ms sem tocar no banco de dados.

### Camada 2: Trava Atômica no Banco Relacional (`FOR UPDATE NOWAIT`)
* Executada na RPC `partiu_aceitar_corrida_atomica`.
* Caso ocorra qualquer falha no Redis, o PostgreSQL bloqueia a linha da corrida com bloqueio exclusivo sem espera (`NOWAIT`). Se uma segunda transação tentar atualizar a mesma linha, o banco dispara `lock_not_available` e retorna erro estruturado limpo.
* **Garantia Técnica:** 0% de chance matemática de duplo aceite ou corridas fantasmas.
