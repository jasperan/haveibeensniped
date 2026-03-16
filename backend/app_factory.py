"""Application factory for the Have I Been Sniped backend."""

from flask import Flask, jsonify
from flask_cors import CORS


DEFAULT_CORS_ORIGINS = ["http://localhost:4000"]
SCAN_ENDPOINT = {
    "method": "POST",
    "path": "/api/scan",
    "description": "Encounter scan endpoint",
}


def create_app(config: dict, riot_client=None, storage=None):
    """Create a configured Flask application instance."""
    app = Flask(__name__)
    app.config["CORS_ORIGINS"] = DEFAULT_CORS_ORIGINS.copy()
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
                "scan": SCAN_ENDPOINT,
            },
        }), 200

    @app.route("/health", methods=["GET"])
    def health_check():
        return jsonify({"status": "healthy", "message": "Backend is running"}), 200

    return app
