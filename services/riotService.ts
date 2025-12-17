
import { Region, CurrentGame, SnipedPlayer, Player } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Riot API Service
 * Communicates with the backend to fetch game data from Riot API
 */
export class RiotService {
  
  static async checkInGame(gameName: string, tagLine: string, region: Region): Promise<CurrentGame | null> {
    try {
      const response = await fetch(`${API_URL}/api/check-game`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameName,
          tagLine,
          region
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // If player is not in game, return null (not an error)
        if (errorData.inGame === false) {
          return null;
        }
        
        // Other errors
        throw new Error(errorData.error || 'Failed to check game status');
      }

      const data = await response.json();
      
      // If backend explicitly says not in game
      if (data.inGame === false) {
        return null;
      }

      return data;
      
    } catch (error) {
      console.error('Error checking in-game status:', error);
      throw error;
    }
  }

  static async analyzeSnipes(userPuuid: string, lobby: Player[], region: Region): Promise<SnipedPlayer[]> {
    try {
      const response = await fetch(`${API_URL}/api/analyze-snipes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPuuid,
          participants: lobby,
          region
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze match history');
      }

      const snipes: SnipedPlayer[] = await response.json();
      return snipes;
      
    } catch (error) {
      console.error('Error analyzing snipes:', error);
      throw error;
    }
  }
}
