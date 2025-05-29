
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

  const currentlyPlayingIdRef = useRef(currentlyPlayingId);
  useEffect(() => {
    currentlyPlayingIdRef.current = currentlyPlayingId;
  }, [currentlyPlayingId]);

  useEffect(() => {
    poiAudioRef.current = new Audio();
    const audio = poiAudioRef.current;

    const handleAudioEnded = () => {
      const endedPoiId = currentlyPlayingIdRef.current;
      if (endedPoiId) {
        setPois(prevPois =>
          prevPois.map(p =>
            p.id === endedPoiId ? { ...p, status: 'played' } : p
          )
        );
        setCurrentlyPlayingId(null);
      }
    };

    const handleAudioError = (e: Event) => {
      const errorPoiId = currentlyPlayingIdRef.current;
      console.error(`Error playing audio for POI: ${errorPoiId}`, (e.target as HTMLAudioElement)?.error);
      if (errorPoiId) {
        setPois(prevPois =>
          prevPois.map(p =>
            p.id === errorPoiId ? { ...p, status: 'error' } : p
          )
        );
        setCurrentlyPlayingId(null);
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

  useEffect(() => {
    if (showWelcomeScreen || !isTracking || !currentGeoLocation || !poiAudioRef.current) {
      if (!isTracking && !showWelcomeScreen && poiAudioRef.current && currentlyPlayingId) {
        poiAudioRef.current.pause();
        setPois(prevPois => prevPois.map(p =>
            (p.id === currentlyPlayingId && p.status === 'playing') ? { ...p, status: 'idle' } : p
        ));
        setCurrentlyPlayingId(null);
      }
      if (!isTracking && !showWelcomeScreen) {
         setPois(prevPois => prevPois.map(p =>
            (p.status !== 'played' && p.status !== 'error' && p.status !== 'idle') ? { ...p, status: 'idle' } : p
         ));
      }
      return;
    }

    let bestCandidateToPlay: POI | null = null;
    let minDistanceToCandidate = Infinity;

    // 1. Identify the best new candidate POI within trigger radius (if any)
    //    A POI is a candidate if it's not already played or errored.
    pois.forEach(poi => {
      if (poi.status === 'played' || poi.status === 'error') {
        return; 
      }
      const distance = calculateDistance(currentGeoLocation.coords, poi.coordinates);
      if (distance <= poi.triggerRadiusMeters) {
        // This POI is in range and not finished/errored.
        // If multiple POIs are in range, the closest one is the best candidate.
        if (distance < minDistanceToCandidate) {
          minDistanceToCandidate = distance;
          bestCandidateToPlay = poi;
        }
      }
    });

    let nextAudioTargetId: string | null = null;

    if (bestCandidateToPlay) {
      // A POI is in range and should be the target.
      nextAudioTargetId = bestCandidateToPlay.id;
    } else {
      // No new POI is in trigger range.
      // If a POI was already playing (currentlyPlayingId is set), it should continue.
      nextAudioTargetId = currentlyPlayingId;
    }

    // 2. Manage audio element and currentlyPlayingId state
    if (nextAudioTargetId && nextAudioTargetId !== currentlyPlayingId) {
      // A new POI should start playing, or a different candidate takes precedence.
      // Interrupt the previous audio if one was playing.
      if (currentlyPlayingId && poiAudioRef.current) {
        poiAudioRef.current.pause();
      }
      const poiDetailsToPlay = pois.find(p => p.id === nextAudioTargetId);
      if (poiDetailsToPlay && poiAudioRef.current) {
        // Only change src and play if it's different or paused
        if (poiAudioRef.current.src !== poiDetailsToPlay.audioSrc || poiAudioRef.current.paused) {
            poiAudioRef.current.src = poiDetailsToPlay.audioSrc;
            poiAudioRef.current.play().catch(e => {
              console.error(`Error playing audio for ${poiDetailsToPlay.id}:`, e);
              setPois(prevPois => prevPois.map(p => (p.id === poiDetailsToPlay.id ? { ...p, status: 'error' } : p)));
              if (currentlyPlayingIdRef.current === poiDetailsToPlay.id) {
                setCurrentlyPlayingId(null);
              }
            });
        }
        setCurrentlyPlayingId(nextAudioTargetId);
      }
    } else if (!nextAudioTargetId && currentlyPlayingId) {
      // No POI is targeted to play (e.g., bestCandidate was null, and currentlyPlayingId might have become null via event handler).
      // If currentlyPlayingId (state) is still set, it means it needs to be cleared.
      setCurrentlyPlayingId(null);
      // The audio for the previous currentlyPlayingId would have been stopped by its 'ended'/'error' event,
      // or if tracking stopped. No explicit pause here unless it's a cleanup.
    }
    // If nextAudioTargetId is the same as currentlyPlayingId, and it's not null,
    // the audio continues playing (or remains paused if it was paused by browser, etc.).

    // 3. Update POI statuses for UI display based on the definitive currentlyPlayingId
    const updatedPois = pois.map(poi => {
      let newStatus = poi.status;
      if (poi.status === 'played' || poi.status === 'error') {
        // Keep terminal states
      } else if (poi.id === currentlyPlayingId) { // Use the current state value of `currentlyPlayingId`
        newStatus = 'playing'; // This POI is the one that should be active
      } else {
        // For POIs not currently playing, set status based on distance
        const distance = calculateDistance(currentGeoLocation.coords, poi.coordinates);
        if (distance <= poi.triggerRadiusMeters * APPROACH_THRESHOLD_MULTIPLIER) {
          newStatus = 'approaching';
        } else {
          newStatus = 'idle';
        }
      }
      return poi.status !== newStatus ? { ...poi, status: newStatus } : poi;
    });

    if (JSON.stringify(updatedPois) !== JSON.stringify(pois)) {
      setPois(updatedPois);
    }

    // Final sync of currentlyPlayingId state if logic determined a change.
    // This covers cases where an audio event might have set it to null,
    // and then logic here re-targets an audio or confirms null.
    if (currentlyPlayingId !== nextAudioTargetId) {
        setCurrentlyPlayingId(nextAudioTargetId);
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
