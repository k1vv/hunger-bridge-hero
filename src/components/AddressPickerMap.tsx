/// <reference types="google.maps" />
import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface StructuredAddress {
  street1: string;
  street2: string;
  city: string;
  postcode: string;
  state: string;
  fullAddress: string;
  lat: number | null;
  lng: number | null;
}

interface AddressPickerMapProps {
  value: StructuredAddress;
  onChange: (address: StructuredAddress) => void;
}

const MALAYSIAN_STATES = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Kuala Lumpur",
  "Labuan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Penang",
  "Perak",
  "Perlis",
  "Putrajaya",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
];

const DEFAULT_CENTER = { lat: 3.139, lng: 101.6869 }; // KL

function buildFullAddress(addr: Omit<StructuredAddress, "fullAddress" | "lat" | "lng">) {
  const parts = [addr.street1, addr.street2, addr.postcode + " " + addr.city, addr.state].filter(Boolean);
  return parts.join(", ");
}

const AddressPickerMap = ({ value, onChange }: AddressPickerMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadingMap, setLoadingMap] = useState(true);

  // Load Google Maps script
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return;

    const center = value.lat && value.lng ? { lat: value.lat, lng: value.lng } : DEFAULT_CENTER;

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: 14,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    const marker = new google.maps.Marker({
      position: center,
      map,
      draggable: true,
    });

    const geocoder = new google.maps.Geocoder();

    marker.addListener("dragend", () => {
      const pos = marker.getPosition();
      if (pos) {
        geocoder.geocode({ location: pos }, (results, status) => {
          if (status === "OK" && results?.[0]) {
            parseGeocoderResult(results[0]);
          }
        });
      }
    });

    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        marker.setPosition(e.latLng);
        geocoder.geocode({ location: e.latLng }, (results, status) => {
          if (status === "OK" && results?.[0]) {
            parseGeocoderResult(results[0]);
          }
        });
      }
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;
    geocoderRef.current = geocoder;

    if (searchInputRef.current) {
      const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
        componentRestrictions: { country: "my" },
        fields: ["geometry", "address_components", "formatted_address"],
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.geometry?.location) {
          map.setCenter(place.geometry.location);
          map.setZoom(17);
          marker.setPosition(place.geometry.location);

          if (place.address_components) {
            parseGeocoderResult({
              address_components: place.address_components,
              geometry: { location: place.geometry.location },
            } as google.maps.GeocoderResult);
          }
        }
      });

      autocompleteRef.current = autocomplete;
    }
  }, [mapLoaded, parseGeocoderResult]);

  const handleFieldChange = (field: keyof Omit<StructuredAddress, "fullAddress" | "lat" | "lng">, val: string) => {
    const updated = { ...value, [field]: val };
    updated.fullAddress = buildFullAddress(updated);
    onChange(updated);
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        mapInstanceRef.current?.setCenter(latLng);
        mapInstanceRef.current?.setZoom(17);
        markerRef.current?.setPosition(latLng);
        geocoderRef.current?.geocode({ location: latLng }, (results, status) => {
          if (status === "OK" && results?.[0]) {
            parseGeocoderResult(results[0]);
          }
        });
      },
      () => console.warn("Geolocation denied"),
    );
  };

  return (
    <div className="space-y-3">
      {/* Search + Map */}
      <div className="space-y-2">
        <Label>Search or pin location on map</Label>
        <div className="flex gap-2">
          <Input ref={searchInputRef} placeholder="Search address in Malaysia..." className="flex-1" />
          <Button type="button" variant="outline" size="icon" onClick={handleLocateMe} title="Use my location">
            <MapPin className="h-4 w-4" />
          </Button>
        </div>
        <div ref={mapRef} className="w-full h-48 rounded-md border border-input bg-muted" style={{ minHeight: 192 }}>
          {loadingMap && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Structured address fields */}
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1">
          <Label htmlFor="street1">Street Address 1 *</Label>
          <Input
            id="street1"
            placeholder="e.g. 10, Jalan Bukit Bintang"
            value={value.street1}
            onChange={(e) => handleFieldChange("street1", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="street2">Street Address 2 (optional)</Label>
          <Input
            id="street2"
            placeholder="e.g. Taman Sri Rampai"
            value={value.street2}
            onChange={(e) => handleFieldChange("street2", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              placeholder="e.g. Kuala Lumpur"
              value={value.city}
              onChange={(e) => handleFieldChange("city", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="postcode">Postcode *</Label>
            <Input
              id="postcode"
              placeholder="e.g. 55100"
              value={value.postcode}
              onChange={(e) => handleFieldChange("postcode", e.target.value)}
              required
              maxLength={5}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="state">State *</Label>
          <select
            id="state"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={value.state}
            onChange={(e) => handleFieldChange("state", e.target.value)}
            required
          >
            <option value="">Select state</option>
            {MALAYSIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default AddressPickerMap;
