# SUPABASE REALTIME & EVENT STREAMING PLAN — PARTIU
### Arquitetura de Canais WebSocket, Broadcast e Presence entre Aparelhos

> **Arquivo de Serviço Relacionado:** [`src/lib/partiu-realtime-service.ts`](file:///c:/Users/Suporte/Desktop/PARTIU-%20MOBILIDADE%20URBANA/src/lib/partiu-realtime-service.ts)

---

## 1. ESTRUTURAÇÃO DE CANAIS
O PARTIU opera com canais segmentados para evitar tráfego cruzado e saturação de largura de banda em redes móveis 3G/4G:

```
SUPABASE REALTIME CHANNELS
├── 1. "partiu:dispatch-city" (Canal Público de Despacho da Praça)
│   ├── Evento: "trip:sync" (Broadcast de novas ofertas e cancelamentos)
│   └── Presence: Monitoramento de condutores conectados (lat/lng a cada 4s)
│
├── 2. "partiu:trip-{id}" (Canal Privado da Corrida Ativa)
│   ├── Evento: "driver:location" (Streaming contínuo do carro a caminho)
│   ├── Evento: "driver:arrived" (Alerta de chegada no local de embarque)
│   └── Evento: "trip:pin_validated" (Início oficial da viagem com PIN)
│
└── 3. "partiu:emergency-noc" (Canal Crítico de Segurança 190)
    └── Evento: "sos:alert" (Sirene vermelha transmitida em < 50ms)
```

---

## 2. CICLO DE SINCRONIZAÇÃO EM TEMPO REAL
1. **Passageiro solicita corrida:**  
   O método `criarCorridaDistribuida()` grava no banco e envia broadcast para o canal `partiu:dispatch-city`.
2. **Motoristas no raio de 4 km recebem o sinal:**  
   O listener em `partiu-realtime-service.ts` recebe a mensagem WebSocket em menos de 150ms, aciona o áudio bleep do Trip Radar e renderiza o card de oferta.
3. **Primeiro motorista clica em Aceitar:**  
   Dispara a RPC atômica. Ao confirmar, envia broadcast `TRIP_ACCEPTED`. Os aparelhos dos demais condutores removem o card imediatamente.
4. **Viagem em andamento:**  
   Apenas o passageiro e o motorista conectados na sala `partiu:trip-{id}` trocam coordenadas até a finalização e split instantâneo D+0.
