import {
  AppStatus,
  CurrentGame,
  LiveClientStatus,
  MemoryOverview,
  MemorySummary,
  Region,
  RepeatPlayer,
  ScanCurrentGame,
  ScanResponse,
  SnipedPlayer,
} from '../types';

const API_URL = (
  import.meta as ImportMeta & {
    env?: {
      VITE_API_URL?: string;
    };
  }
).env?.VITE_API_URL || 'http://localhost:5000';

const getErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const errorData = await response.json() as { error?: string };
    return errorData.error || fallback;
  } catch {
    return fallback;
  }
};

const getJson = async <T>(response: Response, fallback: string): Promise<T> => {
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, fallback));
  }
  return await response.json() as T;
};

export const mapScanCurrentGameToCurrentGame = (game: ScanCurrentGame): CurrentGame => ({
  gameId: game.gameId,
  gameMode: game.gameMode,
  gameStartTime: game.gameStartTime,
  participants: game.participants.map((participant) => ({
    summonerName: participant.gameName,
    tagLine: participant.tagLine,
    puuid: participant.puuid,
    championId: participant.championId,
    teamId: participant.teamId,
  })),
});

export const mapRepeatPlayersToSnipedPlayers = (
  repeatPlayers: RepeatPlayer[],
): SnipedPlayer[] => repeatPlayers.map((player) => ({
  summonerName: player.gameName,
  tagLine: player.tagLine,
  puuid: player.puuid,
  championId: player.championId,
  matches: player.matches.map((match) => ({
    matchId: match.matchId,
    timestamp: match.timestamp,
    win: match.win,
    team: match.team,
    playerChampId: match.playerChampId,
    targetChampId: match.targetChampId,
  })),
  totalGames: player.totalGames,
  wins: player.wins,
  losses: player.losses,
}));

/**
 * Riot API Service
 * Communicates with the backend scan endpoint.
 */
export class RiotService {
  static async scan(gameName: string, tagLine: string, region: Region): Promise<ScanResponse> {
    const response = await fetch(`${API_URL}/api/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gameName,
        tagLine,
        region,
      }),
    });

    return getJson<ScanResponse>(response, 'Failed to scan current lobby');
  }

  static async runDemoScan(): Promise<ScanResponse> {
    const response = await fetch(`${API_URL}/api/demo/scan`, {
      method: 'POST',
    });

    return getJson<ScanResponse>(response, 'Failed to run demo scan');
  }

  static async getLiveClientStatus(): Promise<LiveClientStatus> {
    const response = await fetch(`${API_URL}/api/live-client/status`);
    return getJson<LiveClientStatus>(response, 'Failed to read Live Client status');
  }

  static async getAppStatus(): Promise<AppStatus> {
    const response = await fetch(`${API_URL}/api/status`);
    return getJson<AppStatus>(response, 'Failed to read backend status');
  }

  static async getMemorySummary(): Promise<MemorySummary> {
    const response = await fetch(`${API_URL}/api/memory/summary`);
    return getJson<MemorySummary>(response, 'Failed to load memory center');
  }

  static async getMemoryOverview(trackedProfileId: number): Promise<MemoryOverview> {
    const response = await fetch(`${API_URL}/api/tracked-profiles/${trackedProfileId}/memory`);
    return getJson<MemoryOverview>(response, 'Failed to load local encounter memory');
  }

  static async saveWatchNote(trackedProfileId: number, playerPuuid: string, note: string): Promise<{ note: string | null }> {
    const response = await fetch(`${API_URL}/api/tracked-profiles/${trackedProfileId}/players/${playerPuuid}/note`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ note }),
    });

    return getJson<{ note: string | null }>(response, 'Failed to save watch note');
  }
}
