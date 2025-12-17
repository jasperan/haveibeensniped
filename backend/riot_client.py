"""
Riot API Client
Handles all interactions with Riot Games API
"""

import requests
import time
from typing import Dict, List, Optional, Any
from utils import get_regional_endpoint, get_platform_endpoint


class RiotAPIClient:
    """Client for interacting with Riot Games API"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            'X-Riot-Token': api_key,
            'Accept': 'application/json'
        })
        self.cache = {}  # Simple in-memory cache for PUUIDs
        
    def _make_request(self, url: str, params: Optional[Dict] = None) -> Optional[Dict]:
        """
        Make a request to Riot API with error handling
        
        Args:
            url: Full API endpoint URL
            params: Query parameters
            
        Returns:
            JSON response or None if error
        """
        try:
            response = self.session.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                return None
            elif response.status_code == 429:
                # Rate limited
                retry_after = int(response.headers.get('Retry-After', 1))
                time.sleep(retry_after)
                return self._make_request(url, params)
            else:
                print(f"API Error {response.status_code}: {response.text}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None
    
    def get_puuid_by_riot_id(self, game_name: str, tag_line: str, region: str) -> Optional[str]:
        """
        Get PUUID from Riot ID (name#tag)
        
        Uses: GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}
        Where gameName is the part to the left of "#" and tagLine is the part to the right.
        
        Args:
            game_name: Summoner name (left of #)
            tag_line: Riot tag (right of #)
            region: Platform region (e.g., 'NA1') - used for regional routing
            
        Returns:
            PUUID string or None
        """
        # Check cache first
        cache_key = f"{game_name}#{tag_line}#{region}"
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # Account API uses regional routing (americas, europe, asia, sea)
        regional = get_regional_endpoint(region)
        url = f"https://{regional}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}"
        
        data = self._make_request(url)
        if data and 'puuid' in data:
            puuid = data['puuid']
            self.cache[cache_key] = puuid
            return puuid
        
        return None
    
    def get_active_game(self, puuid: str, region: str) -> Optional[Dict]:
        """
        Check if a player is currently in a live game
        
        Uses: GET /lol/spectator/v5/active-games/by-summoner/{encryptedPUUID}
        Where encryptedPUUID is the PUUID obtained from the account API.
        
        Args:
            puuid: Player's PUUID (from get_puuid_by_riot_id)
            region: Platform region (e.g., 'NA1', 'EUW1') - used for platform routing
            
        Returns:
            Game data or None if not in game
        """
        # Spectator API uses platform routing (na1, euw1, kr, etc.)
        platform = get_platform_endpoint(region)
        url = f"https://{platform}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/{puuid}"
        
        return self._make_request(url)
    
    def get_match_ids(self, puuid: str, region: str, count: int = 100) -> List[str]:
        """
        Get list of match IDs for a player
        
        Args:
            puuid: Player's PUUID
            region: Platform region
            count: Number of matches to fetch (max 100)
            
        Returns:
            List of match IDs
        """
        regional = get_regional_endpoint(region)
        url = f"https://{regional}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids"
        params = {'start': 0, 'count': min(count, 100)}
        
        data = self._make_request(url, params)
        return data if data else []
    
    def get_match_details(self, match_id: str, region: str) -> Optional[Dict]:
        """
        Get detailed information about a specific match
        
        Args:
            match_id: Match ID
            region: Platform region
            
        Returns:
            Match details or None
        """
        regional = get_regional_endpoint(region)
        url = f"https://{regional}.api.riotgames.com/lol/match/v5/matches/{match_id}"
        
        return self._make_request(url)
    
    def analyze_match_history(self, user_puuid: str, lobby_puuids: List[str], 
                            region: str, match_count: int = 100) -> Dict[str, Any]:
        """
        Analyze match history to find overlaps with lobby participants
        
        Args:
            user_puuid: The searching player's PUUID
            lobby_puuids: List of PUUIDs from current lobby
            region: Platform region
            match_count: Number of matches to analyze
            
        Returns:
            Dictionary mapping PUUIDs to their match history with the user
        """
        # Get user's match history
        match_ids = self.get_match_ids(user_puuid, region, match_count)
        
        # Initialize results
        results = {puuid: {'matches': [], 'totalGames': 0, 'wins': 0, 'losses': 0} 
                   for puuid in lobby_puuids if puuid != user_puuid}
        
        # Analyze each match
        for match_id in match_ids:
            match_data = self.get_match_details(match_id, region)
            
            if not match_data or 'info' not in match_data:
                continue
            
            participants = match_data['info'].get('participants', [])
            
            # Find the user in this match
            user_participant = next((p for p in participants if p['puuid'] == user_puuid), None)
            if not user_participant:
                continue
            
            user_team = user_participant['teamId']
            user_won = user_participant['win']
            
            # Check for lobby participants in this match
            for participant in participants:
                puuid = participant['puuid']
                
                if puuid in results:
                    same_team = participant['teamId'] == user_team
                    
                    match_entry = {
                        'matchId': match_id,
                        'timestamp': match_data['info']['gameCreation'],
                        'win': user_won,
                        'team': 'with' if same_team else 'against',
                        'playerChampId': user_participant['championId'],
                        'targetChampId': participant['championId']
                    }
                    
                    results[puuid]['matches'].append(match_entry)
                    results[puuid]['totalGames'] += 1
                    
                    if user_won:
                        results[puuid]['wins'] += 1
                    else:
                        results[puuid]['losses'] += 1
        
        # Filter out players with no shared matches
        return {k: v for k, v in results.items() if v['totalGames'] > 0}

