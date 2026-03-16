"""Flask backend entrypoint for Have I Been Sniped."""

import os

from app_factory import create_app
from riot_client import RiotAPIClient
from storage import Storage
from utils import load_runtime_config


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
