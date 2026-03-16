"""Flask backend entrypoint for Have I Been Sniped."""

import os

import yaml

from app_factory import create_app
from riot_client import RiotAPIClient
from storage import Storage


def load_runtime_config():
    """Load runtime configuration from config.yaml."""
    config_path = os.path.join(os.path.dirname(__file__), "config.yaml")

    try:
        with open(config_path, "r", encoding="utf-8") as handle:
            file_config = yaml.safe_load(handle) or {}
    except FileNotFoundError:
        print("Error: config.yaml not found. Please create it from config.yaml.example")
        raise SystemExit(1)

    api_key = file_config.get("riot_api_key")
    if not api_key or api_key == "RGAPI-YOUR-API-KEY-HERE":
        print("Error: Please set a valid Riot API key in config.yaml")
        raise SystemExit(1)

    return {
        "RIOT_API_KEY": api_key,
        "DATABASE_PATH": file_config.get(
            "database_path",
            os.path.join(os.path.dirname(__file__), "encounters.db"),
        ),
        "CORS_ORIGINS": file_config.get("cors_origins", ["http://localhost:4000"]),
        "PORT": file_config.get("port", 5000),
    }


def build_storage(config):
    """Build the runtime storage dependency."""
    return Storage(config["DATABASE_PATH"])


def main():
    config = load_runtime_config()
    storage = build_storage(config)
    riot_client = RiotAPIClient(config["RIOT_API_KEY"])
    app = create_app(config, riot_client=riot_client, storage=storage)

    port = app.config.get("PORT", 5000)
    print(f"Starting server on port {port}...")
    print(f"CORS enabled for: {app.config.get('CORS_ORIGINS')}")
    app.run(
        host="0.0.0.0",
        port=port,
        debug=os.getenv("FLASK_DEBUG", "").lower() in ("1", "true"),
    )


if __name__ == "__main__":
    main()
