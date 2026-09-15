/**
 * ==============================================================================
 * 🎫 PARTIU — LAYER RESERVATIONS (SMART PICKUPS & SCHEDULED BOARDING STOPS)
 * ==============================================================================
 * Camada independente para pontos estratégicos de embarque (Smart Pickups)
 * e paradas de viagens agendadas.
 * ==============================================================================
 */

import type mapboxgl from "mapbox-gl";
import type { StrategicPickupPoint } from "@/lib/passenger/smart-pickups";

export class LayerReservations {
  private map: mapboxgl.Map | null = null;
  private isInitialized = false;
  private isVisible = true;
  private sourceId = "partiu-source-reservations";
  private layerId = "partiu-layer-reservations";
  private onSelectPoint?: (point: StrategicPickupPoint) => void;
  private cachedPoints: StrategicPickupPoint[] = [];

  public init(map: mapboxgl.Map, onSelectPoint?: (point: StrategicPickupPoint) => void): void {
    this.map = map;
    this.onSelectPoint = onSelectPoint;

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
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            12, 5,
            15, 8,
            18, 12,
          ],
          "circle-color": "#10B981",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#FFFFFF",
          "circle-opacity": 0.95,
        },
      });

      map.on("click", this.layerId, (e) => {
        const feat = e.features?.[0];
        if (!feat || !feat.properties) return;
        const id = feat.properties.id;
        const pt = this.cachedPoints.find((p) => p.id === id);
        if (pt) {
          this.onSelectPoint?.(pt);
        }
      });

      map.on("mouseenter", this.layerId, () => {
        if (this.map) this.map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", this.layerId, () => {
        if (this.map) this.map.getCanvas().style.cursor = "";
      });
    }

    this.isInitialized = true;
    this.applyVisibility();
  }

  public updatePoints(points: StrategicPickupPoint[]): void {
    this.cachedPoints = points;
    if (!this.map || !this.isInitialized) return;

    const source = this.map.getSource(this.sourceId) as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: points.map((p) => ({
          type: "Feature",
          properties: { id: p.id, nome: p.nome, tipo: p.tipo },
          geometry: { type: "Point", coordinates: p.coords },
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
    this.cachedPoints = [];
  }
}
