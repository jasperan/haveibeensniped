
export type Region = 'NA1' | 'EUW1' | 'EUNE1' | 'KR' | 'BR1' | 'LA1' | 'LA2' | 'OC1' | 'JP1' | 'TR1' | 'RU' | 'PH2' | 'SG2' | 'TH2' | 'TW2' | 'VN2';

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
