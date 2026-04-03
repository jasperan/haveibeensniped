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

You can start in **demo mode** with the example config as-is, or by setting `HIBS_DEMO_MODE=1` before launching the backend. When you're ready for real Riot scans, edit `config.yaml` and replace `RGAPI-YOUR-API-KEY-HERE` with your actual API key from [Riot Developer Portal](https://developer.riotgames.com/).

### 3. Run the Server

```bash
python main.py
```

The server will start on `http://localhost:5000` by default.

## Demo Mode

If `enable_demo_mode: true` in `config.yaml` or `HIBS_DEMO_MODE=1` is set in the environment, the backend can start without a real Riot API key so the frontend can run a full guided demo flow. Real Riot-backed manual scans still require a valid key.

## Local Encounter Memory

A successful manual `POST /api/scan` call writes local encounter memory into SQLite. It stores:

- the tracked Riot ID you scanned
- the current lobby snapshot for that scan
- shared matches for the current lobby players
- local repeat-player risk scoring built from saved encounters

By default, the database lives at `backend/data/haveibeensniped.db`. Fresh installs start empty. Delete that file if you want a reset.

**Repeat-player tiers**
- **background**: there is some history, but not much signal yet
- **repeat**: the player has shown up more than once
- **watch**: the recurrence looks strong enough to keep an eye on
- **high-attention**: the player keeps surfacing across saved scans

These labels describe encounter recurrence, not intent. They are local heuristics, not accusations.

## Live Client Auto-Detect

The backend now exposes local game-client status through Riot's Live Client Data API at `https://127.0.0.1:2999/liveclientdata/allgamedata`.

Current behavior:
- `GET /api/live-client/status` reports whether the local client is connected and in game
- it returns the local active Riot ID when the game client exposes it
- it matches that Riot ID against a saved tracked profile so the frontend can auto-scan safely
- it uses a live-session fingerprint so one match only triggers one auto-scan while the page stays open

This is page-driven for now. If the frontend page is closed, auto-detect is not running.

## API Endpoints

### Health Check
```
GET /health
```

Returns server status.

### Manual Scan
```
POST /api/scan
Content-Type: application/json

{
  "gameName": "PlayerName",
  "tagLine": "TAG",
  "region": "NA1"
}
```

Resolves the tracked Riot ID, checks the live lobby, stores the scan locally, and returns repeat-player results built from shared match history.

### Live Client Status
```
GET /api/live-client/status
```

Returns local game-client state, the active Riot ID when available, a saved tracked-profile match, and whether the frontend can auto-trigger a scan.

## Configuration Options

### config.yaml

- `riot_api_key`: Your Riot Games API key (required)
- `port`: Server port (default: 5000)
- `database_path`: SQLite file for local encounter memory (default: `data/haveibeensniped.db`)
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
- Not in game (returns `scan.status: "not_in_game"` and `currentGame: null`)
- Network timeouts

## Development

### Testing the API

```bash
# Health check
curl http://localhost:5000/health

# Manual scan
curl -X POST http://localhost:5000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"gameName":"PlayerName","tagLine":"TAG","region":"NA1"}'
```

## Rate Limits

Riot API rate limits for development keys:
- 20 requests per second
- 100 requests per 2 minutes

The backend respects these limits and will automatically retry with backoff on 429 errors.

## Verification

```bash
cd backend && python -m pytest -q
npm run build
```

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
