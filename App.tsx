
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
import {
  LocationMarkerIcon,
  ExclamationTriangleIcon,
  SpeakerWaveIcon,
  MapPinIcon,
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
          className="w-44 h-44 sm:w-52 sm:h-52 md:w-60 md:h-60 object-contain"
        />
      </div>

      {/* Content Area (text + button) on white background */}
      <div className="flex-grow flex flex-col items-center justify-start pt-8 sm:pt-10 px-6 text-center">
        <img
          src="./assets/app_title_image.png"
          alt="A Pé e a Letra - Título do Aplicativo"
          className="w-auto h-36 sm:h-44 md:h-48 object-contain mb-6 sm:mb-8"
        />

        <p className="text-lg sm:text-xl font-medium text-brandGreen mb-16 sm:mb-20 md:mb-24 uppercase max-w-sm sm:max-w-md">
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

      <footer className={`text-center text-sm py-4 mt-auto ${isBackgroundDimmed ? 'text-gray-400' : 'text-gray-500'}`}>
        <p>&copy; {new Date().getFullYear()} A Pé e a Letra. Inspirado para exploração.</p>
      </footer>
    </div>
  );
};


const App: React.FC = () => {
  const {
    location: currentGeoLocation,
    isTracking,
    startTracking,
    stopTracking,
    permissionStatus
  } = useGeolocation();

  const [pois, setPois] = useState<POI[]>(INITIAL_POIS);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [activePoiForProximityRingId, setActivePoiForProximityRingId] = useState<string | null>(null);
  const [proximityRingScale, setProximityRingScale] = useState(0.2);

  const poiAudioRef = useRef<HTMLAudioElement | null>(null);
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
  const [showSafetyDisclaimerModal, setShowSafetyDisclaimerModal] = useState(false);
  const [showLocationPermissionInfoModal, setShowLocationPermissionInfoModal] = useState(true);

  const handleAudioEnded = useCallback(() => {
    console.log(`Audio ended for POI ID: ${currentlyPlayingId}`);
    if (currentlyPlayingId) {
      const endedPoiId = currentlyPlayingId;
      setPois(prevPois => {
        const endedPoiIndex = prevPois.findIndex(p => p.id === endedPoiId);
        if (endedPoiIndex === -1) return prevPois;

        const endedPoi = { ...prevPois[endedPoiIndex], status: 'played' as POIStatus };
        return prevPois.map(p => p.id === endedPoiId ? endedPoi : p);
      });
      setCurrentlyPlayingId(null);
    }
  }, [currentlyPlayingId]); // currentlyPlayingId is a dependency

  const onAudioElementError = useCallback((event: Event) => {
    const target = event.target as HTMLAudioElement;
    console.error("[onAudioElementError] HTMLAudioElement 'error' event. Current POIs count:", pois.length, "Current playing ID:", currentlyPlayingId);
    console.error("[onAudioElementError] Error triggered for src:", target.src);

    if (target.error) {
      console.error("[onAudioElementError]   Error Code:", target.error.code);
      let message = "Unknown error.";
      switch (target.error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
              message = "The fetching process for the media resource was aborted by the user agent at the user's request.";
              break;
          case MediaError.MEDIA_ERR_NETWORK:
              message = "A network error of some description caused the user agent to stop fetching the media resource, after the resource was established to be usable.";
              break;
          case MediaError.MEDIA_ERR_DECODE:
              message = "An error of some description occurred while decoding the media resource, after the resource was established to be usable.";
              break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              message = "The media resource indicated by the src attribute or assigned media provider object was not suitable.";
              break;
          default:
              message = target.error.message || "No specific message provided by browser.";
      }
      console.error("[onAudioElementError]   Error Message:", message);
    } else {
      console.error("[onAudioElementError]   No target.error object available on the audio element.");
    }
    console.error("[onAudioElementError]   Audio Network State:", target.networkState);
    console.error("[onAudioElementError]   Audio Ready State:", target.readyState);

    const erroredPoiBySrc = pois.find(p => p.audioSrc === target.src);
    let erroredPoiIdToUpdate: string | null = null;

    if (erroredPoiBySrc) {
        erroredPoiIdToUpdate = erroredPoiBySrc.id;
    } else {
        const currentPlayingPoiDetails = pois.find(p => p.id === currentlyPlayingId);
        if (currentPlayingPoiDetails && target.src === currentPlayingPoiDetails.audioSrc) {
            erroredPoiIdToUpdate = currentlyPlayingId;
        } else if (target.src && target.src !== "" && !target.src.startsWith("data:")) {
            console.warn("[onAudioElementError] Audio error for unknown or unlinked src:", target.src);
        }
    }

    if (erroredPoiIdToUpdate) {
      console.error(`[onAudioElementError] Audio element error for POI ID ${erroredPoiIdToUpdate}. Setting status to 'error'.`);
      setPois(prevPois =>
        prevPois.map(p =>
          p.id === erroredPoiIdToUpdate ? { ...p, status: 'error' as POIStatus } : p
        )
      );
      if (currentlyPlayingId === erroredPoiIdToUpdate) {
        setCurrentlyPlayingId(null);
      }
    } else if (target.src === poiAudioRef.current?.src && currentlyPlayingId) {
        console.warn(`[onAudioElementError] Audio error occurred while POI ${currentlyPlayingId} was supposed to be playing, but src did not match. Src: ${target.src}. Setting POI ${currentlyPlayingId} to error.`);
        setPois(prevPois =>
            prevPois.map(p =>
              p.id === currentlyPlayingId ? { ...p, status: 'error' as POIStatus } : p
            )
          );
        setCurrentlyPlayingId(null);
    }
  }, [pois, currentlyPlayingId]); // Depends on pois and currentlyPlayingId

  // Initialize POI audio player once
  useEffect(() => {
    if (!poiAudioRef.current) {
      poiAudioRef.current = new Audio();
      console.log("POI Audio Player (HTMLAudioElement) initialized.");
    }
  }, []);

  // Attach/detach event listeners for POI audio
  useEffect(() => {
    const audioPlayerInstance = poiAudioRef.current;

    if (audioPlayerInstance) {
      audioPlayerInstance.addEventListener('ended', handleAudioEnded);
      audioPlayerInstance.addEventListener('error', onAudioElementError);
    }

    return () => {
      if (audioPlayerInstance) {
        audioPlayerInstance.removeEventListener('ended', handleAudioEnded);
        audioPlayerInstance.removeEventListener('error', onAudioElementError);
      }
    };
  }, [handleAudioEnded, onAudioElementError]);


  useEffect(() => {
    if (!backgroundAudioRef.current) {
        backgroundAudioRef.current = new Audio(BACKGROUND_MUSIC_URL);
        backgroundAudioRef.current.loop = true;
        backgroundAudioRef.current.volume = BACKGROUND_MUSIC_VOLUME;
        console.log("Background Audio Player initialized.");
    }
    return () => {
      console.log("App unmounting, cleaning up Background audio player.");
      backgroundAudioRef.current?.pause();
      if (backgroundAudioRef.current) backgroundAudioRef.current.src = '';
      backgroundAudioRef.current = null;
    };
  }, []);


  useEffect(() => {
    if (!currentGeoLocation || !isTracking || showWelcomeScreen) {
      if (!isTracking && !showWelcomeScreen) {
        console.log("Geolocation effect: Tracking stopped or welcome screen active. Pausing POI audio.");
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
      if (poi.status === 'error') {
        return poi;
      }

      const distance = calculateDistance(currentGeoLocation.coords, poi.coordinates);
      let newStatus: POIStatus = poi.status;

      if (poi.id === currentlyPlayingId) {
        newStatus = 'playing';
        if (distance > poi.triggerRadiusMeters * 1.1) {
            console.log(`User moved out of range for currently playing POI: ${poi.id}. Stopping audio.`);
            poiAudioRef.current?.pause();
            setCurrentlyPlayingId(null);
            newStatus = 'idle';
        }
      } else if (distance <= poi.triggerRadiusMeters) {
        if (poi.status !== 'played') {
            newStatus = 'approaching';
            if (distance < minDistanceToPlayable) {
                minDistanceToPlayable = distance;
                poiToPlayNext = poi;
            }
        } else {
            newStatus = 'played';
        }
      } else if (distance <= poi.triggerRadiusMeters * APPROACH_THRESHOLD_MULTIPLIER) {
        newStatus = (poi.status === 'played') ? 'played' : 'approaching';
      } else {
        newStatus = (poi.status === 'played') ? 'played' : 'idle';
      }

      if (poi.id !== currentlyPlayingId && poi.status !== 'played') {
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
      let progress = 0.2;

      if (distanceToRingPoi <= triggerDistance) {
          progress = 0.65 + (1 - (distanceToRingPoi / triggerDistance)) * 0.35;
      } else if (distanceToRingPoi <= approachStartDistance) {
          progress = 0.2 + (1 - ((distanceToRingPoi - triggerDistance) / (approachStartDistance - triggerDistance))) * 0.45;
      }
      setProximityRingScale(Math.max(0.2, Math.min(1.0, progress)));
    } else {
      setProximityRingScale(0.2);
    }

    if (poiToPlayNext && poiAudioRef.current && poiToPlayNext.id !== currentlyPlayingId) {
      const audioPlayer = poiAudioRef.current;

      if (!poiToPlayNext.audioSrc || typeof poiToPlayNext.audioSrc !== 'string' || poiToPlayNext.audioSrc.trim() === '') {
        console.error(`[MainEffect] Invalid or empty audioSrc for POI ${poiToPlayNext.id}: "${poiToPlayNext.audioSrc}". Cannot play. Setting status to 'error'.`);
        setPois(prevPois =>
          prevPois.map(p =>
            p.id === poiToPlayNext!.id ? { ...p, status: 'error' as POIStatus } : p
          )
        );
      } else {
        console.log(`[MainEffect] Preparing to play POI: ${poiToPlayNext.id}, src: ${poiToPlayNext.audioSrc}`);
        console.log('[MainEffect] DEBUG: poiToPlayNext antes de tentar tocar:', JSON.stringify(poiToPlayNext, null, 2));
        console.log('[MainEffect] DEBUG: poiToPlayNext.audioSrc:', poiToPlayNext.audioSrc);

        audioPlayer.pause();
        audioPlayer.src = poiToPlayNext.audioSrc;
        console.log('[MainEffect] DEBUG: audioPlayer.src ANTES de load():', audioPlayer.src);

        const idOfPoiToPlay = poiToPlayNext.id;
        const srcOfPoiToPlay = poiToPlayNext.audioSrc;

        console.log(`[MainEffect] Attempting to load and play POI: ${idOfPoiToPlay}, src: ${srcOfPoiToPlay}`);
        audioPlayer.load();

        audioPlayer.play().then(() => {
          if (audioPlayer.src === srcOfPoiToPlay && currentlyPlayingId !== idOfPoiToPlay) {
              console.log(`[MainEffect] Successfully STARTED playing POI: ${idOfPoiToPlay}`);
              setCurrentlyPlayingId(idOfPoiToPlay);
              setPois(prev => prev.map(p => p.id === idOfPoiToPlay ? {...p, status: 'playing'} : p));
          } else {
              console.warn(`[MainEffect] Audio source or playing state changed before playback confirmation for ${idOfPoiToPlay}. Current src: ${audioPlayer.src}, intended src: ${srcOfPoiToPlay}, currentlyPlayingId: ${currentlyPlayingId}`);
              if (audioPlayer.src === srcOfPoiToPlay && currentlyPlayingId === idOfPoiToPlay) {
                 setPois(prev => prev.map(p => p.id === idOfPoiToPlay ? {...p, status: 'playing'} : p));
              }
          }
        }).catch(e => {
          console.error(`[MainEffect] Error during .play() promise for POI ${idOfPoiToPlay} (src: ${srcOfPoiToPlay}):`, e);
          setPois(prev => prev.map(p => p.id === idOfPoiToPlay ? {...p, status: 'error'} : p));
          if (currentlyPlayingId === idOfPoiToPlay) {
            setCurrentlyPlayingId(null);
          }
        });
      }
    }
  }, [currentGeoLocation, isTracking, currentlyPlayingId, showWelcomeScreen, pois, handleAudioEnded, onAudioElementError]); // Added onAudioElementError to dependencies

  const handleStartTrackingOnly = useCallback(() => {
    startTracking();
  }, [startTracking]);

  const handleOpenSafetyDisclaimer = () => {
    setShowSafetyDisclaimerModal(true);
  };

  const handleAgreeToSafetyDisclaimer = () => {
    setShowSafetyDisclaimerModal(false);
    setShowWelcomeScreen(false);
    handleStartTrackingOnly();
    if (backgroundAudioRef.current && backgroundAudioRef.current.paused) {
      console.log("Attempting to play background music.");
      backgroundAudioRef.current.play().catch(e => console.error("Error playing background music:", e));
    }
    if (poiAudioRef.current && poiAudioRef.current.paused) {
      console.log("Attempting to prime POI audio player with a short silent play.");
      const originalSrc = poiAudioRef.current.src;
      const originalVolume = poiAudioRef.current.volume;
      poiAudioRef.current.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
      poiAudioRef.current.volume = 0;
      poiAudioRef.current.play()
        .then(() => {
          console.log("POI audio player primed successfully.");
          poiAudioRef.current?.pause();
          if(poiAudioRef.current) {
            poiAudioRef.current.src = originalSrc;
            poiAudioRef.current.volume = originalVolume;
          }
        })
        .catch(err => {
          console.warn("Could not prime POI audio player:", err);
          if(poiAudioRef.current) {
             poiAudioRef.current.src = originalSrc;
             poiAudioRef.current.volume = originalVolume;
          }
        });
    }
  };

  const handleDisagreeToSafetyDisclaimer = () => {
    setShowSafetyDisclaimerModal(false);
  };

  const modalButtonBaseClasses = "px-10 py-3.5 text-lg font-bold uppercase tracking-wider rounded-full shadow-lg transition-all duration-150 ease-in-out transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-green-300/60";
  const modalButtonConfirmClasses = `${modalButtonBaseClasses} text-white bg-brandGreen hover:bg-brandGreenDarker active:bg-brandGreenDarkest`;
  const modalButtonCancelClasses = `${modalButtonBaseClasses} text-white bg-brandGreen hover:bg-brandGreenDarker active:bg-brandGreenDarkest`;


  if (showLocationPermissionInfoModal) {
    return (
      <div className="w-full h-full">
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
              <h2 id="locationPermissionInfoModalTitle" className="text-2xl font-bold text-black uppercase">
                Permissão de Localização
              </h2>
            </div>
            <p id="locationPermissionInfoModalDescription" className="text-base text-gray-700 mb-4">
              Permita acesso à localização do aparelho.
            </p>
            {permissionStatus === 'denied' && (
              <p className="text-base font-semibold text-red-500 uppercase mb-4">
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
      <div className="w-full h-full">
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
                <h2 id="safetyDisclaimerModalTitle" className="text-2xl font-bold text-black uppercase">ATENÇÃO IMPORTANTE!</h2>
              </div>
              <p id="safetyDisclaimerModalDescription" className="text-base text-black mb-6">
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

  const currentlyPlayingPoiDetails = pois.find(p => p.id === currentlyPlayingId);
  const approachingPoiForRingDetails = pois.find(p => p.id === activePoiForProximityRingId);

  return (
    <div className="min-h-screen flex flex-col">
      <div
        className="bg-brandGreen w-full flex-grow-0 flex-shrink-0 basis-auto flex flex-col items-center text-white pt-6 pb-10 sm:pb-16 md:pb-20 relative"
        style={{
          borderBottomLeftRadius: 'clamp(40px, 15vw, 100px)',
          borderBottomRightRadius: 'clamp(40px, 15vw, 100px)'
        }}
      >
        {currentlyPlayingPoiDetails && (
          <div className="absolute top-4 left-4 bg-white text-brandGreen p-4 rounded-lg shadow-lg max-w-[calc(100%-2rem-32px)]">
            <div className="flex items-center">
              <SpeakerWaveIcon className="h-7 w-7 mr-2 text-brandGreen flex-shrink-0" />
              <div>
                <p className="text-lg font-semibold truncate">{currentlyPlayingPoiDetails.name}</p>
                <p className="text-base uppercase">STATUS: REPRODUZINDO</p>
              </div>
            </div>
          </div>
        )}

        <p className="text-2xl sm:text-3xl font-bold uppercase mt-20 sm:mt-24 mb-3 sm:mb-4">
          APROXIMANDO DE...
        </p>

        <div className="relative w-36 h-36 sm:w-40 sm:h-40 md:w-48 md:h-48 flex items-center justify-center mb-2 sm:mb-3">
          <div className="absolute inset-0 bg-lightTeal bg-opacity-70 rounded-full"></div>
          <div
            className="bg-white rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${proximityRingScale * 100}%`,
              height: `${proximityRingScale * 100}%`,
              minWidth: '20%',
              minHeight: '20%',
            }}
          ></div>
        </div>

        <p className="text-lg sm:text-xl font-semibold uppercase text-center px-4 h-14 sm:h-16 flex items-center justify-center">
          {approachingPoiForRingDetails ? approachingPoiForRingDetails.name : "NENHUM PONTO PRÓXIMO"}
        </p>
      </div>

      <div className="bg-white flex-grow w-full p-6 sm:p-8 overflow-y-auto">
        <div className="space-y-4 sm:space-y-5 max-w-2xl mx-auto">
          {pois.map(poi => {
            let statusText = "AGUARDANDO";
            if (poi.id === currentlyPlayingId) statusText = "REPRODUZINDO";
            else if (poi.status === 'approaching') statusText = "APROXIMANDO";
            else if (poi.status === 'played') statusText = "CONCLUÍDO";
            else if (poi.status === 'error') statusText = "ERRO";

            return (
              <div key={poi.id} className="flex items-center p-4 bg-gray-50 rounded-lg shadow">
                <div className="bg-brandGreen p-3 sm:p-4 rounded-lg mr-3 sm:mr-4 flex-shrink-0">
                  <MapPinIcon className="h-7 w-7 sm:h-8 sm:h-8 text-white" />
                </div>
                <div className="flex-grow overflow-hidden">
                  <p className="text-base sm:text-lg font-semibold text-brandGreen uppercase truncate">{poi.name}</p>
                  <p className="text-sm sm:text-base text-gray-600 uppercase">STATUS: {statusText}</p>
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
