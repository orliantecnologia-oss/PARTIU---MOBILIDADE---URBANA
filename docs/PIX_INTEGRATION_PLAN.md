# PIX & PSP INTEGRATION PLAN — PARTIU FINOPS
### Manual de Integração com Instituição de Pagamento (Bacen SPI, Asaas & Stark Bank)

> **Arquivo de Implementação Relacionado:** [`src/lib/partiu-payment-provider.ts`](file:///c:/Users/Suporte/Desktop/PARTIU-%20MOBILIDADE%20URBANA/src/lib/partiu-payment-provider.ts)

---

## 1. O FLUXO DE REPASSE INSTANTÂNEO D+0 (TAXA ZERO)

```mermaid
sequenceDiagram
    autonumber
    actor Passageiro as Passageiro
    participant App as App PARTIU
    participant Engine as FinOps & Split Engine
    participant PSP as PSP Bancário (Stark / Asaas)
    actor Motorista as Motorista Parceiro

    Passageiro->>App: Paga Corrida via PIX (R$ 35,00)
    App->>PSP: Gera Cobrança PIX com TxID
    Passageiro->>PSP: Liquida no App Bancário do Passageiro
    PSP->>App: Webhook: PAYMENT_RECEIVED (R$ 35,00)
    
    App->>Engine: Aciona Split Contábil (partiu_concluir_corrida_split)
    Note over Engine: 88% Motorista (R$ 30,80)<br/>12% Plataforma (R$ 4,20)<br/>2% Cashback (R$ 0,70)
    
    Motorista->>App: Solicita Saque Instantâneo D+0
    App->>PSP: CreateWithdrawal(chave_pix, R$ 30,80, tarifa=0)
    PSP-->>Motorista: PIX Creditado na Conta Bancária do Parceiro (< 3s)
```

---

## 2. REQUISITOS DE CONFORMIDADE BANCÁRIA
* **Conta Escrow / Pagamentos:** Todos os valores recebidos dos passageiros transitam em conta gráfica segregada (Conta de Pagamento) vinculada ao CNPJ do PARTIU.
* **Taxa Zero ao Condutor:** A tarifa de liquidação bancária cobrada pelo PSP (média de R$ 0,35 por Pix) é integralmente absorvida pela margem operacional de 12% do PARTIU, nunca repassada ao trabalhador.
* **Segurança de Webhooks:** Assinatura HMAC-SHA256 validada em cabeçalho `X-Webhook-Signature` antes do processamento de qualquer liquidação.
