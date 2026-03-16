import {
  CurrentGame,
  LiveClientStatus,
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
    try {
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

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Failed to scan current lobby'));
      }

      return await response.json() as ScanResponse;
    } catch (error) {
      console.error('Error scanning lobby:', error);
      throw error;
    }
  }

  static async getLiveClientStatus(): Promise<LiveClientStatus> {
    try {
      const response = await fetch(`${API_URL}/api/live-client/status`);

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Failed to read Live Client status'));
      }

      return await response.json() as LiveClientStatus;
    } catch (error) {
      console.error('Error reading Live Client status:', error);
      throw error;
    }
  }
}
