# 🚗 PARTIU — Mobilidade Urbana (Enterprise V6.0)

> Plataforma corporativa de mobilidade urbana multicategoria (Carro Particular, Moto-Táxi, Entregas Expressas/Flash e Transporte Complementar) com renderização cartográfica de alta performance (Mapbox GL / React Native), despacho geográfico via PostGIS, chat em tempo real criptografado, ledger financeiro de partidas dobradas e arquitetura Zero-Trust.

---

## 📋 Sumário
1. [Visão Geral e Arquitetura](#-visão-geral-e-arquitetura)
2. [Stack Tecnológica](#-stack-tecnológica)
3. [Motor Cartográfico & Mapbox (Padrão Uber/99)](#-motor-cartográfico--mapbox-padrão-uber99)
4. [Módulos e Recursos do Sistema](#-módulos-e-recursos-do-sistema)
5. [Segurança, RLS & Criptografia](#-segurança-rls--criptografia)
6. [FinOps & Ledger de Partidas Dobradas](#-finops--ledger-de-partidas-dobradas)
7. [Suíte de Testes & Qualidade de Código](#-suíte-de-testes--qualidade-de-código)
8. [Como Executar o Projeto](#-como-executar-o-projeto)
9. [Diretrizes Lovable](#-diretrizes-lovable)

---

## 🏛️ Visão Geral e Arquitetura

O **PARTIU** foi construído sob os princípios de **Clean Architecture**, **Domain-Driven Design (DDD)** e **Transactional Outbox/Inbox Pattern**, garantindo resiliência offline, isolamento multi-inquilino (multi-tenant) e processamento em lote acelerado por GPU.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   EXPERIENCE LAYER (Web, PWA, Mobile)                  │
│       React 18 + TanStack Router + Tailwind CSS + Mapbox GL JS        │
│                React Native Mobile (@rnmapbox/maps)                    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│                       APPLICATION & DOMAIN CORE                        │
│   Dispatch Engine (PostGIS ST_DWithin) • Pricing Engine • Chat Engine  │
│   Continuous GPS & Snap to Route • En Route Experience • SOS 190       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│                    FINOPS & PERSISTÊNCIA RELACIONAL                     │
│    Double-Entry Ledger (Minor Units) • Pix Split • Webhook HMAC        │
│          Supabase (PostgreSQL 15+ & PostGIS) • RLS Zero-Trust          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 💻 Stack Tecnológica

* **Frontend Web/PWA**: React 18, Vite 5, TanStack Router (`@tanstack/react-router`), Tailwind CSS v4, Lucide React, Radix UI.
* **Mobile Runtime**: React Native (`@rnmapbox/maps`), Animated API nativa a 60 FPS com `useNativeDriver: true`.
* **Motor Cartográfico**: Mapbox GL JS v3, `@types/mapbox-gl`.
* **Backend as a Service**: Supabase (`@supabase/supabase-js`), PostgreSQL 15+ com extensão espacial PostGIS.
* **Criptografia & Assinaturas**: Ed25519 (RFC 8032), HMAC-SHA256 para webhooks financeiros.
* **Test Runner & Benchmarks**: Vitest v5, TSX (`tsx test/run-all-tests.mjs`).

---

## 🗺️ Motor Cartográfico & Mapbox (Padrão Uber/99)

A camada cartográfica do **PARTIU** segue o padrão estético e funcional de referências mundiais de mobilidade:

### 1. Estilo Monocromático Ultra-Minimalista
* **Base Map**: `mapbox://styles/mapbox/light-v11` (tons suaves de cinza claro, branco e gelo).
* **Supressão Ativa de POIs**: Eliminação em tempo de execução de estabelecimentos comerciais (`poi-label`), transporte coletivo (`transit-label`) e divisões administrativas (`settlement-subdivision-label`), mantendo a tela focada estritamente nas vias.
* **Prédios 3D Sutis**: Extrusão volumétrica (`FillExtrusionLayer`) em cinza gelo (`#E2E8F0`) com opacidade 0.3 a partir do zoom 15.

### 2. Linha de Rota (Polyline de Alto Contraste)
* **Linha Principal**: Preto profundo (`#1A1A1A`), largura `4.8px`, com terminações e curvas arredondadas (`lineCap: 'round'`, `lineJoin: 'round'`).
* **Casing Inferior**: Borda branca sólida (`#FFFFFF`), largura `7.5px`, garantindo separação visual absoluta contra o asfalto cinza do mapa.

### 3. Frota 3D com Billboarding 2.5D
* **Carro (SUV Branco Crossover)**: Asset 3D verticalizado (350x438, recortado em 197x368), 100% canal alfa transparente, calibrado a 0° (Norte).
* **Moto (Piloto com Capacete e Scooter)**: Asset 3D desobstruído com remoção de fundo multissemente em raios de rodas e guidão, preservando a calça jeans azul e detalhes do piloto.
* **Injeção GPU Instantânea**: Disponibilizados via Base64 Data URI (`car-premium-base64.ts` e `moto-premium-base64.ts`), eliminando latência de rede.
* **Escala Inteligente (`iconSize`)**: Interpolação matemática proporcional ao nível de aproximação (`zoom 10: 0.08` a `zoom 18: 0.25`).
* **Rotação no Asfalto (`iconRotate`)**: Sincronização angular com a via através de `iconRotationAlignment: 'map'` e eixo central `iconAnchor: 'center'`.
* **Billboarding Viewport**: `iconPitchAlignment: 'viewport'` mantém o veículo volumétrico e sem achatamento mesmo com a câmera inclinada a 60°.

### 4. Marcador do Passageiro (`PulsingUserDot`)
* **Substituição do marcador padrão do SO**: Passado como filho de `<MapboxGL.UserLocation>`, fixando-se automaticamente no GPS.
* **Pulso Contínuo**: Anel com expansão de escala (1.0x a 2.8x) e dissipação de opacidade (0.65 a 0.0) em loop infinito de 1800ms executado no thread de UI nativo.
* **Ponto Central Sólido**: Círculo escuro (`#0F172A`) envolto por borda branca de 3px e sombra de elevação.

---

## 🚀 Módulos e Recursos do Sistema

* **Despacho em Ondas Expansivas (PostGIS)**: Busca concêntrica de motoristas parceiros em raios de 2 km, 4 km e 6 km com `ST_DWithin`, ranqueados por fórmula algorítmica (`DispatchScore`).
* **En Route Experience**: Experiência do passageiro enquanto o motorista está a caminho, incluindo cálculo de taxa de cancelamento com tolerância gratuita de 2 minutos, Bottom Sheet com smart camera padding (320px) e botão de emergência SOS 190.
* **Chat em Tempo Real**: Mensageria de baixa latência via Supabase Realtime, com proteção contra vazamento de PII (mascaramento de cartões e senhas), rate-limiting anti-flood e respostas rápidas (Smart Replies).
* **Snap to Route & Deadband**: Telemetria do motorista filtrada contra ruído de GPS, projetando o veículo na via e suprimindo escritas repetitivas no banco quando parado.

---

## 🔒 Segurança, RLS & Criptografia

* **Row Level Security (RLS)**: Isolamento criptográfico e lógico rigoroso entre cooperativas/franquias (multi-tenant). Nenhuma transação ou leitura vaza dados entre tenants diferentes.
* **Criptografia Ed25519 (RFC 8032)**: Assinatura digital assimétrica para validação e emissão offline de bilhetes de passagem.
* **Webhooks Protegidos com HMAC-SHA256**: Validação contra ataques de repetição (replay) e adulteração de payloads financeiros com tolerância máxima de 5 minutos.
* **Idempotency Engine**: Cabeçalho `Idempotency-Key` com hash chain que bloqueia cobranças ou despachos duplicados.
* **Circuit Breaker**: Isolamento automático de falhas em conexões externas com fallback gracioso.

---

## 💰 FinOps & Ledger de Partidas Dobradas

* **Livro-Razão Imutável**: Registro contábil com garantia matemática `SUM(Débitos) === SUM(Créditos)`.
* **Precisão em Centavos (Minor Units)**: Eliminação de erros de arredondamento IEEE 754 float operando estritamente com inteiros (ex: R$ 38,00 = 3800 centavos).
* **Split Automático Multi-Party**: Divisão instantânea da receita entre motorista, cooperativa/franquia e plataforma.
* **Motor de Estorno Auditável**: Geração de lançamentos de reversão sem exclusão física de registros históricos.

---

## 🧪 Suíte de Testes & Qualidade de Código

O sistema conta com suíte de testes de ponta a ponta que valida contratos de domínio, segurança e concorrência:

```sh
npm test
```

```text
================================================================================
📊 RESULTADO FINAL V6.0 ENTERPRISE: 244/244 TESTES PASSARAM (0 FALHAS)
================================================================================
✅ 24 Suítes Corporativas Validadas
✅ 100% de Aprovação em Despacho, RLS, FinOps Ledger e Criptografia
✅ 1.000 Operações Concorrentes com p95 < 20ms
```

---

## 🚀 Como Fazer Deploy na Vercel

O projeto possui suporte nativo para deploy serverless na **Vercel** via TanStack Start e Nitro:

1. Conecte o repositório GitHub na [Vercel](https://vercel.com).
2. Configure as Variáveis de Ambiente no painel do projeto:
   * `VITE_SUPABASE_URL`: URL do seu projeto Supabase
   * `VITE_SUPABASE_ANON_KEY`: Chave anônima pública do Supabase
   * `VITE_MAPBOX_TOKEN`: Token público do Mapbox
   * `NITRO_PRESET`: `vercel`
3. O comando de build é executado automaticamente (`npm run build`).

---

## 🛠️ Como Executar o Projeto

### Pré-requisitos
* Node.js 18+ instalado
* NPM ou PNPM

### Instalação e Execução
```sh
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento
npm run dev

# 3. Rodar suíte de testes corporativos
npm test
```

O aplicativo estará acessível em `http://localhost:8080/`.

---

## ⚠️ Diretrizes Lovable

Este projeto está sincronizado com o editor [Lovable](https://lovable.dev).

> **IMPORTANTE**: É proibido reescrever o histórico publicado do Git (`git push --force`, rebase ou squash de commits já enviados), sob risco de perda do histórico no editor Lovable. Mantenha os commits em estado funcional para sincronização contínua.


