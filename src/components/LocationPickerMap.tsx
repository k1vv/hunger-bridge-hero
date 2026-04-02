/// <reference types="google.maps" />
import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface PickedLocation {
  address: string;
  lat: number | null;
  lng: number | null;
}

interface LocationPickerMapProps {
  value: PickedLocation;
  onChange: (location: PickedLocation) => void;
}

const DEFAULT_CENTER = { lat: 3.139, lng: 101.6869 };

const LocationPickerMap = ({ value, onChange }: LocationPickerMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadingMap, setLoadingMap] = useState(true);

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
          setLoadingMap(false);
          return;
        }
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => { setMapLoaded(true); setLoadingMap(false); };
        script.onerror = () => setLoadingMap(false);
        document.head.appendChild(script);
      } catch {
        setLoadingMap(false);
      }
    };
    loadScript();
  }, []);

  const reverseGeocode = useCallback(
    (latLng: { lat: number; lng: number }) => {
      if (!geocoderRef.current) {
        onChange({ address: `${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}`, ...latLng });
        return;
      }
      geocoderRef.current.geocode({ location: latLng }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          onChange({
            address: results[0].formatted_address,
            lat: latLng.lat,
            lng: latLng.lng,
          });
        } else {
          onChange({ address: `${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}`, ...latLng });
        }
      });
    },
    [onChange],
  );

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
    const marker = new google.maps.Marker({ position: center, map, draggable: true });
    const geocoder = new google.maps.Geocoder();

    marker.addListener("dragend", () => {
      const pos = marker.getPosition();
      if (pos) reverseGeocode({ lat: pos.lat(), lng: pos.lng() });
    });

    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        marker.setPosition(e.latLng);
        reverseGeocode({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      }
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;
    geocoderRef.current = geocoder;

    if (searchInputRef.current) {
      const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
        componentRestrictions: { country: "my" },
        fields: ["geometry", "formatted_address"],
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.geometry?.location) {
          map.setCenter(place.geometry.location);
          map.setZoom(17);
          marker.setPosition(place.geometry.location);
          onChange({
            address: place.formatted_address || "",
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
        }
      });
    }
  }, [mapLoaded, reverseGeocode]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        mapInstanceRef.current?.setCenter(latLng);
        mapInstanceRef.current?.setZoom(17);
        markerRef.current?.setPosition(latLng);
        reverseGeocode(latLng);
      },
      (err) => {
        if (err.code === 1) toast.error("Location access denied.");
        else toast.error("Unable to get location.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-2">
      <Label>Pickup Location</Label>
      <div className="flex gap-2">
        <Input ref={searchInputRef} placeholder="Search location..." className="flex-1" />
        <Button type="button" variant="outline" size="icon" onClick={handleLocateMe} title="Use my location">
          <MapPin className="h-4 w-4" />
        </Button>
      </div>
      <div ref={mapRef} className="w-full h-40 rounded-md border border-input bg-muted" style={{ minHeight: 160 }}>
        {loadingMap && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      {value.address && (
        <p className="text-xs text-muted-foreground truncate">📍 {value.address}</p>
      )}
    </div>
  );
};

export default LocationPickerMap;
