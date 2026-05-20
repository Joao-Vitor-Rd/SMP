"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

import { formatCoordinate, type MapReviewInspection } from "../../lib/map-review";

type MapCanvasProps = {
  items: MapReviewInspection[];
  selectedId: string | null;
  onSelect: (itemId: string) => void;
  onMove: (itemId: string, latitude: number, longitude: number) => void;
};

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

function MapBoundsController({ items }: { items: MapReviewInspection[] }) {
  const map = useMap();

  useEffect(() => {
    const validItems = items.filter((item): item is MapReviewInspection & { latitude: number; longitude: number } => (
      typeof item.latitude === "number" && typeof item.longitude === "number"
    ));

    if (!validItems.length) {
      return;
    }

    const bounds = L.latLngBounds(validItems.map((item) => [item.latitude, item.longitude] as [number, number]));

    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.2), { animate: true });
    }
  }, [items, map]);

  return null;
}

function ReviewMarker({
  item,
  index,
  selected,
  onSelect,
  onMove,
}: {
  item: MapReviewInspection & { latitude: number; longitude: number };
  index: number;
  selected: boolean;
  onSelect: (itemId: string) => void;
  onMove: (itemId: string, latitude: number, longitude: number) => void;
}) {
  const markerIcon = useMemo(() => {
    const accent = item.locationSource === "manual" ? "#7c3aed" : item.status === "confirmed" ? "#16a34a" : "#0f5b87";

    return L.divIcon({
      className: "",
      iconAnchor: [19, 44],
      iconSize: [38, 44],
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-2px);">
          <div style="width:34px;height:34px;border-radius:999px;background:${accent};color:#fff;border:${selected ? "3px solid rgba(255,255,255,0.95)" : "2px solid rgba(255,255,255,0.8)"};box-shadow:0 12px 24px rgba(15,23,42,.28);display:flex;align-items:center;justify-content:center;font:800 12px/1 Inter, Arial, sans-serif;letter-spacing:.02em;">${index + 1}</div>
          <div style="width:14px;height:14px;margin-top:-5px;background:${accent};transform:rotate(45deg);border-radius:0 0 4px 0;box-shadow:0 8px 14px rgba(15,23,42,.22);"></div>
        </div>
      `,
    });
  }, [index, item.locationSource, item.status, selected]);

  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    markerRef.current?.setIcon(markerIcon);
    markerRef.current?.dragging?.enable();
  }, [markerIcon]);

  return (
    <Marker
      ref={markerRef}
      position={[item.latitude, item.longitude]}
      draggable
      eventHandlers={{
        click: () => onSelect(item.id),
        dragend: (event) => {
          const marker = event.target;
          const latLng = marker.getLatLng();
          onMove(item.id, latLng.lat, latLng.lng);
        },
      }}
    >
      <Popup>
        <div className="max-w-60 space-y-1.5">
          <p className="m-0 font-bold text-slate-900">{item.fileName}</p>
          <p className="text-xs text-slate-500">
            Latitude {formatCoordinate(item.latitude)} | Longitude {formatCoordinate(item.longitude)}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}

export default function MapCanvas({ items, selectedId, onSelect, onMove }: MapCanvasProps) {
  const validItems = items.filter((item): item is MapReviewInspection & { latitude: number; longitude: number } => (
    typeof item.latitude === "number" && typeof item.longitude === "number"
  ));

  const center = validItems.length > 0 ? [validItems[0].latitude, validItems[0].longitude] as [number, number] : [-23.5505, -46.6333] as [number, number];
  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const mapContainerProps = {
    center,
    zoom: 13,
    scrollWheelZoom: true,
    className: "h-full min-h-150 rounded-[28px] border border-white/70 shadow-[0_24px_80px_rgba(15,23,42,0.12)]",
    zoomControl: false,
  } as any;

  const tileLayerProps = {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  } as any;

  return (
    <MapContainer {...mapContainerProps}>
      <TileLayer {...tileLayerProps} />
      <MapBoundsController items={items} />
      <MapClickController selectedItem={selectedItem} onMove={onMove} />
      {validItems.map((item, index) => (
        <ReviewMarker
          key={item.id}
          item={item}
          index={index}
          selected={selectedId === item.id}
          onSelect={onSelect}
          onMove={onMove}
        />
      ))}
    </MapContainer>
  );
}