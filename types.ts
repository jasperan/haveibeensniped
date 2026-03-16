export type Region = 'NA1' | 'EUW1' | 'EUNE1' | 'KR' | 'BR1' | 'LA1' | 'LA2' | 'OC1' | 'JP1' | 'TR1' | 'RU' | 'PH2' | 'SG2' | 'TH2' | 'TW2' | 'VN2';

export type ParticipantRelation = 'self' | 'ally' | 'enemy' | null;
export type RiskTier = 'background' | 'repeat' | 'watch' | 'high-attention';
export type ScanStatus = 'ok' | 'not_in_game';

export interface Player {
  summonerName: string;
  tagLine: string;
  puuid: string;
  championId: number;
  teamId: number; // 100 for Blue, 200 for Red
}

export interface MatchHistoryEntry {
  matchId: string;
  timestamp: number;
  win: boolean;
  team: 'with' | 'against';
  playerChampId: number;
  targetChampId: number;
}

export interface RepeatPlayerMatch extends MatchHistoryEntry {
  queueId?: number;
}

export interface SnipedPlayer {
  summonerName: string;
  tagLine: string;
  puuid: string;
  championId: number;
  matches: MatchHistoryEntry[];
  totalGames: number;
  wins: number;
  losses: number;
}

export interface CurrentGame {
  gameId: number;
  participants: Player[];
  gameMode: string;
  gameStartTime: number;
}

export interface TrackedProfile {
  id: number;
  puuid: string;
  gameName: string;
  tagLine: string;
  region: Region;
}

export interface ScanSummary {
  id: number;
  trackedProfileId: number;
  source: string;
  region: Region;
  gameId: number | null;
  queueType: string | null;
  status: ScanStatus;
  durationSeconds: number;
  encounterCount: number;
}

export interface ScanParticipant {
  puuid: string;
  riotId: string;
  gameName: string;
  tagLine: string;
  championId: number;
  teamId: number;
  relation: ParticipantRelation;
  region: Region;
}

export interface RepeatPlayerRiskSummary {
  score: number;
  tier: RiskTier;
  reasons: string[];
}

export interface RepeatPlayer {
  puuid: string;
  riotId: string;
  gameName: string;
  tagLine: string;
  region: Region;
  championId: number;
  teamId: number;
  relation: Exclude<ParticipantRelation, 'self'>;
  matches: RepeatPlayerMatch[];
  totalGames: number;
  wins: number;
  losses: number;
  risk: RepeatPlayerRiskSummary;
}

export interface ScanCurrentGame {
  gameId: number;
  participants: ScanParticipant[];
  gameMode: string;
  gameStartTime: number;
}

export interface ScanResponse {
  trackedProfile: TrackedProfile;
  scan: ScanSummary;
  currentGame: ScanCurrentGame | null;
  repeatPlayers: RepeatPlayer[];
}
