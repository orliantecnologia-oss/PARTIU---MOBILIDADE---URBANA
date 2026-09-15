/**
 * ==============================================================================
 * 📦 PARTIU — LAYER DELIVERIES (URBAN EXPRESS PACKAGES & DROP-OFFS)
 * ==============================================================================
 * Camada independente para pontos de entrega e encomendas rápidas urbanas.
 * ==============================================================================
 */

import type mapboxgl from "mapbox-gl";

export interface DeliveryPoint {
  id: string;
  coords: [number, number];
  title: string;
  status: "PENDING" | "PICKED_UP" | "DELIVERED";
}

export class LayerDeliveries {
  private map: mapboxgl.Map | null = null;
  private isInitialized = false;
  private isVisible = true;
  private sourceId = "partiu-source-deliveries";
  private layerId = "partiu-layer-deliveries";

  public init(map: mapboxgl.Map): void {
    this.map = map;

    if (!map.getSource(this.sourceId)) {
      map.addSource(this.sourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }

    if (!map.getLayer(this.layerId)) {
      map.addLayer({
        id: this.layerId,
        type: "circle",
        source: this.sourceId,
        paint: {
          "circle-radius": 6,
          "circle-color": "#F59E0B",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#FFFFFF",
        },
      });
    }

    this.isInitialized = true;
    this.applyVisibility();
  }

  public updateDeliveries(deliveries: DeliveryPoint[]): void {
    if (!this.map || !this.isInitialized) return;

    const source = this.map.getSource(this.sourceId) as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: deliveries.map((d) => ({
          type: "Feature",
          properties: { id: d.id, title: d.title, status: d.status },
          geometry: { type: "Point", coordinates: d.coords },
        })),
      });
    }
  }

  public setVisibility(visible: boolean): void {
    this.isVisible = visible;
    this.applyVisibility();
  }

  private applyVisibility(): void {
    if (!this.map || !this.isInitialized) return;
    if (this.map.getLayer(this.layerId)) {
      this.map.setLayoutProperty(this.layerId, "visibility", this.isVisible ? "visible" : "none");
    }
  }

  public destroy(): void {
    this.map = null;
    this.isInitialized = false;
  }
}
