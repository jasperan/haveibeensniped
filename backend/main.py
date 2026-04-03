"""Flask backend entrypoint for Have I Been Sniped."""

import os

from app_factory import create_app
from demo_data import DemoLiveClient, DemoRiotClient
from live_client import LiveClient
from riot_client import RiotAPIClient
from storage import Storage
from utils import load_runtime_config


def build_storage(config):
    """Build the runtime storage dependency."""
    return Storage(config["DATABASE_PATH"])


def build_riot_client(config):
    """Build the Riot provider for the current runtime mode."""
    if config.get("API_CONFIGURED"):
        return RiotAPIClient(config["RIOT_API_KEY"])
    if config.get("DEMO_MODE"):
        return None
    raise ValueError("Riot API is not configured and demo mode is disabled")


def build_live_client(config):
    """Build the live-client provider for the current runtime mode."""
    if config.get("DEMO_MODE") and not config.get("API_CONFIGURED"):
        return DemoLiveClient()
    return LiveClient()


def get_bind_host() -> str:
    """Resolve the runtime bind host, defaulting to localhost for safety."""
    return os.getenv("HIBS_BIND_HOST", "127.0.0.1")


def main():
    config = load_runtime_config()
    storage = build_storage(config)
    riot_client = build_riot_client(config)
    live_client = build_live_client(config)
    app = create_app(config, riot_client=riot_client, storage=storage, live_client=live_client)

    port = app.config.get("PORT", 5000)
    print(f"Starting server on port {port}...")
    print(f"CORS enabled for: {app.config.get('CORS_ORIGINS')}")
    print(f"Demo mode: {app.config.get('DEMO_MODE')}")
    print(f"Bind host: {get_bind_host()}")
    app.run(
        host=get_bind_host(),
        port=port,
        debug=os.getenv("FLASK_DEBUG", "").lower() in ("1", "true"),
    )


if __name__ == "__main__":
    main()
