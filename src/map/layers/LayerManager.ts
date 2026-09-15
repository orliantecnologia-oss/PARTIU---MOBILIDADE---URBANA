/**
 * ==============================================================================
 * 🗺️ PARTIU — LAYER MANAGER (CENTRAL ORCHESTRATOR FOR ALL MAPBOX LAYERS)
 * ==============================================================================
 * Orquestrador central que gerencia o ciclo de vida, visibilidade e atualização
 * independente de todas as camadas do mapa sem re-renderizar a árvore do React:
 * - drivers: LayerDrivers (Clustering dinâmico de 500 a 20.000 veículos)
 * - passenger: LayerPassenger (Localização e acurácia do passageiro)
 * - trips: LayerTrips (Rotas, polyline ativa e pinos)
 * - deliveries: LayerDeliveries (Pontos de entrega urbana)
 * - reservations: LayerReservations (Pontos estratégicos e agendamentos)
 * - heatmap: LayerHeatmap (Mapa de calor de demanda e alta densidade)
 * ==============================================================================
 */

import type mapboxgl from "mapbox-gl";
import { LayerDrivers } from "./LayerDrivers";
import { LayerPassenger } from "./LayerPassenger";
import { LayerTrips } from "./LayerTrips";
import { LayerDeliveries } from "./LayerDeliveries";
import { LayerReservations } from "./LayerReservations";
import { LayerHeatmap } from "./LayerHeatmap";

export type MapLayerName =
  | "drivers"
  | "passenger"
  | "trips"
  | "deliveries"
  | "reservations"
  | "heatmap";

export class LayerManager {
  public readonly drivers = new LayerDrivers();
  public readonly passenger = new LayerPassenger();
  public readonly trips = new LayerTrips();
  public readonly deliveries = new LayerDeliveries();
  public readonly reservations = new LayerReservations();
  public readonly heatmap = new LayerHeatmap();

  private map: mapboxgl.Map | null = null;
  private isInitialized = false;

  public init(map: mapboxgl.Map, options: {
    onDriverClick?: (driver: any) => void;
    onReservationSelect?: (point: any) => void;
  } = {}): void {
    this.map = map;

    this.heatmap.init(map);
    this.trips.init(map);
    this.drivers.init(map, options.onDriverClick);
    this.reservations.init(map, options.onReservationSelect);
    this.deliveries.init(map);
    this.passenger.init(map);

    this.isInitialized = true;
  }

  public setLayerVisibility(layerName: MapLayerName, visible: boolean): void {
    switch (layerName) {
      case "drivers":
        this.drivers.setVisibility(visible);
        break;
      case "passenger":
        this.passenger.setVisibility(visible);
        break;
      case "trips":
        this.trips.setVisibility(visible);
        break;
      case "deliveries":
        this.deliveries.setVisibility(visible);
        break;
      case "reservations":
        this.reservations.setVisibility(visible);
        break;
      case "heatmap":
        this.heatmap.setVisibility(visible);
        break;
    }
  }

  public destroy(): void {
    this.drivers.destroy();
    this.passenger.destroy();
    this.trips.destroy();
    this.deliveries.destroy();
    this.reservations.destroy();
    this.heatmap.destroy();
    this.map = null;
    this.isInitialized = false;
  }
}
