"""Utility functions for configuration, region mapping, and data processing."""

from __future__ import annotations

import os
from pathlib import Path

import yaml


DEFAULT_RUNTIME_CONFIG = {
    "PORT": 5000,
    "CORS_ORIGINS": [
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
    ],
    "DATABASE_PATH": "data/haveibeensniped.db",
    "CACHE_ENABLED": True,
    "CACHE_TTL": 300,
    "RATE_LIMIT_PER_SECOND": 19,
    "DEMO_MODE": False,
}


REGION_TO_REGIONAL = {
    'NA1': 'americas',
    'BR1': 'americas',
    'LA1': 'americas',
    'LA2': 'americas',
    'EUW1': 'europe',
    'EUNE1': 'europe',
    'TR1': 'europe',
    'RU': 'europe',
    'KR': 'asia',
    'JP1': 'asia',
    'OC1': 'sea',
    'PH2': 'sea',
    'SG2': 'sea',
    'TH2': 'sea',
    'TW2': 'sea',
    'VN2': 'sea',
}


def _env_flag(name: str) -> bool | None:
    value = os.getenv(name)
    if value is None:
        return None
    return value.strip().lower() in {'1', 'true', 'yes', 'on'}


def load_runtime_config(config_path: str | Path | None = None) -> dict:
    """Load validated runtime configuration from config.yaml."""
    resolved_config_path = Path(config_path or Path(__file__).with_name("config.yaml"))

    try:
        with resolved_config_path.open("r", encoding="utf-8") as handle:
            file_config = yaml.safe_load(handle) or {}
    except FileNotFoundError:
        print("Error: config.yaml not found. Please create it from config.yaml.example")
        raise SystemExit(1)

    demo_mode = file_config.get("enable_demo_mode", DEFAULT_RUNTIME_CONFIG["DEMO_MODE"])
    env_demo_mode = _env_flag("HIBS_DEMO_MODE")
    if env_demo_mode is not None:
        demo_mode = env_demo_mode

    api_key = file_config.get("riot_api_key")
    api_configured = bool(api_key and api_key != "RGAPI-YOUR-API-KEY-HERE")
    if not demo_mode and (not api_key or api_key == "RGAPI-YOUR-API-KEY-HERE"):  # pragma: allowlist secret
        print("Error: Please set a valid Riot API key in config.yaml")
        raise SystemExit(1)

    database_path = Path(
        file_config.get("database_path", DEFAULT_RUNTIME_CONFIG["DATABASE_PATH"])
    )
    if not database_path.is_absolute():
        database_path = resolved_config_path.parent / database_path

    return {
        "RIOT_API_KEY": api_key,
        "DATABASE_PATH": str(database_path),
        "CORS_ORIGINS": list(dict.fromkeys([
            *(file_config.get("cors_origins") or []),
            *DEFAULT_RUNTIME_CONFIG["CORS_ORIGINS"],
        ])),
        "PORT": file_config.get("port", DEFAULT_RUNTIME_CONFIG["PORT"]),
        "CACHE_ENABLED": file_config.get(
            "cache_enabled", DEFAULT_RUNTIME_CONFIG["CACHE_ENABLED"]
        ),
        "CACHE_TTL": file_config.get("cache_ttl", DEFAULT_RUNTIME_CONFIG["CACHE_TTL"]),
        "RATE_LIMIT_PER_SECOND": file_config.get(
            "rate_limit_per_second",
            DEFAULT_RUNTIME_CONFIG["RATE_LIMIT_PER_SECOND"],
        ),
        "DEMO_MODE": bool(demo_mode),
        "API_CONFIGURED": api_configured,
    }


def get_regional_endpoint(platform: str) -> str:
    """Map a platform code (e.g. 'NA1') to its regional routing value."""
    return REGION_TO_REGIONAL.get(platform.upper(), 'americas')


def get_platform_endpoint(platform: str) -> str:
    """Return the lowercased platform code used for platform-routed endpoints."""
    return platform.lower()
