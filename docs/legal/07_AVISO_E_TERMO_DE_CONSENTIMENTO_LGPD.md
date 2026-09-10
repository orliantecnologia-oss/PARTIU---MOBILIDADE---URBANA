# 📝 AVISO E TERMO DE CONSENTIMENTO EXPRESSO LGPD
## Onboarding, Manifestação de Vontade e Opt-In Granular
**Versão Oficial 4.0 — Vigência a partir de 2026**

---

## 🏢 IDENTIFICAÇÃO DO CONTROLADOR

* **Razão Social:** [NOME DA EMPRESA]
* **CNPJ:** [00.000.000/0000-00]
* **Canal do DPO / LGPD:** [dpo@empresa.com]

---

## 🎯 PROPÓSITO DESTE DOCUMENTO (JUST-IN-TIME PRIVACY NOTICE)

Em respeito aos artigos 7º, I, 8º e 9º da Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018), este documento apresenta, de forma clara, didática e transparente, o resumo das operações de tratamento de dados realizadas pela Plataforma **PARTIU**, permitindo a coleta de seu consentimento livre, informado e inequívoco no momento do cadastramento.

---

## 📋 RESUMO VISUAL DAS PRÁTICAS DE PRIVACIDADE

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CENTRAL DE PRIVACIDADE PARTIU                         │
├────────────────────────────────┬────────────────────────────────────────────┤
│ DADOS ESSENCIAIS               │ Nome, CPF, Telefone, E-mail e Foto         │
├────────────────────────────────┼────────────────────────────────────────────┤
│ GEOLOCALIZAÇÃO PASSAGEIRO      │ Coletada apenas durante o uso ativo do app │
├────────────────────────────────┼────────────────────────────────────────────┤
│ GEOLOCALIZAÇÃO MOTORISTA       │ Coletada contínua/background quando ONLINE │
├────────────────────────────────┼────────────────────────────────────────────┤
│ DADOS DE CARTÃO                │ Tokenizados via Gateway (não armazenados)  │
├────────────────────────────────┼────────────────────────────────────────────┤
│ COMPARTILHAMENTO               │ Apenas entre motorista e passageiro na rota│
├────────────────────────────────┼────────────────────────────────────────────┤
│ CANAL DO ENCARREGADO (DPO)     │ [dpo@empresa.com]                          │
└────────────────────────────────┴────────────────────────────────────────────┘
```

---

## ✅ TERMO DE MANIFESTAÇÃO DE VONTADE E CHECKBOXES GRANULARES

Para concluir seu cadastro no ecossistema PARTIU, você deve manifestar sua vontade através da seleção das caixas de opção abaixo:

### 1. Termos Contratuais e Privacidade (Obrigatório para Todos)
```markdown
[X] Declaro que li, compreendi e ACEITO integralmente os Termos e Condições
    Gerais de Uso e a Política de Privacidade da Plataforma PARTIU, estando ciente
    de que a PARTIU atua como licenciadora de tecnologia SaaS e que o transporte
    é contratado diretamente com o condutor autônomo.
```

### 2. Tratamento de Dados de Geolocalização (Obrigatório para o Serviço)
```markdown
[X] AUTORIZO expressamente a coleta e o processamento dos meus dados de geolocalização
    em tempo real durante a utilização do aplicativo, ciente de que tal dado é
    estritamente indispensável para a estimativa de tarifas, determinação do trajeto,
    despacho de veículos e segurança da corrida.
```

### 3. Telemetria Contínua e em Segundo Plano (Obrigatório Apenas para Condutores Parceiros)
```markdown
[X] (EXCLUSIVO MOTORISTA/ENTREGADOR) AUTORIZO de forma expressa a coleta contínua
    de minhas coordenadas geográficas (GPS), velocidade e telemetria veicular,
    inclusive em SEGUNDO PLANO (com tela bloqueada ou app minimizado), sempre que
    eu estiver com status marcado como "ONLINE" ou "EM CORRIDA", para fins de matching
    de chamadas, despacho inteligente, combate a fraudes e acionamento do botão SOS.
```

### 4. Comunicações Promocionais e Marketing (Opcional)
```markdown
[ ] AUTORIZO o envio de notificações push, mensagens de WhatsApp e e-mails contendo
    cupons de desconto, promoções de praça e novidades comerciais do PARTIU.
    (Você poderá revogar esta opção a qualquer momento nas configurações do app).
```

---

## 🔒 REGISTRO DE AUDITORIA DE CONSENTIMENTO (OPT-IN AUDIT TRAIL)

Em estrito atendimento ao artigo 8º, § 2º da LGPD (ônus da prova do consentimento), a Plataforma grava no banco de dados, de forma imutável, o comprovante eletrônico de cada aceite contendo:

* **ID Único do Titular:** Identificador universal da conta cadastrada;
* **Timestamp UTC:** Data, hora, minuto e segundo exatos do clique no botão de aceite;
* **Endereço IP:** Endereço de protocolo de internet de onde partiu a requisição;
* **Versão dos Termos:** Código de versão e *hash SHA-256* do texto aceito;
* **User-Agent:** Identificador do modelo do dispositivo, fabricante e sistema operacional.

---

## 🔄 REVOGAÇÃO DO CONSENTIMENTO E CONTATO

O Titular de Dados poderá alterar suas preferências e revogar os consentimentos opcionais a qualquer tempo por meio das opções de privacidade no próprio aplicativo ou entrando em contato com nosso Encarregado pelo Tratamento de Dados Pessoais (DPO) através do e-mail: **[dpo@empresa.com]**.
