# ADR-006: PostgreSQL & PostGIS Spatial Architecture

## Context

Cálculos de geofencing de trevos, trajetórias rodoviárias e proximidade de veículos exigem suporte geoespacial de alta precisão.

## Decision

Utilizamos a extensão PostGIS com tipos `GEOMETRY(Point, 4326)` e `GEOMETRY(LineString, 4326)` com índices espaciais GiST.

## Consequences

- Consultas espaciais executadas em milissegundos com aceleração por hardware.
