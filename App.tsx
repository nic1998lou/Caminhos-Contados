
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { POI, GeolocationData, POIStatus } from './types';
import { 
  INITIAL_POIS, 
  APPROACH_THRESHOLD_MULTIPLIER, 
  BACKGROUND_MUSIC_URL, 
  BACKGROUND_MUSIC_VOLUME 
} from './constants';
import { useGeolocation } from './hooks/useGeolocation';
import { calculateDistance } from './utils/distance';
// LocationStatus and PoiCard are no longer directly used in the main app view as per new design
// import LocationStatus from './components/LocationStatus';
// import PoiCard from './components/PoiCard';
import { 
  LocationMarkerIcon, 
  ExclamationTriangleIcon, 
  SpeakerWaveIcon, 
  MapPinIcon,
  // SpeakerXMarkIcon // No longer used in this view
} from './components/Icons';

// New component for the visual structure of the Welcome Screen
const WelcomeScreenVisuals: React.FC<{ isBackgroundDimmed?: boolean; onStartInteraction: () => void }> = ({ isBackgroundDimmed, onStartInteraction }) => {
  const commonButtonClasses = `text-lg sm:text-xl font-bold uppercase tracking-wider rounded-full py-5 sm:py-6 px-16 sm:px-20 shadow-lg 
                               transition-all duration-150 ease-in-out 
                               transform hover:scale-105 active:scale-95
                               focus:outline-none focus:ring-4 focus:ring-green-300/60`;
  
  const buttonClasses = isBackgroundDimmed
    ? `${commonButtonClasses} text-gray-400 bg-gray-500 cursor-default` // Visually disabled
    : `${commonButtonClasses} text-white bg-brandGreen hover:bg-brandGreenDarker active:bg-brandGreenDarkest`;

  return (
    <div className={`min-h-screen flex flex-col bg-white ${isBackgroundDimmed ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Top green curved section */}
      <div 
        className="bg-brandGreen w-full flex flex-col items-center justify-end pt-10 sm:pt-12 md:pt-16 pb-12 sm:pb-16 md:pb-20"
        style={{ 
          borderBottomLeftRadius: 'clamp(60px, 25vw, 150px)', 
          borderBottomRightRadius: 'clamp(60px, 25vw, 150px)' 
        }}
      >
        <img 
          src="./assets/logo.png" 
          alt="Logo do Aplicativo A Pé e a Letra" 
          className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 object-contain"
        />
      </div>

      {/* Content Area (text + button) on white background */}
      <div className="flex-grow flex flex-col items-center justify-start pt-8 sm:pt-10 px-6 text-center">
        <img
          src="./assets/app_title_image.png" 
          alt="A Pé e a Letra - Título do Aplicativo"
          className="w-auto h-24 sm:h-28 md:h-32 object-contain mb-6 sm:mb-8"
        />

        <p className="text-sm sm:text-base font-medium text-brandGreen mb-16 sm:mb-20 md:mb-24 uppercase max-w-xs sm:max-w-sm">
          PREPARE-SE PARA UMA VIAGEM TURÍSTICA COMO VOCÊ NUNCA OUVIU!
        </p>

        <button
          onClick={!isBackgroundDimmed ? onStartInteraction : undefined}
          className={buttonClasses}
          disabled={isBackgroundDimmed}
          aria-label={isBackgroundDimmed ? "Iniciar desabilitado" : "Iniciar Viagem e mostrar termos de segurança"}
        >
          INICIAR
        </button>
      </div>
      
      <footer className={`text-center text-xs py-4 mt-auto ${isBackgroundDimmed ? 'text-gray-400' : 'text-gray-500'}`}>
        <p>&copy; {new Date().getFullYear()} A Pé e a Letra. Inspirado para exploração.</p>
      </footer>
    </div>
  );
};


const App: React.FC = () => {
  const { 
    location: currentGeoLocation, 
    // error: geoError, // Not displayed in the new main UI
    isTracking, 
    startTracking, 
    stopTracking,
    permissionStatus 
  } = useGeolocation();
  
  const [pois, setPois] = useState<POI[]>(INITIAL_POIS);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [activePoiForProximityRingId, setActivePoiForProximityRingId] = useState<string | null>(null);
  const [proximityRingScale, setProximityRingScale] = useState(0.2); // Scale from 0.2 to 1.0

  const poiAudioRef = useRef<HTMLAudioElement | null>(null);
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
  const [showSafetyDisclaimerModal, setShowSafetyDisclaimerModal] = useState(false);
  const [showLocationPermissionInfoModal, setShowLocationPermissionInfoModal] = useState(true);
  // const [isBackgroundMusicMuted, setIsBackgroundMusicMuted] = useState(false); // Music toggle removed from main UI

  const handleAudioEnded = useCallback(() => {
    if (currentlyPlayingId) {
      const endedPoiId = currentlyPlayingId;
      setPois(prevPois => {
        const endedPoiIndex = prevPois.findIndex(p => p.id === endedPoiId);
        if (endedPoiIndex === -1) return prevPois;

        const endedPoi = { ...prevPois[endedPoiIndex], status: 'idle' as POIStatus };
        const remainingPois = prevPois.filter(p => p.id !== endedPoiId);
        return [...remainingPois, endedPoi]; // Move to end and reset status
      });
      setCurrentlyPlayingId(null);
    }
  }, [currentlyPlayingId]);

  useEffect(() => {
    poiAudioRef.current = new Audio();
    const audio = poiAudioRef.current;

    const handleAudioError = (e: Event) => {
      console.error(`Error playing audio for POI: ${currentlyPlayingId}`, (e.target as HTMLAudioElement)?.error);
      if (currentlyPlayingId) {
        setPois(prevPois =>
          prevPois.map(p =>
            p.id === currentlyPlayingId ? { ...p, status: 'error' } : p
          )
        );
        setCurrentlyPlayingId(null); // Stop trying to play errored audio
      }
    };

    audio.addEventListener('ended', handleAudioEnded);
    audio.addEventListener('error', handleAudioError);

    return () => {
      audio?.pause();
      audio?.removeEventListener('ended', handleAudioEnded);
      audio?.removeEventListener('error', handleAudioError);
      if (audio) audio.src = '';
    };
  }, [currentlyPlayingId, handleAudioEnded]); 

  useEffect(() => {
    backgroundAudioRef.current = new Audio(BACKGROUND_MUSIC_URL);
    backgroundAudioRef.current.loop = true;
    backgroundAudioRef.current.volume = BACKGROUND_MUSIC_VOLUME;
    
    // setIsBackgroundMusicMuted(backgroundAudioRef.current.muted); // Mute state for toggle if re-added

    return () => {
      backgroundAudioRef.current?.pause();
      if (backgroundAudioRef.current) backgroundAudioRef.current.src = ''; 
      backgroundAudioRef.current = null;
    };
  }, []);


  useEffect(() => {
    if (!currentGeoLocation || !isTracking || showWelcomeScreen) {
      if (!isTracking && !showWelcomeScreen) {
        poiAudioRef.current?.pause();
        setCurrentlyPlayingId(null);
        setPois(prevPois => prevPois.map(p => (p.status !== 'played' && p.status !== 'error' ? {...p, status: 'idle'} : p)));
      }
      setActivePoiForProximityRingId(null);
      setProximityRingScale(0.2);
      return;
    }

    let poiToPlayNext: POI | null = null;
    let closestApproachablePoiForRing: POI | null = null;
    let minDistanceToPlayable = Infinity;
    let minDistanceToRingTarget = Infinity;

    const tempPois = pois.map(poi => {
      if (poi.status === 'error') return poi; // Skip errored POIs for status updates

      const distance = calculateDistance(currentGeoLocation.coords, poi.coordinates);
      let newStatus: POIStatus = poi.status;

      if (poi.id === currentlyPlayingId) {
        newStatus = 'playing';
        // If playing POI is now out of range, stop it
        if (distance > poi.triggerRadiusMeters * 1.1) { // 1.1 multiplier to prevent flapping
            poiAudioRef.current?.pause();
            setCurrentlyPlayingId(null); // This will be handled more cleanly by setting newStatus to idle here.
            newStatus = 'idle';
        }

      } else if (distance <= poi.triggerRadiusMeters) {
        newStatus = 'approaching'; // Candidate for playing or ring
        if (distance < minDistanceToPlayable) {
          minDistanceToPlayable = distance;
          poiToPlayNext = poi;
        }
      } else if (distance <= poi.triggerRadiusMeters * APPROACH_THRESHOLD_MULTIPLIER) {
        newStatus = 'approaching';
      } else {
        newStatus = 'idle';
      }
      
      // Determine POI for proximity ring (closest non-playing, non-error POI)
      // The 'poi.status !== 'error'' check was removed here as it's redundant due to the early return above.
      if (poi.id !== currentlyPlayingId) { 
        if (distance < minDistanceToRingTarget) {
          minDistanceToRingTarget = distance;
          closestApproachablePoiForRing = poi;
        }
      }
      return { ...poi, status: newStatus };
    });
    
    setPois(tempPois);
    setActivePoiForProximityRingId(closestApproachablePoiForRing?.id || null);

    if (closestApproachablePoiForRing) {
      const distanceToRingPoi = calculateDistance(currentGeoLocation.coords, closestApproachablePoiForRing.coordinates);
      const approachStartDistance = closestApproachablePoiForRing.triggerRadiusMeters * APPROACH_THRESHOLD_MULTIPLIER;
      const triggerDistance = closestApproachablePoiForRing.triggerRadiusMeters;
      let progress = 0.2; // Default min scale

      if (distanceToRingPoi <= triggerDistance) { 
          progress = 0.65 + (1 - (distanceToRingPoi / triggerDistance)) * 0.35; // Scale from 0.65 to 1.0
      } else if (distanceToRingPoi <= approachStartDistance) { 
          progress = 0.2 + (1 - ((distanceToRingPoi - triggerDistance) / (approachStartDistance - triggerDistance))) * 0.45; // Scale from 0.2 to 0.65
      }
      setProximityRingScale(Math.max(0.2, Math.min(1.0, progress)));
    } else {
      setProximityRingScale(0.2);
    }

    if (poiToPlayNext && poiAudioRef.current && poiToPlayNext.id !== currentlyPlayingId) {
      poiAudioRef.current.pause();
      poiAudioRef.current.src = poiToPlayNext.audioSrc;
      const idOfPoiToPlay = poiToPlayNext.id;
      
      poiAudioRef.current.play().then(() => {
        setCurrentlyPlayingId(idOfPoiToPlay);
        setPois(prev => prev.map(p => p.id === idOfPoiToPlay ? {...p, status: 'playing'} : p));
      }).catch(e => {
        console.error(`Error starting audio for ${idOfPoiToPlay}:`, e);
        setPois(prev => prev.map(p => p.id === idOfPoiToPlay ? {...p, status: 'error'} : p));
      });
    }

  }, [currentGeoLocation, isTracking, currentlyPlayingId, showWelcomeScreen, pois]); 


  const handleStartTrackingOnly = useCallback(() => {
    startTracking();
  }, [startTracking]);

  // const handleStopTracking = useCallback(() => { // Stop tracking button removed from main UI
  //   stopTracking();
  // }, [stopTracking]);

  const handleOpenSafetyDisclaimer = () => {
    setShowSafetyDisclaimerModal(true);
  };

  const handleAgreeToSafetyDisclaimer = () => {
    setShowSafetyDisclaimerModal(false);
    setShowWelcomeScreen(false);
    handleStartTrackingOnly(); // Start tracking automatically
    if (backgroundAudioRef.current && backgroundAudioRef.current.paused) {
      backgroundAudioRef.current.play().catch(e => console.error("Error playing background music:", e));
    }
  };

  const handleDisagreeToSafetyDisclaimer = () => {
    setShowSafetyDisclaimerModal(false);
  };
  
  const modalButtonBaseClasses = "px-6 py-2.5 text-sm font-bold uppercase tracking-wider rounded-full shadow-lg transition-all duration-150 ease-in-out transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-green-300/60";
  const modalButtonConfirmClasses = `${modalButtonBaseClasses} text-white bg-brandGreen hover:bg-brandGreenDarker active:bg-brandGreenDarkest`;
  const modalButtonCancelClasses = `${modalButtonBaseClasses} text-white bg-brandGreen hover:bg-brandGreenDarker active:bg-brandGreenDarkest`;


  if (showLocationPermissionInfoModal) {
    return (
      <div className="w-full h-full"> {/* Ensure parent takes full space */}
        <WelcomeScreenVisuals isBackgroundDimmed={true} onStartInteraction={() => {}} />
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="locationPermissionInfoModalTitle"
          aria-describedby="locationPermissionInfoModalDescription"
        >
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <div className="flex items-center mb-3">
              <LocationMarkerIcon className="h-6 w-6 text-emerald-600 mr-2 flex-shrink-0" />
              <h2 id="locationPermissionInfoModalTitle" className="text-xl font-bold text-black uppercase">
                Permissão de Localização
              </h2>
            </div>
            <p id="locationPermissionInfoModalDescription" className="text-sm text-gray-700 mb-4">
              Permita acesso à localização do aparelho.
            </p>
            {permissionStatus === 'denied' && (
              <p className="text-red-500 text-sm font-semibold uppercase mb-4">
                A permissão de localização foi negada. Por favor, habilite-a nas configurações do seu navegador.
              </p>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => setShowLocationPermissionInfoModal(false)}
                className={modalButtonConfirmClasses}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }


  if (showWelcomeScreen) {
    return (
      <div className="w-full h-full"> {/* Ensure parent takes full space */}
        <WelcomeScreenVisuals onStartInteraction={handleOpenSafetyDisclaimer} />

        {showSafetyDisclaimerModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="safetyDisclaimerModalTitle"
            aria-describedby="safetyDisclaimerModalDescription"
          >
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full text-black">
              <div className="flex items-center mb-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mr-2 flex-shrink-0" />
                <h2 id="safetyDisclaimerModalTitle" className="text-xl font-bold text-black uppercase">ATENÇÃO IMPORTANTE!</h2>
              </div>
              <p id="safetyDisclaimerModalDescription" className="text-sm text-black mb-6">
                Sou passageiro e/ou como ciclista e pedestre estou atento ao meu redor prezando pela minha segurança e a de terceiros.
              </p>
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                 <button
                  onClick={handleAgreeToSafetyDisclaimer}
                  className={modalButtonConfirmClasses}
                >
                  Eu Concordo
                </button>
                <button
                  onClick={handleDisagreeToSafetyDisclaimer}
                  className={modalButtonCancelClasses}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main Audio Guide Screen
  const currentlyPlayingPoiDetails = pois.find(p => p.id === currentlyPlayingId);
  const approachingPoiForRingDetails = pois.find(p => p.id === activePoiForProximityRingId);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Green Curved Section */}
      <div 
        className="bg-brandGreen w-full flex-grow-0 flex-shrink-0 basis-auto flex flex-col items-center text-white pt-6 pb-10 sm:pb-16 md:pb-20 relative"
        style={{ 
          borderBottomLeftRadius: 'clamp(40px, 15vw, 100px)', 
          borderBottomRightRadius: 'clamp(40px, 15vw, 100px)' 
        }}
      >
        {currentlyPlayingPoiDetails && (
          <div className="absolute top-4 left-4 bg-white text-brandGreen p-3 rounded-lg shadow-lg max-w-[calc(100%-2rem-32px)]"> {/* 32px for potential right-side element */}
            <div className="flex items-center">
              <SpeakerWaveIcon className="h-5 w-5 mr-2 text-brandGreen flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold truncate">{currentlyPlayingPoiDetails.name}</p>
                <p className="text-xs uppercase">STATUS: REPRODUZINDO</p>
              </div>
            </div>
          </div>
        )}

        <p className="text-xl sm:text-2xl font-bold uppercase mt-16 sm:mt-20 mb-3 sm:mb-4">
          APROXIMANDO DE...
        </p>

        {/* Proximity Rings */}
        <div className="relative w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 flex items-center justify-center mb-2 sm:mb-3">
          <div className="absolute inset-0 bg-lightTeal bg-opacity-70 rounded-full"></div>
          <div 
            className="bg-white rounded-full transition-all duration-500 ease-out"
            style={{ 
              width: `${proximityRingScale * 100}%`, 
              height: `${proximityRingScale * 100}%`,
              minWidth: '20%', // Ensure it's always visible
              minHeight: '20%',
            }}
          ></div>
        </div>

        <p className="text-base sm:text-lg font-semibold uppercase text-center px-4 h-12 sm:h-14 flex items-center justify-center">
          {approachingPoiForRingDetails ? approachingPoiForRingDetails.name : "NENHUM PONTO PRÓXIMO"}
        </p>
      </div>

      {/* Bottom White Section - POI List */}
      <div className="bg-white flex-grow w-full p-4 sm:p-6 overflow-y-auto">
        <div className="space-y-3 sm:space-y-4 max-w-2xl mx-auto">
          {pois.map(poi => {
            let statusText = "AGUARDANDO";
            if (poi.id === currentlyPlayingId) statusText = "REPRODUZINDO";
            else if (poi.id === activePoiForProximityRingId && poi.status === 'approaching') statusText = "APROXIMANDO";
            else if (poi.status === 'approaching') statusText = "PRÓXIMO"; // General approaching if not THE one for ring
            else if (poi.status === 'error') statusText = "ERRO";

            return (
              <div key={poi.id} className="flex items-center p-3 bg-gray-50 rounded-lg shadow">
                <div className="bg-brandGreen p-3 rounded-lg mr-3 sm:mr-4 flex-shrink-0">
                  <MapPinIcon className="h-6 w-6 sm:h-7 sm:h-7 text-white" />
                </div>
                <div className="flex-grow overflow-hidden">
                  <p className="text-sm sm:text-base font-semibold text-brandGreen uppercase truncate">{poi.name}</p>
                  <p className="text-xs sm:text-sm text-gray-600 uppercase">STATUS: {statusText}</p>
                </div>
              </div>
            );
          })}
           {pois.length === 0 && (
             <p className="text-center text-gray-500">Nenhum ponto de interesse disponível.</p>
           )}
        </div>
      </div>
    </div>
  );
};

export default App;
