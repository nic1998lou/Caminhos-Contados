
import { POI, Coordinates } from './types';

// O nome da sua nuvem Cloudinary ('dpfvffi9k') foi extraído da URL fornecida.
// Certifique-se de que os caminhos para os outros arquivos de áudio
// correspondem à sua estrutura de pastas e nomes de arquivos no Cloudinary sob esta nuvem.
const CLOUDINARY_BASE_URL = 'https://res.cloudinary.com/dpfvffi9k'; 

export const BACKGROUND_MUSIC_URL = 'https://res.cloudinary.com/dpfvffi9k/video/upload/v1748487666/Relaxing_Music_e11smi.mp3';
export const BACKGROUND_MUSIC_VOLUME = 0.3; // Volume de 0.0 a 1.0

export const INITIAL_POIS: POI[] = [
  {
    id: 'poi_rua_tremembe',
    name: 'A Rua Tremembé',
    description: 'Ponto de interesse localizado na Rua Tremembé.',
    coordinates: { latitude: -22.97169125014227, longitude: -45.5445299255431 },
    audioSrc: `${CLOUDINARY_BASE_URL}/video/upload/v1748486915/A_Rua_Trememb%C3%A9_hapmv8.wav`, 
    triggerRadiusMeters: 70, // 70 metros
    status: 'idle',
  },
  {
    id: 'poi_rotatoria_horto',
    name: 'A Rotatória do Hôrto Municipal',
    description: 'Ponto de interesse localizado na Rotatória do Hôrto Municipal.',
    coordinates: { latitude: -22.96938896827124, longitude: -45.548962328443636 },
    audioSrc: `https://res.cloudinary.com/dpfvffi9k/video/upload/v1748486914/A_Rotat%C3%B3ria_do_H%C3%B4rto_Municipal_p02ph1.wav`, 
    triggerRadiusMeters: 70, // 70 metros
    status: 'idle',
  },
  {
    id: 'poi_antiga_estacao_tremembe',
    name: 'A Antiga Estação Ferroviária de Tremembé',
    description: 'Ponto de interesse na antiga estação ferroviária de Tremembé.',
    coordinates: { latitude: -22.964115622280687, longitude: -45.548857741029316 },
    audioSrc: `https://res.cloudinary.com/dpfvffi9k/video/upload/v1748486914/A_Antiga_Esta%C3%A7%C3%A3o_Ferrovi%C3%A1ria_de_Trememb%C3%A9_u3jj2u.wav`,
    triggerRadiusMeters: 70, // 70 metros
    status: 'idle',
  },
  {
    id: 'poi_prefeitura_tremembe',
    name: 'A Prefeitura de Tremembé',
    description: 'Ponto de interesse na Prefeitura de Tremembé.',
    coordinates: { latitude: -22.961766293765745, longitude: -45.54525080657641 },
    audioSrc: `https://res.cloudinary.com/dpfvffi9k/video/upload/v1748486914/A_Prefeitura_de_Trememb%C3%A9_l5dp7q.wav`,
    triggerRadiusMeters: 70, // 70 metros
    status: 'idle',
  },
];

// How much further than triggerRadiusMeters to consider 'approaching'
// e.g., if trigger is 50m, approach starts at 50 * 2.5 = 125m
export const APPROACH_THRESHOLD_MULTIPLIER = 2.5; 

// Default coordinates if geolocation fails or is not available (e.g. center of a city)
export const DEFAULT_COORDINATES: Coordinates = { latitude: -23.550520, longitude: -46.633308 };
