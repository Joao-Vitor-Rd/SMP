"use client";

import L from "leaflet";
import { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";

import { formatCoordinate } from "../src/lib/map-review";

export type CustomMapMarkerProps = {
  id: string;
  latitude: number;
  longitude: number;
  urlImagem: string;
  hasGpsOriginal: boolean;
  selected?: boolean;
  onSelect?: (itemId: string) => void;
  onPositionChange: (itemId: string, latitude: number, longitude: number) => void;
};

const GPS_PIN_COLOR = "#2563eb";
const MANUAL_PIN_COLOR = "#ea580c";

function createPinIcon(color: string) {
  return L.divIcon({
    className: "",
    iconAnchor: [12, 41],
    iconSize: [25, 41],
    popupAnchor: [1, -34],
    html: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 41" width="25" height="41" aria-hidden="true">
        <path
          fill="${color}"
          stroke="#ffffff"
          stroke-width="1.5"
          d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z"
        />
        <circle cx="12.5" cy="12.5" r="5" fill="#ffffff" fill-opacity="0.9"/>
      </svg>
    `,
  });
}

export default function CustomMapMarker({
  id,
  latitude,
  longitude,
  urlImagem,
  hasGpsOriginal,
  selected = false,
  onSelect,
  onPositionChange,
}: CustomMapMarkerProps) {
  const icon = useMemo(
    () => createPinIcon(hasGpsOriginal ? GPS_PIN_COLOR : MANUAL_PIN_COLOR),
    [hasGpsOriginal],
  );

  return (
    <Marker
      position={[latitude, longitude]}
      icon={icon}
      draggable
      eventHandlers={{
        click: () => onSelect?.(id),
        dragend: (event: L.LeafletEvent) => {
          const marker = event.target as L.Marker;
          const { lat, lng } = marker.getLatLng();
          onPositionChange(id, lat, lng);
        },
      }}
      opacity={selected ? 1 : 0.92}
      zIndexOffset={selected ? 1000 : 0}
    >
      <Popup>
        <div className="flex w-36 flex-col items-center gap-2 p-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urlImagem}
            alt="Imagem da inspeção"
            className="h-32 w-32 rounded-md border border-slate-200 object-cover shadow-sm"
          />
          <div className="w-full space-y-0.5 text-center text-xs text-slate-700">
            <p className="m-0 font-semibold text-slate-900">
              Latitude: {formatCoordinate(latitude)}
            </p>
            <p className="m-0 font-semibold text-slate-900">
              Longitude: {formatCoordinate(longitude)}
            </p>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
