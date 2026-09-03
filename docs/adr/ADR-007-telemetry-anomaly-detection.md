# ADR-007: Telemetry Pipeline & GPS Jump Anomaly Detection

## Context

Rastreadores IoT podem enviar dados corrompidos ou sofrer GPS spoofing com saltos irreais de localização.

## Decision

Implementamos pipeline de ingestão com cálculo de velocidade por Haversine, sinalizando `TELEMETRY_ANOMALY` para deslocamentos acima de 180 km/h sem descartar o registro bruto.

## Consequences

- Preservação da integridade do mapa sem perda de trilha de auditoria.
