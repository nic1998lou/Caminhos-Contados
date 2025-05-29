
import React from 'react';
import { GeolocationData } from '../types';

interface LocationStatusProps {
  location: GeolocationData | null;
  isTracking: boolean;
  error: string | null;
  permissionStatus: PermissionState | null;
  onStartTracking: () => void;
  onStopTracking: () => void;
}

const LocationStatus: React.FC<LocationStatusProps> = ({
  location,
  isTracking,
  error,
  permissionStatus,
  onStartTracking,
  onStopTracking,
}) => {
  return (
    <div className="bg-white bg-opacity-80 backdrop-blur-sm p-6 rounded-xl shadow-xl mb-6">
      <h2 className="text-xl font-semibold mb-4 text-emerald-800">Status da Localização</h2>
      
      {permissionStatus === 'prompt' && !isTracking && (
        <p className="text-yellow-700 text-sm mb-2">Permissão de localização necessária. Clique em "Iniciar Rastreio".</p>
      )}
      {permissionStatus === 'denied' && (
        <p className="text-red-700 text-sm mb-2">Permissão de localização negada. Por favor, habilite nas configurações do seu navegador.</p>
      )}

      {error && <p className="text-red-600 text-sm mb-2">Erro: {error}</p>}
      
      {isTracking && location?.coords ? (
        <div className="space-y-1 text-sm text-emerald-700">
          <p>Latitude: <span className="font-medium text-emerald-900">{location.coords.latitude.toFixed(6)}</span></p>
          <p>Longitude: <span className="font-medium text-emerald-900">{location.coords.longitude.toFixed(6)}</span></p>
          {location.coords.accuracy && <p>Precisão: <span className="font-medium text-emerald-900">{location.coords.accuracy.toFixed(1)} metros</span></p>}
        </div>
      ) : isTracking && !error ? (
        <p className="text-blue-600 text-sm">Obtendo localização...</p>
      ) : !isTracking && !error && permissionStatus !== 'denied' ? (
         <p className="text-emerald-700 text-sm">Rastreamento de localização parado.</p>
      ) : null}

      <div className="mt-6">
        {isTracking ? (
          <button
            onClick={onStopTracking}
            className="w-full sm:w-auto text-sm font-bold uppercase tracking-wider text-red-700 bg-white rounded-full py-3 px-8 shadow-lg 
                       hover:bg-gray-100 active:bg-gray-200 transition-all duration-150 ease-in-out 
                       transform hover:scale-105 active:scale-95
                       focus:outline-none focus:ring-4 focus:ring-red-300 focus:ring-opacity-60"
          >
            Parar Rastreio
          </button>
        ) : (
          <button
            onClick={onStartTracking}
            disabled={permissionStatus === 'denied'}
            className="w-full sm:w-auto text-sm font-bold uppercase tracking-wider text-emerald-700 bg-white rounded-full py-3 px-8 shadow-lg 
                       hover:bg-gray-100 active:bg-gray-200 transition-all duration-150 ease-in-out 
                       transform hover:scale-105 active:scale-95
                       focus:outline-none focus:ring-4 focus:ring-emerald-300 focus:ring-opacity-60
                       disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            Iniciar Rastreio
          </button>
        )}
      </div>
    </div>
  );
};

export default LocationStatus;
