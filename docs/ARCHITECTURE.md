# 🏛️ PARTIU — Mobilidade Urbana: Arquitetura Técnica Oficial (Enterprise V6.0)

> Especificação de Arquitetura de Software, Engenharia Cartográfica, Despacho Espacial, FinOps Ledger e Segurança Zero-Trust para a plataforma **PARTIU — Mobilidade Urbana**.

---

## 1. Identificação e Escopo do Sistema

* **Nome Oficial**: PARTIU — Mobilidade Urbana
* **Versão Canônica**: V6.0 Enterprise Hardened
* **Modalidades Atendidas**:
  1. **Carro Particular (Partiu Pop / Premium)**: Viagens urbanas individuais sob demanda.
  2. **Moto-Táxi (Partiu Moto)**: Mobilidade ágil de baixo custo e alta capilaridade.
  3. **Entregas Expressas (Partiu Flash / Delivery)**: Encomendas com autenticação por duplo PIN (Coleta e Entrega).
  4. **Transporte Complementar (Vans / Lotação)**: Linhas fixas, bilhetagem eletrônica offline e passe estudantil/universitário.

---

## 2. Camadas da Plataforma (Clean Architecture & DDD)

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     1. EXPERIENCE & PRESENTATION LAYER                          │
│  - Web / PWA: React 18, Vite 5, TanStack Router, Tailwind CSS v4, Lucide React │
│  - Mobile Engine: React Native (@rnmapbox/maps), Reanimated & Animated 60 FPS   │
│  - Cockpits: Passageiro, Motorista Parceiro, Lojista/Remetente, Admin Nacional  │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────▼────────────────────────────────────────┐
│                        2. API & BFF (BACKEND FOR FRONTEND)                      │
│  - Autenticação e Gestão de Sessão (Supabase Auth / JWT / MFA)                  │
│  - Gateway de Idempotência Global (Idempotency-Key com SHA-256 Hash Chain)      │
│  - Rate Limiting e Circuit Breaker (Token Bucket + Fault Isolation)             │
│  - Sanitização de PII (Proteção automática de cartões de crédito e senhas)     │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────▼────────────────────────────────────────┐
│                         3. DOMAIN & LOGISTICS CORE                              │
│  - Dispatch Engine: ST_DWithin PostGIS, Ondas de 2km/4km/6km, DispatchScore     │
│  - En Route Experience: Tolerância de 2min, Smart Camera Padding (320px), SOS   │
│  - Telemetry Pipeline: Continuous GPS, Snap to Route, Deadband e Heartbeat      │
│  - Chat Engine: Supabase Realtime, Outbox Offline, Anti-Flood e Smart Replies   │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────▼────────────────────────────────────────┐
│                     4. TRANSACTIONAL OUTBOX & EVENT BUS                         │
│  - Outbox Pattern Atômico: Escrita unificada de eventos de domínio no Postgres   │
│  - Dispatcher com Exponential Backoff (1s, 2s, 4s, 8s) e Dead-Letter Queue (DLQ)│
│  - Replay Criptográfico e Detecção de Sequence Gaps                             │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────▼────────────────────────────────────────┐
│                         5. FINOPS LEDGER & SECURITY                             │
│  - Strict Double-Entry Bookkeeping: SUM(Débitos) === SUM(Créditos)              │
│  - Minor Units Precision: Contabilidade estrita em centavos inteiros            │
│  - Webhook Engine: Assinatura HMAC-SHA256 e janela de tolerância de 5 minutos   │
│  - Criptografia Ed25519: Emissão e validação offline de bilhetes                │
│  - PostgreSQL 15+ com PostGIS e RLS Multi-Tenant Zero-Trust                     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Engenharia Cartográfica & Mapbox (Padrão Uber/99)

A camada cartográfica do **PARTIU** foi projetada para alto contraste, zero ruído visual e renderização em 60 FPS direta na GPU.

### 3.1 Estilo Visual Monocromático (`light-v11`)
* **URL Canônica**: `mapbox://styles/mapbox/light-v11`
* **Estética**: Asfalto e quarteirões em tons suaves de cinza, branco e gelo, eliminando a poluição cromática de mapas convencionais.
* **Supressão Ativa de POIs**:
  No carregamento do mapa (`onDidFinishLoadingStyle`), as camadas de ruído visual são ocultadas em tempo de execução:
  - `poi-label`: Remove ícones de restaurantes, lojas e pontos turísticos.
  - `transit-label`: Remove ícones e rótulos de estações e paradas.
  - `settlement-subdivision-label`: Remove nomes densos de pequenos bairros.
* **Prédios 3D Volumétricos (`FillExtrusionLayer`)**:
  Ativados a partir do zoom 15 para dar tridimensionalidade sem obstruir as vias (`fillExtrusionColor: '#E2E8F0'`, `fillExtrusionOpacity: 0.3`).

### 3.2 Linha de Rota (Polyline de Alto Contraste)
* **Casing Inferior (`partiu-route-casing`)**:
  - `lineColor: '#FFFFFF'` (Branco puro)
  - `lineWidth: 7.5px`
  - `lineCap: 'round'`, `lineJoin: 'round'`
  - Cria um contorno sólido que destaca a rota em qualquer piso.
* **Linha Principal (`partiu-route-line`)**:
  - `lineColor: '#1A1A1A'` (Preto profundo / chumbo escuro Uber)
  - `lineWidth: 4.8px`
  - `lineCap: 'round'`, `lineJoin: 'round'`

### 3.3 Veículos 3D com Billboarding 2.5D
* **SUV Branco Crossover (`car-premium`)**:
  - Asset verticalizado (0° Norte), 197x368 pixels, canal alfa 100% transparente.
  - Incorporado via Base64 Data URI (`car-premium-base64.ts`).
* **Motocicleta com Piloto (`moto-premium`)**:
  - Fundo azul e sombra de piso removidos com algoritmo multissemente.
  - Raios das rodas e vão do guidão desobstruídos.
  - Calça jeans e detalhes do piloto 100% preservados.
  - Incorporado via Base64 Data URI (`moto-premium-base64.ts`).
* **Parâmetros do `SymbolLayer`**:
  - `iconPitchAlignment: 'viewport'`: Mantém os veículos em pé (sem achatamento) com pitch de até 60°.
  - `iconRotationAlignment: 'map'`: O veículo vira o bico acompanhando as curvas da rua.
  - `iconAnchor: 'center'`: Eixo de rotação no centro exato do veículo.
  - `iconRotate: ['coalesce', ['get', 'heading'], ['get', 'bearing'], 0]`: Leitura angular fluida.
  - `iconSize`: Interpolação de `0.08` (zoom 10) até `0.25` (zoom 18).

### 3.4 Marcador de Passageiro em Tempo Real (`PulsingUserDot`)
* Passado como componente filho dentro de `<MapboxGL.UserLocation>`.
* **Motor de Animação**: Loop infinito de 1800ms executado no thread de UI nativo a 60 FPS (`useNativeDriver: true`).
* **Radar Expansivo**: Escala cresce de 1.0x para 2.8x enquanto a opacidade dissipa de 0.65 para 0.0.
* **Ponto Central**: Círculo preto/grafite com borda branca de 3px e sombra de elevação (3.5px).

---

## 4. Motor de Despacho & Logística (PostGIS ST_DWithin)

### 4.1 Ondas Expansivas de Despacho
O matching de motoristas parceiros opera em 3 ondas concêntricas para garantir menor tempo de espera (ETA) e economia de combustível:
1. **Onda 1**: Raio de **2.000 metros** (prioridade máxima).
2. **Onda 2**: Raio de **4.000 metros** (expansão aos 15 segundos).
3. **Onda 3**: Raio de **6.000 metros** (expansão aos 30 segundos).

### 4.2 Algoritmo de Ranking (`DispatchScore`)
Os motoristas dentro do raio são ordenados pela fórmula:
$$\text{Score} = (\text{Distância} \times 0.40) + (\text{ETA} \times 0.25) + (\text{Plano/Fidelidade} \times 0.15) + (\text{Avaliação} \times 0.20)$$

---

## 5. FinOps & Ledger de Partidas Dobradas

### 5.1 Regra Fundamental da Contabilidade
Nenhuma transação financeira pode ser criada sem balanceamento contábil rigoroso:
$$\sum \text{Débitos} \equiv \sum \text{Créditos}$$

### 5.2 Minor Units (Centavos Inteiros)
Todos os valores monetários no banco de dados e na memória do sistema são expressos em centavos inteiros (tipo `integer` ou `bigint`), eliminando imprecisões de arredondamento IEEE 754 de ponto flutuante:
* Exemplo: Uma corrida de **R$ 38,00** é processada estritamente como **`3800` centavos**.

### 5.3 Split Financeiro Automático
Na conclusão da corrida, o montante em garantia (escrow) é liquidado atomicamente:
* **Motorista Parceiro**: 85% a 91.5%
* **Cooperativa / Franquia Local**: 7% a 10%
* **Taxa de Gateway / PSP**: 1.5% a 2.5%
* **Taxa da Plataforma Partiu**: Margem configurável por tenant.

---

## 6. Segurança, Criptografia & RLS Multi-Tenant

* **Row Level Security (RLS)**: Cada tabela do banco possui políticas ativas com cláusula `tenant_id = current_setting('app.current_tenant_id')`. Tentativas de acesso cross-tenant são bloqueadas pelo próprio kernel do PostgreSQL.
* **Criptografia Assimétrica Ed25519 (RFC 8032)**:
  - Chaves privadas mantidas exclusivamente em variáveis de ambiente protegidas no servidor.
  - Validação de bilhetes de passagem em totens offline utilizando apenas a chave pública.
* **Assinatura HMAC-SHA256**:
  - Todos os webhooks de pagamento (Pix / Cartão) exigem cabeçalho `X-Partiu-Signature`.
  - Payloads com timestamp superior a 5 minutos são descartados para prevenir ataques de replay.

---

## 7. Qualidade de Software & Suíte de Testes

O repositório inclui suíte automatizada de testes corporativos executada via `npm test` (`npx tsx test/run-all-tests.mjs`):

```text
================================================================================
📊 RESULTADO FINAL V6.0 ENTERPRISE: 167/167 TESTES PASSARAM (0 FALHAS)
================================================================================
📂 Suíte 1:  Domain State Machines & Guard Invariants
📂 Suíte 2:  Zero-Trust Multi-Tenancy & Adversarial RLS Guards
📂 Suíte 3:  Global Idempotency Engine (Anti-Duplication)
📂 Suíte 4:  FinOps Minor Units Precision & Balanced Ledger
📂 Suíte 5:  Transactional Outbox, Event Bus & DLQ
📂 Suíte 6:  SOS Critical Path State Machine & Priority Queue
📂 Suíte 7:  Circuit Breaker Fault Isolation Engine
📂 Suíte 8:  Cryptographic Key Lifecycle & Multi-Version Rotation
📂 Suíte 9:  Offline Queue Sequence Gaps & Hash Chain
📂 Suíte 10: Multi-Variable Telemetry & Anomaly Scoring Engine
📂 Suíte 11: Real In-Process Concurrency Benchmark (1,000 iterations em 2ms)
📂 Suíte 12: Authentic Ed25519 Cryptography (RFC 8032)
📂 Suíte 13: Financial Webhook HMAC-SHA256 Anti-Tamper & Anti-Replay
📂 Suíte 14: Strict Double-Entry Bookkeeping Ledger
📂 Suíte 15: Server-Side Ticket Issuance & Zero Private Key Client Leak
📂 Suíte 16: Atomic Seat Reservation & Concurrency Overbooking Preventor
📂 Suíte 17: Outbox Worker Engine, Exponential Backoff & DLQ Dispatch
📂 Suíte 18: SOS Security Hardening & Tenant Anti-Flood Guards
📂 Suíte 19: GPS Geographic Deadband & Database Write Throttle
📂 Suíte 20: Continuous GPS Engine & Resilient Background Telemetry
📂 Suíte 21: Cloud Ticket Persistence & Phone Identity Normalization
📂 Suíte 22: Broadcast Notifications & Multi-Category Routing Engine
================================================================================
```

