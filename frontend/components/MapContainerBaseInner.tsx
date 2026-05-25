"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";

import type { MapReviewInspection } from "../src/lib/map-review";
import type { TrechoBoundingBox } from "../src/lib/trechosApi";
import CustomMapMarker from "./CustomMapMarker";

export type MapContainerBaseInnerProps = {
  items: MapReviewInspection[];
  selectedId?: string | null;
  onSelect?: (itemId: string) => void;
  onMove: (itemId: string, latitude: number, longitude: number) => void;
  onBoundsChange?: (bounds: TrechoBoundingBox | null) => void;
};

const DEFAULT_CENTER: [number, number] = [-23.5505, -46.6333];
const DEFAULT_ZOOM = 13;

function MapBoundsController({ items }: { items: MapReviewInspection[] }) {
  const map = useMap();

  useEffect(() => {
    const validItems = items.filter(
      (item): item is MapReviewInspection & { latitude: number; longitude: number } =>
        typeof item.latitude === "number" && typeof item.longitude === "number",
    );

    if (!validItems.length) {
      return;
    }

    const bounds = L.latLngBounds(
      validItems.map((item) => [item.latitude, item.longitude] as [number, number]),
    );

    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.2), { animate: true });
    }
  }, [items, map]);

  return null;
}

function MapClickController({
  selectedItem,
  onMove,
}: {
  selectedItem: MapReviewInspection | null;
  onMove: (itemId: string, latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click: (event) => {
      if (!selectedItem) {
        return;
      }

      onMove(selectedItem.id, event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function MapViewportController({
  onBoundsChange,
}: {
  onBoundsChange?: (bounds: TrechoBoundingBox | null) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!onBoundsChange) {
      return;
    }

    const emitBounds = () => {
      const bounds = map.getBounds();

      if (!bounds.isValid()) {
        onBoundsChange(null);
        return;
      }

      const northEast = bounds.getNorthEast();
      const southWest = bounds.getSouthWest();

      onBoundsChange({
        topLeftLat: northEast.lat,
        topLeftLng: southWest.lng,
        bottomRightLat: southWest.lat,
        bottomRightLng: northEast.lng,
      });
    };

    emitBounds();
  }, [map, onBoundsChange]);

  useMapEvents({
    moveend: () => {
      if (!onBoundsChange) {
        return;
      }

      const bounds = map.getBounds();
      if (!bounds.isValid()) {
        onBoundsChange(null);
        return;
      }

      const northEast = bounds.getNorthEast();
      const southWest = bounds.getSouthWest();

      onBoundsChange({
        topLeftLat: northEast.lat,
        topLeftLng: southWest.lng,
        bottomRightLat: southWest.lat,
        bottomRightLng: northEast.lng,
      });
    },
    zoomend: () => {
      if (!onBoundsChange) {
        return;
      }

      const bounds = map.getBounds();
      if (!bounds.isValid()) {
        onBoundsChange(null);
        return;
      }

      const northEast = bounds.getNorthEast();
      const southWest = bounds.getSouthWest();

      onBoundsChange({
        topLeftLat: northEast.lat,
        topLeftLng: southWest.lng,
        bottomRightLat: southWest.lat,
        bottomRightLng: northEast.lng,
      });
    },
  });

  return null;
}

export default function MapContainerBaseInner({
  items,
  selectedId = null,
  onSelect,
  onMove,
  onBoundsChange,
}: MapContainerBaseInnerProps) {
  const validItems = items.filter(
    (item): item is MapReviewInspection & { latitude: number; longitude: number } =>
      typeof item.latitude === "number" && typeof item.longitude === "number",
  );

  const center =
    validItems.length > 0
      ? ([validItems[0].latitude, validItems[0].longitude] as [number, number])
      : DEFAULT_CENTER;

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="h-[600px] w-full overflow-hidden rounded-lg shadow-md">
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBoundsController items={items} />
        <MapViewportController onBoundsChange={onBoundsChange} />
        <MapClickController selectedItem={selectedItem} onMove={onMove} />
        {validItems.map((item) => (
          <CustomMapMarker
            key={item.id}
            id={item.id}
            latitude={item.latitude}
            longitude={item.longitude}
            urlImagem={item.imageUrl}
            hasGpsOriginal={item.locationSource === "gps"}
            selected={selectedId === item.id}
            onSelect={onSelect}
            onPositionChange={onMove}
          />
        ))}
      </MapContainer>
    </div>
  );
}
