import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PickupLocationMapProps {
  lat: number | null;
  lng: number | null;
  address: string;
}

const PickupLocationMap = ({ lat, lng, address }: PickupLocationMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lat || !lng) {
      setLoading(false);
      return;
    }

    const initMap = async () => {
      // Check if Google Maps is already loaded
      if ((window as any).google?.maps) {
        setMapReady(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("get-maps-key");
        if (error || !data?.key) {
          setLoading(false);
          return;
        }
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          setMapReady(true);
          setLoading(false);
        };
        script.onerror = () => setLoading(false);
        document.head.appendChild(script);
      } catch {
        setLoading(false);
      }
    };

    initMap();
  }, [lat, lng]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !lat || !lng || mapInstanceRef.current) return;

    const position = { lat, lng };
    const map = new google.maps.Map(mapRef.current, {
      center: position,
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      gestureHandling: "cooperative",
    });

    new google.maps.Marker({
      position,
      map,
      title: address,
    });

    mapInstanceRef.current = map;
  }, [mapReady, lat, lng, address]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mapInstanceRef.current = null;
    };
  }, []);

  if (!lat || !lng) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="h-4 w-4 flex-shrink-0" />
        <span>{address}</span>
        <span className="italic">(No map coordinates available)</span>
      </div>
    );
  }

  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-accent" />
          Pickup Location
        </p>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent hover:underline flex items-center gap-1"
        >
          Open in Maps <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div
        ref={mapRef}
        className="w-full h-36 rounded-lg border border-border bg-muted overflow-hidden"
      >
        {loading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground truncate">{address}</p>
    </div>
  );
};

export default PickupLocationMap;
