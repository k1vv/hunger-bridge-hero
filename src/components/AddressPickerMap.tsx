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
    if ((window as any).google?.maps) {
      setMapLoaded(true);
      setLoadingMap(false);
      return;
    }

    const loadScript = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-maps-key");
        if (error || !data?.key) {
          console.error("Failed to load Maps API key:", error);
          setLoadingMap(false);
          return;
        }

        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          setMapLoaded(true);
          setLoadingMap(false);
        };
        script.onerror = () => {
          console.error("Failed to load Google Maps script");
          setLoadingMap(false);
        };
        document.head.appendChild(script);
      } catch (err) {
        console.error("Error fetching maps key:", err);
        setLoadingMap(false);
      }
    };

    loadScript();
  }, []);

  const parseGeocoderResult = useCallback(
    (result: google.maps.GeocoderResult) => {
      const components = result.address_components;
      let street1 = "";
      let street2 = "";
      let city = "";
      let postcode = "";
      let state = "";

      for (const comp of components) {
        const types = comp.types;
        if (types.includes("street_number")) {
          street1 = comp.long_name + " " + street1;
        } else if (types.includes("route")) {
          street1 = street1 + comp.long_name;
        } else if (types.includes("sublocality") || types.includes("sublocality_level_1")) {
          street2 = comp.long_name;
        } else if (types.includes("locality")) {
          city = comp.long_name;
        } else if (types.includes("postal_code")) {
          postcode = comp.long_name;
        } else if (types.includes("administrative_area_level_1")) {
          state = comp.long_name;
        }
      }

      // Fallback city
      if (!city) {
        const adminArea2 = components.find((c) => c.types.includes("administrative_area_level_2"));
        if (adminArea2) city = adminArea2.long_name;
      }

      street1 = street1.trim();

      const addr: StructuredAddress = {
        street1,
        street2,
        city,
        postcode,
        state,
        fullAddress: buildFullAddress({ street1, street2, city, postcode, state }),
        lat: result.geometry.location.lat(),
        lng: result.geometry.location.lng(),
      };
      onChange(addr);
    },
    [onChange],
  );

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !markerRef.current || !geocoderRef.current) return;

    // Only auto-locate if no existing address coordinates are already set
    if (value.lat && value.lng) return;

    if (!navigator.geolocation) {
      // Browser does not support geolocation, keep Kuala Lumpur
      mapInstanceRef.current.setCenter(DEFAULT_CENTER);
      markerRef.current.setPosition(DEFAULT_CENTER);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latLng = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };

        mapInstanceRef.current?.setCenter(latLng);
        mapInstanceRef.current?.setZoom(17);
        markerRef.current?.setPosition(latLng);

        geocoderRef.current?.geocode({ location: latLng }, (results, status) => {
          if (status === "OK" && results?.[0]) {
            parseGeocoderResult(results[0]);
          }
        });
      },
      () => {
        // If denied or failed, fall back to Kuala Lumpur
        mapInstanceRef.current?.setCenter(DEFAULT_CENTER);
        mapInstanceRef.current?.setZoom(14);
        markerRef.current?.setPosition(DEFAULT_CENTER);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }, [mapLoaded, value.lat, value.lng, parseGeocoderResult]);

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
