# SRE RUNBOOK & INCIDENT RESPONSE — PARTIU
### Manual de Operações de Confiabilidade, Plantão On-Call & Gestão de Crises

---

## 1. NÍVEIS DE SEVERIDADE DE INCIDENTES (SEV MATRIX)

| Nível de Severidade | Definição Operacional | SLA de Engajamento | Canal de Comunicação |
| :--- | :--- | :---: | :--- |
| **SEV-0 (Crítico)** | Botão SOS 190 sem resposta; falha geral de matching em toda a cidade; paralisação do gateway PIX. | **< 2 minutos (24/7)** | PagerDuty telefone + Sala de Guerra imediata. |
| **SEV-1 (Alto)** | Taxa de cancelamento de corridas acima de 15%; atraso na entrega de mensagens WebSockets (> 1s). | **< 10 minutos** | Alerta PagerDuty SMS para SRE e EM. |
| **SEV-2 (Médio)** | Lentidão na geração de faturas corporativas B2B; falha na renderização de fotos de comprovante POD. | **< 30 minutos** | Canal Slack `#ops-monitoring`. |
| **SEV-3 (Baixo)** | Divergência visual cosmética no app; atraso no recálculo do ranking do Driver Club. | **Horário comercial** | Ticket no backlog. |

---

## 2. PROCEDIMENTO EM CASO DE DISPARO DE SOS 190 (SEV-0)
1. O painel administrativo do NOC emite sirene visual e sonora contínua com prioridade máxima.
2. O operador de plantão atende o chamado em até 30 segundos, visualizando na tela:
   * Placa, modelo e cor do veículo;
   * Telefone do passageiro e do condutor;
   * Coordenadas de GPS com vetor de deslocamento ao vivo.
3. Abertura do canal de áudio silencioso para gravação probatória.
4. Acionamento prioritário da viatura policial mais próxima via linha direta CIOSP/190 repassando as coordenadas geográficas.

---

## 3. CHECKLIST DE SAÚDE DIÁRIA DA INFRAESTRUTURA
* [ ] Latência p99 de despacho mantida abaixo de 25ms.
* [ ] Conexões WebSocket ativas operando com menos de 1% de reconexões anômalas.
* [ ] Pool de conexões do PostgreSQL com utilização inferior a 60%.
* [ ] Saldo do livro-razão contábil com divergência rigorosamente igual a R$ 0,00.
