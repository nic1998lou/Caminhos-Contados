
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { POI, GeolocationData } from './types';
import { 
  INITIAL_POIS, 
  APPROACH_THRESHOLD_MULTIPLIER, 
  BACKGROUND_MUSIC_URL, 
  BACKGROUND_MUSIC_VOLUME 
} from './constants';
import { useGeolocation } from './hooks/useGeolocation';
import { calculateDistance } from './utils/distance';
import LocationStatus from './components/LocationStatus';
import PoiCard from './components/PoiCard';
import { 
  LocationMarkerIcon, 
  ExclamationTriangleIcon, 
  SpeakerWaveIcon, 
  SpeakerXMarkIcon 
} from './components/Icons';

const App: React.FC = () => {
  const { 
    location: currentGeoLocation, 
    error: geoError, 
    isTracking, 
    startTracking, 
    stopTracking,
    permissionStatus 
  } = useGeolocation();
  
  const [pois, setPois] = useState<POI[]>(INITIAL_POIS);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const poiAudioRef = useRef<HTMLAudioElement | null>(null);
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
  const [showSafetyDisclaimerModal, setShowSafetyDisclaimerModal] = useState(false);
  const [isBackgroundMusicMuted, setIsBackgroundMusicMuted] = useState(false);

  // Ref to hold the latest currentlyPlayingId for use in event handlers with stale closures
  const currentlyPlayingIdRef = useRef(currentlyPlayingId);
  useEffect(() => {
    currentlyPlayingIdRef.current = currentlyPlayingId;
  }, [currentlyPlayingId]);

  // Setup para o áudio dos POIs: Criar instância e adicionar listeners uma vez
  useEffect(() => {
    poiAudioRef.current = new Audio();
    const audio = poiAudioRef.current;

    const handleAudioEnded = () => {
      const endedPoiId = currentlyPlayingIdRef.current; // Use ref for current ID
      if (endedPoiId) {
        setPois(prevPois =>
          prevPois.map(p =>
            p.id === endedPoiId ? { ...p, status: 'played' } : p
          )
        );
        setCurrentlyPlayingId(null); // Reset, as audio ended
      }
    };

    const handleAudioError = (e: Event) => {
      const errorPoiId = currentlyPlayingIdRef.current; // Use ref for current ID
      console.error(`Error playing audio for POI: ${errorPoiId}`, (e.target as HTMLAudioElement)?.error);
      if (errorPoiId) {
        setPois(prevPois =>
          prevPois.map(p =>
            p.id === errorPoiId ? { ...p, status: 'error' } : p
          )
        );
        setCurrentlyPlayingId(null); // Reset, due to error
      }
    };

    audio.addEventListener('ended', handleAudioEnded);
    audio.addEventListener('error', handleAudioError);

    return () => {
      audio?.pause();
      audio?.removeEventListener('ended', handleAudioEnded);
      audio?.removeEventListener('error', handleAudioError);
      if (audio) {
        audio.src = ''; 
      }
    };
  }, []); 

  // Setup para a música de fundo
  useEffect(() => {
    backgroundAudioRef.current = new Audio(BACKGROUND_MUSIC_URL);
    backgroundAudioRef.current.loop = true;
    backgroundAudioRef.current.volume = BACKGROUND_MUSIC_VOLUME;
    
    setIsBackgroundMusicMuted(backgroundAudioRef.current.muted);

    return () => {
      backgroundAudioRef.current?.pause();
      if (backgroundAudioRef.current) {
        backgroundAudioRef.current.src = '';
      }
      backgroundAudioRef.current = null;
    };
  }, []);

  // Main effect for POI logic
  useEffect(() => {
    if (showWelcomeScreen || !isTracking || !currentGeoLocation || !poiAudioRef.current) {
      if (!isTracking && !showWelcomeScreen && poiAudioRef.current && currentlyPlayingId) {
        // If tracking stops while something is playing
        poiAudioRef.current.pause();
        setPois(prevPois => prevPois.map(p => 
            (p.id === currentlyPlayingId && p.status === 'playing') ? { ...p, status: 'idle' } : p
        ));
        setCurrentlyPlayingId(null);
      }
      if (!isTracking && !showWelcomeScreen) {
         // Reset non-played/errored POIs to idle when tracking stops
         setPois(prevPois => prevPois.map(p => 
            (p.status !== 'played' && p.status !== 'error' && p.status !== 'idle') ? { ...p, status: 'idle' } : p
         ));
      }
      return;
    }

    let nextCurrentlyPlayingId = currentlyPlayingId;
    let poiToPlayCandidate: POI | null = null;
    let minDistanceToPlayablePoi = Infinity;

    const nextPoisState = pois.map(poi => {
      if (poi.status === 'played' || poi.status === 'error') {
        return poi;
      }

      const distance = calculateDistance(currentGeoLocation.coords, poi.coordinates);
      let newStatus = poi.status;

      if (distance <= poi.triggerRadiusMeters) {
        // This POI is in range to be played or is playing.
        // We'll decide which one to play *after* checking all POIs.
        if (poi.id !== currentlyPlayingId) { // Not already playing this one
          if (distance < minDistanceToPlayablePoi) {
            minDistanceToPlayablePoi = distance;
            poiToPlayCandidate = poi;
          }
        }
        // Tentatively set status based on whether it *is* the one currently playing
        newStatus = (poi.id === currentlyPlayingId && currentlyPlayingId !== null) ? 'playing' : 'approaching';
      } else if (distance <= poi.triggerRadiusMeters * APPROACH_THRESHOLD_MULTIPLIER) {
        newStatus = 'approaching';
      } else {
        newStatus = 'idle';
      }
      
      if (newStatus !== poi.status) {
        return { ...poi, status: newStatus };
      }
      return poi;
    });

    // Determine if the currently playing POI should stop
    if (currentlyPlayingId) {
      const currentPlayingPoiDetails = nextPoisState.find(p => p.id === currentlyPlayingId);
      if (currentPlayingPoiDetails) {
        const distance = calculateDistance(currentGeoLocation.coords, currentPlayingPoiDetails.coordinates);
        if (distance > currentPlayingPoiDetails.triggerRadiusMeters) {
          poiAudioRef.current.pause();
          nextCurrentlyPlayingId = null;
          // Update status of the POI that just stopped
          const index = nextPoisState.findIndex(p => p.id === currentlyPlayingId);
          if (index !== -1 && nextPoisState[index].status !== 'error' && nextPoisState[index].status !== 'played') {
            nextPoisState[index] = { ...nextPoisState[index], status: 'idle' };
          }
        }
      } else { // Should not happen if currentlyPlayingId is set
        poiAudioRef.current.pause();
        nextCurrentlyPlayingId = null;
      }
    }

    // Determine if a new POI should start playing
    if (poiToPlayCandidate && poiToPlayCandidate.id !== nextCurrentlyPlayingId) {
      if (nextCurrentlyPlayingId && poiAudioRef.current) { // Stop previous if any
         poiAudioRef.current.pause();
         // Update status of the POI that was interrupted
         const index = nextPoisState.findIndex(p => p.id === nextCurrentlyPlayingId);
         if (index !== -1 && nextPoisState[index].status !== 'error' && nextPoisState[index].status !== 'played') {
           nextPoisState[index] = { ...nextPoisState[index], status: 'idle' };
         }
      }
      
      poiAudioRef.current.src = poiToPlayCandidate.audioSrc;
      const playPromise = poiAudioRef.current.play();
      nextCurrentlyPlayingId = poiToPlayCandidate.id;

      playPromise.then(() => {
        // Successfully started playing
        setPois(prev => prev.map(p => p.id === nextCurrentlyPlayingId ? { ...p, status: 'playing' } : p));
      }).catch(e => {
        console.error(`Error starting audio for ${poiToPlayCandidate!.id}:`, e);
        setPois(prev => prev.map(p => p.id === poiToPlayCandidate!.id ? { ...p, status: 'error' } : p));
        if (currentlyPlayingIdRef.current === poiToPlayCandidate!.id) { // Check ref as state might be stale
            setCurrentlyPlayingId(null);
        }
      });
      // Update status for the POI that is now attempting to play (optimistic update before promise resolves)
      const index = nextPoisState.findIndex(p => p.id === nextCurrentlyPlayingId);
      if (index !== -1) {
         nextPoisState[index] = { ...nextPoisState[index], status: 'playing' };
      }

    } else if (nextCurrentlyPlayingId && !poiToPlayCandidate) {
      // If something is supposed to be playing, ensure its status is 'playing'
      const index = nextPoisState.findIndex(p => p.id === nextCurrentlyPlayingId);
      if (index !== -1 && nextPoisState[index].status !== 'playing' && nextPoisState[index].status !== 'error') {
         nextPoisState[index] = { ...nextPoisState[index], status: 'playing' };
      }
    }

    // Update states if they have changed
    const poisHaveChanged = nextPoisState.some((newPoi, i) => newPoi !== pois[i]);
    if (poisHaveChanged) {
      setPois(nextPoisState);
    }

    if (nextCurrentlyPlayingId !== currentlyPlayingId) {
      setCurrentlyPlayingId(nextCurrentlyPlayingId);
    }

  }, [currentGeoLocation, isTracking, currentlyPlayingId, showWelcomeScreen, pois]);


  const handleStartTrackingOnly = useCallback(() => {
    startTracking();
  }, [startTracking]);

  const handleStopTracking = useCallback(() => {
    stopTracking();
  }, [stopTracking]);

  const handleOpenSafetyDisclaimer = () => {
    setShowSafetyDisclaimerModal(true);
  };

  const handleAgreeToSafetyDisclaimer = () => {
    setShowSafetyDisclaimerModal(false);
    setShowWelcomeScreen(false);
    handleStartTrackingOnly();
    if (backgroundAudioRef.current && backgroundAudioRef.current.paused) {
      backgroundAudioRef.current.play().catch(e => console.error("Error playing background music:", e));
    }
  };

  const handleDisagreeToSafetyDisclaimer = () => {
    setShowSafetyDisclaimerModal(false);
  };

  const toggleBackgroundMusicMute = () => {
    if (backgroundAudioRef.current) {
      const newMutedState = !backgroundAudioRef.current.muted;
      backgroundAudioRef.current.muted = newMutedState;
      setIsBackgroundMusicMuted(newMutedState);
    }
  };

  if (showWelcomeScreen) {
    return (
      <>
        <div 
          className="min-h-screen flex flex-col items-center justify-center p-6 text-white relative overflow-hidden bg-emerald-600"
          style={{
            backgroundImage: 'repeating-linear-gradient(-45deg, rgba(255,255,255,0.07), rgba(255,255,255,0.07) 1.5px, transparent 1.5px, transparent 12px)'
          }}
        >
          <div className="text-center max-w-md z-10 flex flex-col items-center">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">
              Bem-vindo ao Caminhos Contados!
            </h1>
            <p className="text-md sm:text-lg text-emerald-100 mb-6">
              Prepare-se para uma viagem turística como você nunca ouviu.
            </p>
            
            <img 
              src="./assets/logo.png" 
              alt="Logo do Aplicativo" 
              className="w-28 h-28 sm:w-32 sm:h-32 object-contain mb-6" 
            />

            <div className="bg-emerald-700 bg-opacity-60 backdrop-blur-sm p-4 rounded-xl shadow-xl mb-8 max-w-sm">
              <div className="flex items-center justify-center mb-2">
                <LocationMarkerIcon className="h-6 w-6 text-emerald-300 mr-2" />
                <h2 className="text-sm font-semibold text-emerald-50">Permissão de Localização</h2>
              </div>
              <p className="text-emerald-100 text-xs leading-relaxed">
                Para começar sua aventura e guiá-lo pelos pontos de interesse, precisamos saber onde você está.
                Ao clicar em "INICIAR", seu navegador solicitará permissão para acessar sua localização após concordar com os termos de segurança.
              </p>
              {permissionStatus === 'denied' && (
                <p className="text-red-300 mt-2 text-xs font-semibold">
                  A permissão de localização foi negada. Por favor, habilite-a nas configurações do seu navegador.
                </p>
              )}
            </div>

            <button
              onClick={handleOpenSafetyDisclaimer}
              className="text-lg font-bold uppercase tracking-wider text-emerald-700 bg-white rounded-full py-3.5 px-12 shadow-xl
                         hover:bg-gray-100 active:bg-gray-200 transition-all duration-200 ease-in-out 
                         transform hover:scale-105 active:scale-95
                         focus:outline-none focus:ring-4 focus:ring-emerald-300 focus:ring-opacity-60"
              aria-label="Iniciar Viagem e mostrar termos de segurança"
            >
              INICIAR
            </button>
          </div>
          <footer className="absolute bottom-4 left-0 right-0 text-center text-emerald-200 text-xs z-0">
            <p>&copy; {new Date().getFullYear()} Caminhos Contados. Inspirado para exploração.</p>
          </footer>
        </div>

        {showSafetyDisclaimerModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="safetyDisclaimerModalTitle"
            aria-describedby="safetyDisclaimerModalDescription"
          >
            <div className="bg-emerald-50 p-6 rounded-lg shadow-xl max-w-md w-full text-gray-800">
              <div className="flex items-center mb-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mr-2 flex-shrink-0" />
                <h2 id="safetyDisclaimerModalTitle" className="text-xl font-bold text-emerald-700">Atenção Importante!</h2>
              </div>
              <p id="safetyDisclaimerModalDescription" className="text-sm text-emerald-800 mb-6">
                Sou passageiro e/ou como ciclista e pedestre estou atento ao meu redor prezando pela minha segurança e a de terceiros.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleDisagreeToSafetyDisclaimer}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAgreeToSafetyDisclaimer}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  Eu Concordo
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div 
      className="min-h-screen text-white p-4 sm:p-8 bg-emerald-600 relative overflow-hidden"
      style={{
        backgroundImage: 'repeating-linear-gradient(-45deg, rgba(255,255,255,0.07), rgba(255,255,255,0.07) 1.5px, transparent 1.5px, transparent 12px)'
      }}
    >
      <div className="container mx-auto max-w-3xl relative z-10">
        <header className="mb-8 text-center relative">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            Caminhos Contados
          </h1>
          <p className="text-emerald-100 mt-2 text-lg">
            Seu guia de áudio pessoal baseado em localização.
          </p>
          <button
            onClick={toggleBackgroundMusicMute}
            className="absolute top-0 right-0 mt-1 mr-1 sm:mt-0 sm:mr-0 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full text-emerald-100 hover:text-white transition-colors"
            aria-label={isBackgroundMusicMuted ? "Ativar som da música de fundo" : "Desativar som da música de fundo"}
          >
            {isBackgroundMusicMuted ? 
              <SpeakerXMarkIcon className="h-6 w-6" /> : 
              <SpeakerWaveIcon className="h-6 w-6" />}
          </button>
        </header>

        <LocationStatus
          location={currentGeoLocation}
          isTracking={isTracking}
          error={geoError}
          permissionStatus={permissionStatus}
          onStartTracking={handleStartTrackingOnly}
          onStopTracking={handleStopTracking}
        />

        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-6 text-emerald-50">Próximas Histórias a se conhecer</h2>
          {pois.length > 0 ? (
            <div className="space-y-6">
              {pois.map(poi => (
                <PoiCard key={poi.id} poi={poi} currentLocation={isTracking ? currentGeoLocation?.coords ?? null : null} />
              ))}
            </div>
          ) : (
            <div className="bg-white bg-opacity-80 backdrop-blur-sm p-6 rounded-xl shadow-xl text-center">
                <p className="text-emerald-700">Nenhum ponto de interesse carregado.</p>
            </div>
          )}
        </div>
        
        <footer className="mt-12 text-center text-emerald-200 text-sm">
            <p>&copy; {new Date().getFullYear()} Caminhos Contados. Inspirado para exploração.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
    