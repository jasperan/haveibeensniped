# Have I Been Sniped - Backend

Python Flask backend that interfaces with the Riot Games API to check for stream snipers in League of Legends.

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure API Key

Copy the example config and add your Riot API key:

```bash
cp config.yaml.example config.yaml
```

Edit `config.yaml` and replace `RGAPI-YOUR-API-KEY-HERE` with your actual API key from [Riot Developer Portal](https://developer.riotgames.com/).

### 3. Run the Server

```bash
python main.py
```

The server will start on `http://localhost:5000` by default.

## API Endpoints

### Health Check
```
GET /health
```

Returns server status.

### Check Live Game
```
POST /api/check-game
Content-Type: application/json

{
  "gameName": "PlayerName",
  "tagLine": "TAG",
  "region": "NA1"
}
```

Checks if a player is currently in a live game and returns lobby information.

### Analyze Snipes
```
POST /api/analyze-snipes
Content-Type: application/json

{
  "userPuuid": "abc123...",
  "participants": [
    {
      "puuid": "xyz789...",
      "summonerName": "Player",
      "tagLine": "TAG",
      "championId": 1,
      "teamId": 100
    }
  ],
  "region": "NA1"
}
```

Analyzes the user's last 100 matches to find overlaps with current lobby participants.

## Configuration Options

### config.yaml

- `riot_api_key`: Your Riot Games API key (required)
- `port`: Server port (default: 5000)
- `cors_origins`: List of allowed frontend origins for CORS
- `cache_enabled`: Enable PUUID caching (default: true)
- `cache_ttl`: Cache time-to-live in seconds (default: 300)
- `rate_limit_per_second`: Max requests per second to Riot API (default: 19)

## Regional Routing

The backend automatically handles Riot's dual routing system:

### Account API (Regional Routing)
- `americas`: NA1, BR1, LA1, LA2
- `europe`: EUW1, EUNE1, TR1, RU
- `asia`: KR, JP1
- `sea`: OC1, PH2, SG2, TH2, TW2, VN2

### Game APIs (Platform Routing)
Uses platform-specific endpoints (na1, euw1, kr, etc.)

## Error Handling

The backend handles:
- Invalid API keys
- Rate limiting (429 errors with retry)
- Player not found (404)
- Not in game (returns `inGame: false`)
- Network timeouts

## Development

### Testing the API

```bash
# Health check
curl http://localhost:5000/health

# Check game
curl -X POST http://localhost:5000/api/check-game \
  -H "Content-Type: application/json" \
  -d '{"gameName":"PlayerName","tagLine":"TAG","region":"NA1"}'
```

## Rate Limits

Riot API rate limits for development keys:
- 20 requests per second
- 100 requests per 2 minutes

The backend respects these limits and will automatically retry with backoff on 429 errors.

## Production Deployment

For production:
1. Apply for a production API key at [Riot Developer Portal](https://developer.riotgames.com/)
2. Update `cors_origins` in config.yaml to include your production domain
3. Set `debug=False` in `main.py`
4. Use a production WSGI server like Gunicorn:

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 main:app
```

