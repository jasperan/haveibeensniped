"""
Flask Backend for Have I Been Sniped
Handles Riot API requests and provides endpoints for the frontend
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import yaml
import os
from riot_client import RiotAPIClient

app = Flask(__name__)

# Load configuration
config_path = os.path.join(os.path.dirname(__file__), 'config.yaml')

try:
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
except FileNotFoundError:
    print("Error: config.yaml not found. Please create it from config.yaml.example")
    exit(1)

# Setup CORS with proper configuration
cors_origins = config.get('cors_origins', ['http://localhost:5173', 'http://localhost:4000'])
# Allow all origins in development if explicitly configured
allow_all_origins = config.get('allow_all_cors_origins', False)

if allow_all_origins:
    # Development mode: allow all origins
    CORS(app, 
         resources={r"/api/*": {"origins": "*"}},
         methods=['GET', 'POST', 'OPTIONS'],
         allow_headers=['Content-Type', 'Authorization'],
         supports_credentials=False)
else:
    # Production mode: specific origins only
    CORS(app, 
         origins=cors_origins,
         methods=['GET', 'POST', 'OPTIONS'],
         allow_headers=['Content-Type', 'Authorization'],
         supports_credentials=True)

# Initialize Riot API client
api_key = config.get('riot_api_key')
if not api_key or api_key == 'RGAPI-YOUR-API-KEY-HERE':
    print("Error: Please set a valid Riot API key in config.yaml")
    exit(1)

riot_client = RiotAPIClient(api_key)


@app.route('/', methods=['GET'])
def root():
    """Root endpoint with API information"""
    return jsonify({
        'service': 'Have I Been Sniped - Backend API',
        'status': 'running',
        'version': '1.0.0',
        'endpoints': {
            'health': {
                'method': 'GET',
                'path': '/health',
                'description': 'Health check endpoint'
            },
            'check_game': {
                'method': 'POST',
                'path': '/api/check-game',
                'description': 'Check if a player is in a live game',
                'body': {
                    'gameName': 'string',
                    'tagLine': 'string',
                    'region': 'string (e.g., NA1, EUW1)'
                }
            },
            'analyze_snipes': {
                'method': 'POST',
                'path': '/api/analyze-snipes',
                'description': 'Analyze match history for player overlaps',
                'body': {
                    'userPuuid': 'string',
                    'participants': 'array',
                    'region': 'string'
                }
            }
        },
        'documentation': 'See backend/README.md for detailed API documentation'
    }), 200


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'Backend is running'})


@app.route('/api/check-game', methods=['POST', 'OPTIONS'])
def check_game():
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return '', 200
    """
    Check if a player is in a live game
    
    Request body:
    {
        "gameName": "PlayerName",
        "tagLine": "TAG",
        "region": "NA1"
    }
    
    Returns:
    {
        "gameId": 123456,
        "gameMode": "CLASSIC",
        "gameStartTime": 1234567890,
        "participants": [...]
    }
    """
    try:
        data = request.json
        game_name = data.get('gameName')
        tag_line = data.get('tagLine')
        region = data.get('region', 'NA1')
        
        if not game_name or not tag_line:
            return jsonify({'error': 'Missing gameName or tagLine'}), 400
        
        # Step 1: Get PUUID using account API
        # Endpoint: GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}
        # gameName = part to left of "#", tagLine = part to right of "#"
        puuid = riot_client.get_puuid_by_riot_id(game_name, tag_line, region)
        if not puuid:
            return jsonify({'error': 'Player not found'}), 404
        
        # Step 2: Check for active game using spectator API
        # Endpoint: GET /lol/spectator/v5/active-games/by-summoner/{encryptedPUUID}
        # encryptedPUUID = the PUUID obtained from step 1
        game_data = riot_client.get_active_game(puuid, region)
        
        if not game_data:
            return jsonify({'error': 'Player not in a live game', 'inGame': False}), 200
        
        # Format response to match frontend expectations
        participants = []
        for participant in game_data.get('participants', []):
            # Extract name and tag from riotId if available
            riot_id = participant.get('riotId', '#')
            if '#' in riot_id:
                name, tag = riot_id.rsplit('#', 1)
            else:
                name = participant.get('summonerName', 'Unknown')
                tag = participant.get('riotIdTagline', 'NA1')
            
            participants.append({
                'summonerName': name,
                'tagLine': tag,
                'puuid': participant.get('puuid', ''),
                'championId': participant.get('championId', 0),
                'teamId': participant.get('teamId', 100)
            })
        
        response = {
            'gameId': game_data.get('gameId'),
            'gameMode': game_data.get('gameMode', 'CLASSIC'),
            'gameStartTime': game_data.get('gameStartTime', 0),
            'participants': participants,
            'inGame': True
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        print(f"Error in check_game: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/analyze-snipes', methods=['POST', 'OPTIONS'])
def analyze_snipes():
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return '', 200
    """
    Analyze match history to find players who appear in both
    the current lobby and the user's recent matches
    
    Request body:
    {
        "userPuuid": "abc123...",
        "participants": [
            {"puuid": "xyz789...", "summonerName": "Player", "tagLine": "TAG", "championId": 1, "teamId": 100},
            ...
        ],
        "region": "NA1"
    }
    
    Returns:
    [
        {
            "summonerName": "Player",
            "tagLine": "TAG",
            "puuid": "xyz789...",
            "championId": 1,
            "totalGames": 3,
            "wins": 2,
            "losses": 1,
            "matches": [...]
        }
    ]
    """
    try:
        data = request.json
        user_puuid = data.get('userPuuid')
        participants = data.get('participants', [])
        region = data.get('region', 'NA1')
        
        if not user_puuid or not participants:
            return jsonify({'error': 'Missing userPuuid or participants'}), 400
        
        # Extract PUUIDs from participants
        lobby_puuids = [p['puuid'] for p in participants if p.get('puuid')]
        
        # Analyze match history
        analysis = riot_client.analyze_match_history(user_puuid, lobby_puuids, region)
        
        # Format response with participant info
        results = []
        for participant in participants:
            puuid = participant.get('puuid')
            if puuid in analysis:
                results.append({
                    'summonerName': participant.get('summonerName'),
                    'tagLine': participant.get('tagLine'),
                    'puuid': puuid,
                    'championId': participant.get('championId'),
                    'teamId': participant.get('teamId'),
                    'totalGames': analysis[puuid]['totalGames'],
                    'wins': analysis[puuid]['wins'],
                    'losses': analysis[puuid]['losses'],
                    'matches': analysis[puuid]['matches']
                })
        
        return jsonify(results), 200
        
    except Exception as e:
        print(f"Error in analyze_snipes: {e}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = config.get('port', 5000)
    print(f"Starting server on port {port}...")
    print(f"CORS enabled for: {config.get('cors_origins')}")
    app.run(host='0.0.0.0', port=port, debug=True)

