
import { Region, CurrentGame, SnipedPlayer, Player } from '../types';

/**
 * Note: Real Riot API calls require a backend proxy to avoid CORS and protect API Keys.
 * This service simulates the behavior described in the prompt.
 */
export class RiotService {
  private static sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async checkInGame(gameName: string, tagLine: string, region: Region): Promise<CurrentGame | null> {
    await this.sleep(1500); // Simulate network latency
    
    // Simulate finding a game for specific test names
    if (gameName.toLowerCase().includes('offline')) return null;

    // Mock Lobby Data
    return {
      gameId: 12345678,
      gameMode: 'CLASSIC',
      gameStartTime: Date.now() - 600000,
      participants: [
        { summonerName: gameName, tagLine: tagLine, puuid: 'user-puuid', championId: 81, teamId: 100 },
        { summonerName: 'Hide on bush', tagLine: 'KR1', puuid: 'p1', championId: 1, teamId: 100 },
        { summonerName: 'Caps', tagLine: 'EUW', puuid: 'p2', championId: 157, teamId: 100 },
        { summonerName: 'Rekkles', tagLine: 'T1', puuid: 'p3', championId: 202, teamId: 200 },
        { summonerName: 'Tyler1', tagLine: 'NA1', puuid: 'p4', championId: 2, teamId: 200 },
        { summonerName: 'Dopa', tagLine: 'CN1', puuid: 'p5', championId: 4, teamId: 100 },
        { summonerName: 'ShowMaker', tagLine: 'DK', puuid: 'p6', championId: 3, teamId: 200 },
        { summonerName: 'Guma', tagLine: 'T1', puuid: 'p7', championId: 222, teamId: 200 },
        { summonerName: 'Keria', tagLine: 'T1', puuid: 'p8', championId: 412, teamId: 200 },
        { summonerName: 'Oner', tagLine: 'T1', puuid: 'p9', championId: 64, teamId: 100 },
      ]
    };
  }

  static async analyzeSnipes(userPuuid: string, lobby: Player[]): Promise<SnipedPlayer[]> {
    await this.sleep(2000); // Simulate processing 100 matches

    // Filter out the user themselves
    const otherPlayers = lobby.filter(p => p.puuid !== userPuuid);

    // Simulate finding snipes for a few players in the lobby
    const snipes: SnipedPlayer[] = [];
    
    // Mocking finding "Rekkles" twice in history
    const rekkles = otherPlayers.find(p => p.summonerName === 'Rekkles');
    if (rekkles) {
      snipes.push({
        ...rekkles,
        totalGames: 3,
        wins: 2,
        losses: 1,
        matches: [
          { matchId: 'm1', timestamp: Date.now() - 86400000, win: true, team: 'with', playerChampId: 81, targetChampId: 202 },
          { matchId: 'm2', timestamp: Date.now() - 172800000, win: false, team: 'against', playerChampId: 236, targetChampId: 202 },
          { matchId: 'm3', timestamp: Date.now() - 259200000, win: true, team: 'with', playerChampId: 157, targetChampId: 222 },
        ]
      });
    }

    // Mocking finding "Tyler1" once in history
    const tyler = otherPlayers.find(p => p.summonerName === 'Tyler1');
    if (tyler) {
      snipes.push({
        ...tyler,
        totalGames: 1,
        wins: 0,
        losses: 1,
        matches: [
          { matchId: 'm4', timestamp: Date.now() - 432000000, win: false, team: 'against', playerChampId: 81, targetChampId: 2 },
        ]
      });
    }

    return snipes;
  }
}
