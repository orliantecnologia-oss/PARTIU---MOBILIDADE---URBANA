# 📦 TERMOS E CONDIÇÕES DE USO DO MÓDULO DE ENTREGAS (PARTIU ENTREGAS)
## Cadeia de Custódia Digital, Declaração de Legalidade e Sistema de Duplo PIN
**Versão Oficial 4.0 — Vigência a partir de 2026**

---

## 🏢 IDENTIFICAÇÃO E ABRANGÊNCIA

O serviço **PARTIU Entregas** constitui um módulo tecnológico especializado integrado ao ecossistema da Plataforma PARTIU, de titularidade de **[NOME DA EMPRESA]** (CNPJ nº **[00.000.000/0000-00]**), destinado à intermediação de fretes urbanos rápidos e transporte de pequenas cargas e volumes por meio de condutores autônomos parceiros devidamente credenciados.

---

## 📑 ÍNDICE NAVEGÁVEL

1. [Natureza do Serviço de Intermediação de Entregas](#1-natureza-do-serviço-de-intermediação-de-entregas)
2. [Responsabilidade Exclusiva do Remetente pelo Conteúdo](#2-responsabilidade-exclusiva-do-remetente-pelo-conteúdo)
3. [Relação Exaustiva de Itens Estritamente Proibidos](#3-relação-exaustiva-de-itens-estritamente-proibidos)
4. [Declaração de Legalidade e Direito de Recusa do Entregador](#4-declaração-de-legalidade-e-direito-de-recusa-do-entregador)
5. [Cadeia de Custódia Digital e Sistema de Duplo PIN](#5-cadeia-de-custódia-digital-e-sistema-de-duplo-pin)
6. [Efeitos Jurídicos e Força Probatória dos Logs e PINs](#6-efeitos-jurídicos-e-força-probatória-dos-logs-e-pins)
7. [Limites de Dimensões, Peso e Acondicionamento](#7-limites-de-dimensões-peso-e-acondicionamento)
8. [Procedimentos em Caso de Ausência, Recusa ou Devolução Reversa](#8-procedimentos-em-caso-de-ausência-recusa-ou-devolução-reversa)
9. [Limitação de Responsabilidade da Plataforma](#9-limitação-de-responsabilidade-da-plataforma)
10. [Aceite Eletrônico Vinculante](#10-aceite-eletrônico-vinculante)

---

## 1. NATUREZA DO SERVIÇO DE INTERMEDIAÇÃO DE ENTREGAS

1.1. O **PARTIU Entregas** é um serviço de intermediação digital de transporte ponto a ponto de mercadorias, pacotes, documentos e pertences pessoais lícitos, realizado exclusivamente por meio de veículos das categorias **CARRO** e **MOTO**.

1.2. **Isenção de Atividade Postal ou Transportadora Própria:** A PARTIU não atua como empresa de correios, operadora logística proprietária ou transportadora de cargas, limitando-se a conectar o Remetente a um Entregador Parceiro autônomo disponível.

---

## 2. RESPONSABILIDADE EXCLUSIVA DO REMETENTE PELO CONTEÚDO

2.1. **Propriedade e Licitude:** O Remetente declara e garante que é o legítimo proprietário ou possuidor autorizado dos itens confiados para entrega, assumindo **responsabilidade civil, fiscal, administrativa e criminal integral e exclusiva** por todo e qualquer conteúdo transportado.

2.2. **Acondicionamento Apropriado:** É de exclusiva responsabilidade do Remetente garantir que a mercadoria esteja adequadamente embalada, lacrada, protegida contra intempéries e choques mecânicos normais de condução veicular, acompanhada da documentação fiscal exigida pela legislação (Nota Fiscal ou Declaração de Conteúdo).

---

## 3. RELAÇÃO EXAUSTIVA DE ITENS ESTRITAMENTE PROIBIDOS

> [!CAUTION]
> **PROIBIÇÃO PENAL E ADMINISTRATIVA ABSOLUTA:**
> É TERMINANTEMENTE PROIBIDO UTILIZAR A PLATAFORMA PARA O ENVIO DOS SEGUINTES ITENS:

* 🚫 **Substâncias Ilícitas:** Drogas entorpecentes, psicotrópicas, substâncias controladas sem receituário ou qualquer produto proibido pela Lei nº 11.343/2006;
* 🚫 **Material Bélico:** Armas de fogo (de qualquer calibre), armas brancas, simulacros, réplicas, munições, pólvora, fogos de artifício ou artefatos explosivos;
* 🚫 **Materiais Perigosos:** Líquidos ou gases inflamáveis, produtos químicos corrosivos, radioativos, tóxicos, infecciosos ou biológicos perigosos;
* 🚫 **Valores e Ativos:** Dinheiro em espécie (moeda nacional ou estrangeira), barras de ouro, títulos de crédito ao portador ou pedras preciosas não documentadas;
* 🚫 **Bens Ilegítimos:** Mercadorias contrabandeadas, descaminhadas, falsificadas ou de procedência duvidosa sem comprovação fiscal de origem;
* 🚫 **Cargas Vivas e Biológicas:** Animais vivos ou mortos, órgãos humanos, restos mortais ou tecidos biológicos;
* 🚫 **Quaisquer outros materiais cujo porte, manuseio ou transporte seja tipificado como infração administrativa ou crime pelas leis brasileiras.**

3.1. A constatação ou fundada suspeita de porte de qualquer item proibido ensejará a comunicação imediata do fato às autoridades policiais pelo Entregador Parceiro ou pela Plataforma, com encaminhamento dos dados de geolocalização e cadastrais do Remetente.

---

## 4. DECLARAÇÃO DE LEGALIDADE E DIREITO DE RECUSA DO ENTREGADOR

4.1. Ao solicitar a entrega, o Remetente firma formalmente declaração de que o objeto é lícito e compatível com as regras deste regulamento.

4.2. **Direito Autônomo de Inspeção e Recusa:** O Entregador Parceiro tem o direito de verificar visualmente as condições da embalagem externa do pacote e de **recusar o transporte** caso:
- O pacote apresente vazamentos, odores estranhos, fumaça ou formato que evidencie risco à segurança;
- O Remetente se recuse a exibir nota fiscal ou documento de identificação quando razoavelmente solicitado;
- A carga ultrapasse os limites dimensionais ou de peso fixados para a categoria contratada.

---

## 5. CADEIA DE CUSTÓDIA DIGITAL E SISTEMA DE DUPLO PIN

Para garantir a higidez da cadeia de custódia e assegurar prova inconteste de coleta e entrega, a PARTIU opera o **Sistema Criptográfico de Duplo PIN**:

```text
[Remetente] ---- Fornece PIN 1 ----> [Entregador Inicia Rota]
                                           |
                                      (Transporte)
                                           |
[Destinatário] --- Fornece PIN 2 ---> [Entregador Conclui e Libera]
```

### 5.1. PIN 1 — PIN de Coleta (Pickup PIN)
- **Geração:** Código numérico de 4 (quatro) dígitos gerado aleatoriamente e de forma confidencial pelo servidor backend da Plataforma no momento exato em que a entrega é solicitada;
- **Posse:** Exibido **exclusivamente na tela do aplicativo do Remetente**;
- **Operação:** O Remetente deve informar o PIN 1 verbalmente ao Entregador Parceiro no momento exato da retirada;
- **Efeito:** A inserção válida do PIN 1 no aplicativo do Entregador destrava a viagem e **comprova a transferência física da posse da encomenda**, atestando que o pacote foi retirado íntegro de sua embalagem externa.

### 5.2. PIN 2 — PIN de Entrega (Dropoff PIN)
- **Geração:** Segundo código numérico independente de 4 (quatro) dígitos gerado de forma autônoma pelo servidor;
- **Posse:** Compartilhado diretamente com o **Destinatário** (via deep link seguro de WhatsApp ou visualização na conta do solicitante);
- **Operação:** O Destinatário deve conferir visualmente o pacote e informar o PIN 2 ao Entregador no local de desembarque;
- **Efeito:** A inserção válida do PIN 2 encerra o transporte, destrava a conclusão da corrida e **atesta a entrega efetiva do pacote em mãos do destinatário**.

---

## 6. EFEITOS JURÍDICOS E FORÇA PROBATÓRIA DOS LOGS E PINS

6.1. **Aceite Eletrônico Irrevogável:** Nos termos do artigo 107 do Código Civil e do artigo 441 do Código de Processo Civil, a validação com sucesso do PIN 1 e do PIN 2 constitui **aceite eletrônico expresso, manifestação de vontade irrevogável e confissão de recebimento**, operando presunção legal *juris tantum* de perfeito adimplemento da obrigação.

6.2. **Logs Digitais como Evidência Processual:** Todos os atos de digitação e validação de PINs são gravados nos servidores da PARTIU acompanhados de:
- Carimbo temporal inviolável (Timestamp UTC);
- Coordenadas geográficas exatas no momento da validação (Latitude e Longitude via GPS);
- Identificador único do dispositivo (*Device ID*) e endereço IP do emissor.

6.3. Tais registros são arquivados de acordo com os ditames do Marco Civil da Internet e possuem plena validade jurídica como prova material documental em eventuais disputas administrativas, cíveis ou criminais.

---

## 7. LIMITES DE DIMENSÕES, PESO E ACONDICIONAMENTO

7.1. O Remetente obriga-se a respeitar as especificações operacionais do modal selecionado:

| Categoria | Peso Máximo Recomendado | Dimensões Máximas Acomodáveis | Exemplo de Itens Permitidos |
| :--- | :--- | :--- | :--- |
| 🏍️ **MOTO** | Até 15 kg | Cabível no baú/mochila do condutor (40cm x 40cm x 40cm) | Documentos, pequenos pacotes, chaves, refeições lacradas. |
| 🚗 **CARRO** | Até 40 kg | Cabível no porta-malas sem comprometer a visibilidade | Malas médias, caixas de papelão, mercadorias comerciais embaladas. |

---

## 8. PROCEDIMENTOS EM CASO DE AUSÊNCIA, RECUSA OU DEVOLUÇÃO REVERSA

8.1. **Destinatário Ausente:** O Entregador aguardará no endereço de destino por até 10 (dez) minutos. Esgotado esse prazo sem que o destinatário atenda ou forneça o PIN 2, o condutor acionará a central de suporte pelo aplicativo.

8.2. **Devolução Reversa:** Em caso de impossibilidade de entrega por endereço errado, ausência ou recusa do destinatário, a mercadoria será devolvida ao ponto de origem, devendo o Remetente arcar com o valor correspondente ao trajeto de retorno calculado pelo sistema.

---

## 9. LIMITAÇÃO DE RESPONSABILIDADE DA PLATAFORMA

9.1. A PARTIU não responderá, sob nenhuma circunstância, por:
- Danos causados a produtos acondicionados de forma inadequada, frágil ou defeituosa pelo Remetente;
- Perdas indiretas, lucros cessantes ou danos morais decorrentes de atrasos provocados por intempéries climáticas, bloqueios viários ou acidentes fortuitos;
- Mercadorias enviadas em desacordo com as regras de conteúdo proibido previstas na Cláusula 3 deste instrumento.

---

## 10. ACEITE ELETRÔNICO VINCULANTE

Ao confirmar a solicitação de uma entrega, o Usuário Remetente declara ciência e anuência formal a todas as disposições deste Termo, autorizando a utilização dos logs do Sistema de Duplo PIN como prova cabal da entrega.
