"""Application factory for the Have I Been Sniped backend."""

from flask import Flask, jsonify, request
from flask_cors import CORS


DEFAULT_CORS_ORIGINS = ["http://localhost:4000"]


def create_app(config=None, riot_client=None, storage=None):
    """Create a configured Flask application instance."""
    app = Flask(__name__)
    app.config["CORS_ORIGINS"] = DEFAULT_CORS_ORIGINS.copy()

    if config:
        app.config.update(config)

    app.extensions["riot_client"] = riot_client
    app.extensions["storage"] = storage

    CORS(
        app,
        origins=app.config.get("CORS_ORIGINS", DEFAULT_CORS_ORIGINS),
        methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
        supports_credentials=True,
    )

    @app.route("/", methods=["GET"])
    def root():
        return jsonify({
            "service": "Have I Been Sniped - Backend API",
            "status": "running",
            "version": "1.0.0",
            "endpoints": {
                "health": {
                    "method": "GET",
                    "path": "/health",
                    "description": "Health check endpoint",
                },
                "scan": {
                    "method": "POST",
                    "path": "/api/analyze-snipes",
                    "description": "Analyze match history for player overlaps",
                },
                "check_game": {
                    "method": "POST",
                    "path": "/api/check-game",
                    "description": "Check if a player is in a live game",
                },
            },
            "documentation": "See backend/README.md for detailed API documentation",
        }), 200

    @app.route("/health", methods=["GET"])
    def health_check():
        return jsonify({"status": "healthy", "message": "Backend is running"}), 200

    @app.route("/api/check-game", methods=["POST", "OPTIONS"])
    def check_game():
        if request.method == "OPTIONS":
            return "", 200

        client = app.extensions.get("riot_client")
        if client is None:
            return jsonify({"error": "Riot client is not configured"}), 500

        try:
            data = request.json or {}
            game_name = data.get("gameName")
            tag_line = data.get("tagLine")
            region = data.get("region", "NA1")

            if not game_name or not tag_line:
                return jsonify({"error": "Missing gameName or tagLine"}), 400

            puuid = client.get_puuid_by_riot_id(game_name, tag_line, region)
            if not puuid:
                return jsonify({"error": "Player not found"}), 404

            game_data = client.get_active_game(puuid, region)
            if not game_data:
                return jsonify({"error": "Player not in a live game", "inGame": False}), 200

            participants = []
            for participant in game_data.get("participants", []):
                riot_id = participant.get("riotId", "#")
                if "#" in riot_id:
                    name, tag = riot_id.rsplit("#", 1)
                else:
                    name = participant.get("summonerName", "Unknown")
                    tag = participant.get("riotIdTagline", "NA1")

                participants.append({
                    "summonerName": name,
                    "tagLine": tag,
                    "puuid": participant.get("puuid", ""),
                    "championId": participant.get("championId", 0),
                    "teamId": participant.get("teamId", 100),
                })

            response = {
                "gameId": game_data.get("gameId"),
                "gameMode": game_data.get("gameMode", "CLASSIC"),
                "gameStartTime": game_data.get("gameStartTime", 0),
                "participants": participants,
                "inGame": True,
            }
            return jsonify(response), 200
        except Exception as exc:
            print(f"Error in check_game: {exc}")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/analyze-snipes", methods=["POST", "OPTIONS"])
    def analyze_snipes():
        if request.method == "OPTIONS":
            return "", 200

        client = app.extensions.get("riot_client")
        if client is None:
            return jsonify({"error": "Riot client is not configured"}), 500

        try:
            data = request.json or {}
            user_puuid = data.get("userPuuid")
            participants = data.get("participants", [])
            region = data.get("region", "NA1")

            if not user_puuid or not participants:
                return jsonify({"error": "Missing userPuuid or participants"}), 400

            lobby_puuids = [participant["puuid"] for participant in participants if participant.get("puuid")]
            analysis = client.analyze_match_history(user_puuid, lobby_puuids, region)

            results = []
            for participant in participants:
                puuid = participant.get("puuid")
                if puuid in analysis:
                    results.append({
                        "summonerName": participant.get("summonerName"),
                        "tagLine": participant.get("tagLine"),
                        "puuid": puuid,
                        "championId": participant.get("championId"),
                        "teamId": participant.get("teamId"),
                        "totalGames": analysis[puuid]["totalGames"],
                        "wins": analysis[puuid]["wins"],
                        "losses": analysis[puuid]["losses"],
                        "matches": analysis[puuid]["matches"],
                    })

            return jsonify(results), 200
        except Exception as exc:
            print(f"Error in analyze_snipes: {exc}")
            return jsonify({"error": "Internal server error"}), 500

    return app
