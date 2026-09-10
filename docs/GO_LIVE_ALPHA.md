# GO-LIVE ALPHA PROTOCOL — PARTIU (PRAÇA PILOTO)
### Procedimento Operacional Padrão de Entrada em Produção Controlada

> **Comitê de Liberação:**  
> • Principal Software Architect (Uber)  
> • Principal Marketplace Engineer (99)  
> • Principal SRE & Principal Security Engineers  
> **Status:** 🟢 Documento Homologado para a Fase Alpha da Praça Piloto  
> **Área Piloto:** Perímetro Restrito de 4 km² (Centro Comercial & Gastronômico)  
> **Frota Piloto:** 50 Condutores Fundadores Homologados  

---

## 1. CRITÉRIOS DE CORTE (GO / NO-GO CRITERIA)
A liberação da Praça Piloto obedece à regra de tolerância zero com relação a:
* **Integridade Contábil:** 0 centavos de divergência entre o total pago pelo passageiro e a soma do repasse líquido do condutor (88%) + taxa da plataforma (12%).
* **Concorrência do Trip Radar:** 0 ocorrências de duplo aceite ou corridas fantasmas sob teste de estresse de colisão.
* **Latência de Matching:** Menos de 2 segundos para propagação da oferta nos aparelhos de todos os motoristas em raio de até 4 km.
* **Conexão Realtime:** 100% dos eventos fluindo via Supabase Realtime Channels (eliminado isolamento em `localStorage`).

---

## 2. TIMELINE DETALHADA DO DIA D (LANÇAMENTO)

```
06h00 — SRE & Infraestrutura:
├── Verificação de integridade dos nós Supabase e status dos canais Realtime.
├── Checagem de conectividade com a API do PSP bancário (Pix Sandbox/Produção).
└── Confirmação de latência dos WebSockets (< 30ms).

07h00 — Ativação dos Motoristas Fundadores:
├── Notificação push aos 50 condutores cadastrados para abertura do app de motorista.
├── Confirmação do status "Online" no mapa do Command Center (NOC).
└── Validação do streaming de telemetria GPS e presença em tempo real.

08h00 — Abertura do Aplicativo de Passageiro:
├── Liberação do acesso às rotas de solicitação com cupom `PARTIU10`.
├── Monitoramento ativo de solicitações na malha do Trip Radar.
└── Supervisão do PIN de 4 dígitos nos primeiros embarques reais.

12h00 — Primeira Auditoria Financeira de Fechamento:
├── Conciliação do Ledger de Dupla Entrada contra o extrato bancário do PSP.
├── Verificação dos saques D+0 solicitados pelos parceiros (Taxa Zero comprovada).
└── Apuração do NPS de passageiros e motoristas das primeiras 50 corridas.

20h00 — Encerramento do Turno 1 & Análise de SLAs:
├── Fulfillment Rate apurado (Meta: > 88%).
├── ETA médio registrado (Meta: < 5,5 minutos).
└── Relatório de incidentes e abertura de chamados técnicos para refinamento contínuo.
```

---

## 3. PROCEDIMENTO DE ROLLBACK EMERGENCIAL
Caso ocorra inconsistência bancária ou falha de conectividade generalizada:
1. **Gatilho de Rollback:** Mais de 3 falhas consecutivas no gateway PIX ou divergência de saldo superior a R$ 0,00.
2. **Ação:** O NOC executa o travamento imediato de novas solicitações através do comando administrativo de congelamento temporário da praça.
3. **Comunicação:** Disparo de notificação aos 50 condutores informando pausa técnica de manutenção com garantia de rendimentos do período.
