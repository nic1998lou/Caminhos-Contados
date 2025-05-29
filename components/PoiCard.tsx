
import React from 'react';
import { POI, Coordinates } from '../types';
import { calculateDistance } from '../utils/distance';
import { PlayIcon, CheckCircleIcon, LocationMarkerIcon, ExclamationCircleIcon, MapPinIcon } from './Icons';

interface PoiCardProps {
  poi: POI;
  currentLocation: Coordinates | null;
}

const PoiCard: React.FC<PoiCardProps> = ({ poi, currentLocation }) => {
  const distance = currentLocation ? calculateDistance(currentLocation, poi.coordinates) : null;

  const getStatusStyling = (): { 
    SvgIcon: React.FC<React.SVGProps<SVGSVGElement>>; 
    statusText: string; 
    borderColorClass: string; 
    iconColorClass: string;
    textColorClass: string;
  } => {
    switch (poi.status) {
      case 'playing':
        return { SvgIcon: PlayIcon, statusText: 'Reproduzindo...', borderColorClass: 'border-blue-500', iconColorClass: 'text-blue-600', textColorClass: 'text-blue-700' };
      case 'played':
        return { SvgIcon: CheckCircleIcon, statusText: 'Concluído', borderColorClass: 'border-green-500', iconColorClass: 'text-green-600', textColorClass: 'text-green-700' };
      case 'approaching':
        return { SvgIcon: LocationMarkerIcon, statusText: 'Aproximando-se', borderColorClass: 'border-yellow-500', iconColorClass: 'text-yellow-600', textColorClass: 'text-yellow-700' };
      case 'error':
        return { SvgIcon: ExclamationCircleIcon, statusText: 'Erro ao carregar', borderColorClass: 'border-red-500', iconColorClass: 'text-red-600', textColorClass: 'text-red-700' };
      case 'idle':
      default:
        return { SvgIcon: MapPinIcon, statusText: 'Aguardando', borderColorClass: 'border-gray-400', iconColorClass: 'text-gray-600', textColorClass: 'text-gray-700' };
    }
  };

  const { SvgIcon, statusText, borderColorClass, iconColorClass, textColorClass } = getStatusStyling();

  return (
    <div className={`bg-white bg-opacity-80 backdrop-blur-sm p-4 rounded-lg shadow-xl border-l-4 ${borderColorClass} transition-all duration-300 ease-in-out`}>
      <div className="flex items-center mb-2">
        <SvgIcon className={`h-6 w-6 mr-3 flex-shrink-0 ${iconColorClass}`} />
        <h3 className="text-lg font-semibold text-emerald-800">{poi.name}</h3>
      </div>
      <p className="text-sm text-gray-600 mb-1 ml-9">{poi.description}</p>
      <p className={`text-sm font-medium mb-2 ml-9 ${textColorClass}`}>Status: {statusText}</p>
      
      <div className="ml-9 text-xs text-gray-500 space-y-0.5">
        {distance !== null && (
          <p>
            Distância: {distance > 1000 ? `${(distance / 1000).toFixed(2)} km` : `${distance.toFixed(0)} m`}
          </p>
        )}
        <p>Raio de ativação: {poi.triggerRadiusMeters} m</p>
      </div>
    </div>
  );
};

export default PoiCard;
