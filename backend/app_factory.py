"""Application factory for the Have I Been Sniped backend."""

from flask import Flask, jsonify, request
from flask_cors import CORS

from live_client import LiveClient
from scan_service import ScanService


DEFAULT_CORS_ORIGINS = ["http://localhost:4000"]
SCAN_ENDPOINT = {
    "method": "POST",
    "path": "/api/scan",
    "description": "Encounter scan endpoint",
}


def disconnected_live_client_status():
    return {
        "connected": False,
        "inGame": False,
        "activePlayer": None,
        "participantCount": 0,
        "gameMode": None,
        "mapName": None,
        "sessionFingerprint": None,
    }


def create_app(config: dict, riot_client=None, storage=None, scan_service=None, live_client=None):
    """Create a configured Flask application instance."""
    app = Flask(__name__)
    app.config["CORS_ORIGINS"] = DEFAULT_CORS_ORIGINS.copy()
    app.config.update(config)

    app.extensions["riot_client"] = riot_client
    app.extensions["storage"] = storage
    if live_client is None:
        live_client = LiveClient()
    app.extensions["live_client"] = live_client
    if scan_service is None:
        scan_service = ScanService(storage=storage, riot_client=riot_client)
    app.extensions["scan_service"] = scan_service

    CORS(
        app,
        origins=app.config.get("CORS_ORIGINS", DEFAULT_CORS_ORIGINS),
        methods=["GET", "POST", "OPTIONS"],
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

    @app.route("/api/live-client/status", methods=["GET"])
    def live_client_status():
        status = disconnected_live_client_status()

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

        return jsonify({
            **status,
            "matchedProfile": matched_profile,
            "canAutoScan": bool(
                status.get("connected")
                and status.get("inGame")
                and status.get("sessionFingerprint")
                and matched_profile
            ),
        }), 200

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
                "scan": SCAN_ENDPOINT,
            },
        }), 200

    @app.route("/health", methods=["GET"])
    def health_check():
        return jsonify({"status": "healthy", "message": "Backend is running"}), 200

    return app
