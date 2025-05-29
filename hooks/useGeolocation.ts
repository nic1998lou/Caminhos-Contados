
import { useState, useEffect, useCallback, useRef } from 'react';
import { GeolocationData, Coordinates } from '../types';
import { DEFAULT_COORDINATES } from '../constants';

interface GeolocationHookResult {
  location: GeolocationData | null;
  error: string | null;
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  permissionStatus: PermissionState | null;
}

export function useGeolocation(): GeolocationHookResult {
  const [location, setLocation] = useState<GeolocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionState | null>(null);
  
  const watchIdRef = useRef<number | null>(null);

  const checkPermission = useCallback(async () => {
    if (!navigator.geolocation) {
      setError("Geolocalização não é suportada neste navegador.");
      setPermissionStatus('denied');
      return;
    }
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      setPermissionStatus(status.state);
      status.onchange = () => setPermissionStatus(status.state);
    } catch (e) {
      // Fallback for browsers not supporting permissions.query for geolocation (e.g. older Safari)
      console.warn("navigator.permissions.query for geolocation not supported or failed:", e);
      // Assume prompt if not explicitly denied or restricted previously
      setPermissionStatus('prompt'); 
    }
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  const handleSuccess = (position: GeolocationPosition) => {
    const newLocationData: GeolocationData = {
      coords: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        altitudeAccuracy: position.coords.altitudeAccuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
      },
      timestamp: position.timestamp,
    };
    setLocation(newLocationData);
    setError(null); // Clear previous errors
  };

  const handleError = (err: GeolocationPositionError) => {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        setError("Permissão de geolocalização negada.");
        break;
      case err.POSITION_UNAVAILABLE:
        setError("Informação de localização indisponível.");
        break;
      case err.TIMEOUT:
        setError("A requisição de localização expirou.");
        break;
      default:
        setError("Ocorreu um erro desconhecido na geolocalização.");
        break;
    }
    setIsTracking(false); // Stop tracking on error
  };

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocalização não é suportada neste navegador.");
      setIsTracking(false);
      return;
    }

    if (permissionStatus === 'denied') {
      setError("Permissão de geolocalização negada. Verifique as configurações do seu navegador.");
      setIsTracking(false);
      return;
    }

    setError(null); // Clear previous errors
    setIsTracking(true);
    
    // Get initial position quickly
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000, // 10 seconds
      maximumAge: 0 // Force fresh location
    });

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 20000, // 20 seconds
        maximumAge: 10000, // Use cached position if not older than 10s
      }
    );
  }, [permissionStatus]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    // Optionally set location to null or a default when tracking stops
    // setLocation(null); 
  }, []);

  useEffect(() => {
    // Cleanup: stop tracking when component unmounts
    return () => {
      stopTracking();
    };
  }, [stopTracking]);
  
  // Set a default location if permission is denied or tracking not started, for UI consistency
  const displayLocation = location ?? (permissionStatus === 'denied' || !isTracking ? { coords: DEFAULT_COORDINATES, timestamp: Date.now() } : null);


  return { location: displayLocation, error, isTracking, startTracking, stopTracking, permissionStatus };
}
