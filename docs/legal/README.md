# ⚖️ GOVERNANÇA JURÍDICA E COMPLIANCE — ECOSSISTEMA PARTIU V4
## Compêndio Oficial de Documentos Contratuais, Termos de Uso e Adequação LGPD

Este repositório reúne os documentos jurídicos oficiais do **PARTIU**, estruturados por assessoria jurídica especializada em Direito Digital, Mobilidade Urbana, Marketplaces SaaS e Franquias, em plena conformidade com:

- **Lei Geral de Proteção de Dados Pessoais — LGPD** (Lei nº 13.709/2018);
- **Marco Civil da Internet** (Lei nº 12.965/2014) e seu Decreto Regulamentador (Decreto nº 8.771/2016);
- **Código Civil Brasileiro** (Lei nº 10.406/2002);
- **Código de Defesa do Consumidor** (Lei nº 8.078/1990 — no que couber à intermediação);
- **Lei das Franquias** (Lei nº 13.966/2019);
- **Jurisprudência Vinculante do Supremo Tribunal Federal (STF)**: Tema 1.046 e RE 1.054.110 (Inexistência de relação de emprego entre plataformas tecnológicas e motoristas autônomos parceiros);
- **Padrões de Mercado**: Uber, 99, iFood, Mercado Livre, Rappi e Stripe.

---

## 📂 Índice dos Documentos Jurídicos

| Arquivo | Documento | Destinatários | Finalidade Operacional |
| :--- | :--- | :--- | :--- |
| [`01_TERMOS_E_CONDICOES_DE_USO.md`](file:///c:/Users/Suporte/Desktop/PARTIU-%20MOBILIDADE%20URBANA/docs/legal/01_TERMOS_E_CONDICOES_DE_USO.md) | **Termos e Condições Gerais de Uso** | Passageiros e Usuários Gerais | Regras gerais de acesso, natureza não transportadora, pagamento direto e limitações de responsabilidade. |
| [`02_TERMOS_DO_MOTORISTA_PARCEIRO.md`](file:///c:/Users/Suporte/Desktop/PARTIU-%20MOBILIDADE%20URBANA/docs/legal/02_TERMOS_DO_MOTORISTA_PARCEIRO.md) | **Termos do Motorista Parceiro** | Motoristas e Entregadores Parceiros | Contrato de licenciamento de software SaaS, diária pré-paga, 0% comissão, retenção de 100% da receita e inexistência de vínculo de emprego. |
| [`03_TERMOS_DO_MODULO_DE_ENTREGAS.md`](file:///c:/Users/Suporte/Desktop/PARTIU-%20MOBILIDADE%20URBANA/docs/legal/03_TERMOS_DO_MODULO_DE_ENTREGAS.md) | **Termos do Módulo de Entregas** | Remetentes, Destinatários e Entregadores | Declaração de conteúdo, proibições expressas, cadeia de custódia e sistema de segurança de Duplo PIN com valor probatório. |
| [`04_POLITICA_DE_CANCELAMENTO_E_REEMBOLSOS.md`](file:///c:/Users/Suporte/Desktop/PARTIU-%20MOBILIDADE%20URBANA/docs/legal/04_POLITICA_DE_CANCELAMENTO_E_REEMBOLSOS.md) | **Política de Cancelamento e Reembolsos** | Todos os Usuários e Condutores | Prazos de desistência, taxas de cancelamento, regras para diárias SaaS e estornos de corridas/entregas. |
| [`05_POLITICA_DE_PRIVACIDADE_LGPD.md`](file:///c:/Users/Suporte/Desktop/PARTIU-%20MOBILIDADE%20URBANA/docs/legal/05_POLITICA_DE_PRIVACIDADE_LGPD.md) | **Política de Privacidade e Proteção de Dados** | Todos os Titulares de Dados | Tratamento de dados pessoais, telemetria/background, direitos do Art. 18 LGPD, DPO e exclusão de conta. |
| [`06_POLITICA_DE_COOKIES.md`](file:///c:/Users/Suporte/Desktop/PARTIU-%20MOBILIDADE%20URBANA/docs/legal/06_POLITICA_DE_COOKIES.md) | **Política de Cookies e Rastreamento** | Visitantes do Portal e Web Apps | Classificação de cookies (Essenciais, Funcionais, Analíticos, Marketing) e gestão de consentimento. |
| [`07_AVISO_E_TERMO_DE_CONSENTIMENTO_LGPD.md`](file:///c:/Users/Suporte/Desktop/PARTIU-%20MOBILIDADE%20URBANA/docs/legal/07_AVISO_E_TERMO_DE_CONSENTIMENTO_LGPD.md) | **Aviso e Termo de Consentimento LGPD** | Novos Usuários no Onboarding | Termo expresso Just-In-Time com checkboxes granulares e modelo de opt-in auditável. |

---

## 🏢 Campos Editáveis (Placeholders Globais)

Para publicação em produção ou parametrização em novos tenants White Label / Franqueados, localize e substitua as variáveis entre colchetes em todos os documentos:

```text
RAZÃO SOCIAL:            [NOME DA EMPRESA]
CNPJ:                    [00.000.000/0000-00]
ENDEREÇO DA SEDE:        [ENDEREÇO COMPLETO, CIDADE - UF, CEP]
E-MAIL DE CONTATO:       [contato@empresa.com]
E-MAIL DO DPO / LGPD:    [dpo@empresa.com]
WHATSAPP DE SUPORTE:     [(00) 00000-0000]
FORO DA COMARCA:         [CIDADE - UF DO FORO DE ELEIÇÃO]
DOMÍNIO OFICIAL:         [partiumobilidade.com.br]
```

---

## 🛡️ Diretrizes de Engenharia e Compliance

1. **O PARTIU Não é Transportadora**: Todo material promocional, interface de usuário e texto contratual deve reforçar a condição da empresa como intermediadora de tecnologia e licenciadora de software (SaaS).
2. **Modais Estritos (Carro e Moto)**: A plataforma opera estritamente nas categorias individuais `CARRO` e `MOTO`, sem previsão ou permissão de vans, ônibus ou transporte coletivo.
3. **Validade de Logs e Duplo PIN**: Os logs de geolocalização e os códigos hash de validação do Duplo PIN (`pickup_pin` e `dropoff_pin`) possuem armazenamento com carimbo temporal imutável para instrução probatória em juízo.
