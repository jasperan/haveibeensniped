"""Application factory for the Have I Been Sniped backend."""

from flask import Flask, jsonify, request
from flask_cors import CORS

from demo_data import DemoRiotClient
from live_client import LiveClient, disconnected_status
from scan_service import ScanService


DEFAULT_CORS_ORIGINS = [
    "http://localhost:4000",
    "http://127.0.0.1:4000",
    "http://localhost:4001",
    "http://127.0.0.1:4001",
    "http://localhost:4002",
    "http://127.0.0.1:4002",
    "http://localhost:4003",
    "http://127.0.0.1:4003",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
SCAN_ENDPOINT = {
    "method": "POST",
    "path": "/api/scan",
    "description": "Encounter scan endpoint",
}


def api_is_configured(config: dict) -> bool:
    configured_flag = config.get("API_CONFIGURED")
    if configured_flag is not None:
        return bool(configured_flag)

    api_key = config.get("RIOT_API_KEY")  # pragma: allowlist secret
    return bool(api_key and api_key != "RGAPI-YOUR-API-KEY-HERE")  # pragma: allowlist secret


def create_app(
    config: dict,
    riot_client=None,
    storage=None,
    scan_service=None,
    live_client=None,
    demo_scan_service=None,
):
    """Create a configured Flask application instance."""
    app = Flask(__name__)
    app.config["CORS_ORIGINS"] = DEFAULT_CORS_ORIGINS.copy()
    app.config.update(config)

    app.extensions["riot_client"] = riot_client
    app.extensions["storage"] = storage
    if live_client is None:
        live_client = LiveClient()
    app.extensions["live_client"] = live_client
    if scan_service is None and riot_client is not None:
        scan_service = ScanService(storage=storage, riot_client=riot_client)
    app.extensions["scan_service"] = scan_service
    if demo_scan_service is None and app.config.get("DEMO_MODE"):
        demo_scan_service = ScanService(storage=storage, riot_client=DemoRiotClient())
    app.extensions["demo_scan_service"] = demo_scan_service

    CORS(
        app,
        origins=app.config.get("CORS_ORIGINS", DEFAULT_CORS_ORIGINS),
        methods=["GET", "POST", "PUT", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
        supports_credentials=True,
    )

    @app.route("/api/scan", methods=["POST"])
    def manual_scan():
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            payload = {}

        game_name = payload.get("gameName")
        tag_line = payload.get("tagLine")
        region = payload.get("region")

        if not game_name or not tag_line or not region:
            return jsonify({"error": "Missing gameName, tagLine, or region"}), 400

        if app.extensions.get("scan_service") is None:
            return jsonify({"error": "Riot API is not configured"}), 503

        try:
            result = app.extensions["scan_service"].run_manual_scan(
                game_name,
                tag_line,
                region,
            )
        except ValueError as error:
            return jsonify({"error": str(error)}), 404
        except Exception:
            app.logger.exception("Manual scan failed")
            return jsonify({"error": "Internal server error"}), 500

        return jsonify(result), 200

    @app.route("/api/demo/scan", methods=["POST"])
    def demo_scan():
        if not app.config.get("DEMO_MODE"):
            return jsonify({"error": "Demo mode is disabled"}), 404
        demo_service = app.extensions.get("demo_scan_service")
        if demo_service is None:
            return jsonify({"error": "Demo mode is unavailable"}), 503

        try:
            result = demo_service.run_manual_scan(
                "Streamer",
                "NA1",
                "NA1",
                source="demo",
            )
        except Exception:
            app.logger.exception("Demo scan failed")
            return jsonify({"error": "Internal server error"}), 500

        return jsonify(result), 200

    @app.route("/api/status", methods=["GET"])
    def app_status():
        return jsonify({
            "status": "running",
            "demoMode": bool(app.config.get("DEMO_MODE")),
            "apiConfigured": api_is_configured(app.config),
            "port": app.config.get("PORT", 5000),
        }), 200

    @app.route("/api/live-client/status", methods=["GET"])
    def live_client_status():
        status = disconnected_status()

        try:
            live_status = app.extensions["live_client"].get_status()
        except Exception:
            app.logger.exception("Live client status lookup failed")
            live_status = None

        if isinstance(live_status, dict):
            status.update(live_status)

        matched_profile = None
        active_player = status.get("activePlayer")
        get_tracked_profile = getattr(
            app.extensions.get("storage"),
            "get_tracked_profile_by_riot_id",
            None,
        )

        if (
            status.get("connected")
            and status.get("inGame")
            and isinstance(active_player, dict)
            and callable(get_tracked_profile)
        ):
            matched_profile = get_tracked_profile(
                active_player.get("gameName"),
                active_player.get("tagLine"),
            )

        auto_scan_enabled = bool(
            status.get("connected")
            and status.get("inGame")
            and status.get("sessionFingerprint")
            and matched_profile
        )
        if app.config.get("DEMO_MODE") and not api_is_configured(app.config):
            auto_scan_enabled = False

        return jsonify({
            **status,
            "matchedProfile": matched_profile,
            "canAutoScan": auto_scan_enabled,
        }), 200

    @app.route("/api/tracked-profiles/<int:tracked_profile_id>/memory", methods=["GET"])
    def tracked_profile_memory(tracked_profile_id: int):
        storage = app.extensions.get("storage")
        if storage is None:
            return jsonify({"error": "Storage unavailable"}), 500

        overview = storage.load_memory_overview(tracked_profile_id)
        if overview is None:
            return jsonify({"error": "Tracked profile not found"}), 404

        return jsonify(overview), 200

    @app.route("/api/memory/summary", methods=["GET"])
    def memory_summary():
        storage = app.extensions.get("storage")
        if storage is None:
            return jsonify({"error": "Storage unavailable"}), 500
        return jsonify(storage.get_memory_summary()), 200

    @app.route("/api/tracked-profiles/<int:tracked_profile_id>/players/<player_puuid>/note", methods=["PUT"])
    def update_watch_note(tracked_profile_id: int, player_puuid: str):
        storage = app.extensions.get("storage")
        if storage is None:
            return jsonify({"error": "Storage unavailable"}), 500

        if storage.get_tracked_profile(tracked_profile_id) is None:
            return jsonify({"error": "Tracked profile not found"}), 404
        if storage.get_player(player_puuid) is None:
            return jsonify({"error": "Player not found"}), 404
        if not storage.tracked_profile_has_player(tracked_profile_id, player_puuid):
            return jsonify({"error": "Player is not linked to tracked profile"}), 404

        payload = request.get_json(silent=True)
        note = None
        if isinstance(payload, dict):
            note = payload.get("note")

        saved_note = storage.upsert_watch_note(tracked_profile_id, player_puuid, note)
        return jsonify({
            "trackedProfileId": tracked_profile_id,
            "playerPuuid": player_puuid,
            "note": saved_note,
        }), 200

    @app.route("/", methods=["GET"])
    def root():
        return jsonify({
            "service": "Have I Been Sniped - Backend API",
            "status": "running",
            "version": "1.0.0",
            "demoMode": bool(app.config.get("DEMO_MODE")),
            "endpoints": {
                "health": {
                    "method": "GET",
                    "path": "/health",
                    "description": "Health check endpoint",
                },
                "scan": SCAN_ENDPOINT,
                "demo_scan": {
                    "method": "POST",
                    "path": "/api/demo/scan",
                    "description": "Demo walkthrough scan endpoint",
                },
                "memory_summary": {
                    "method": "GET",
                    "path": "/api/memory/summary",
                    "description": "Local memory summary endpoint",
                },
            },
        }), 200

    @app.route("/health", methods=["GET"])
    def health_check():
        return jsonify({"status": "healthy", "message": "Backend is running"}), 200

    return app
