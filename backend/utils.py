"""Utility functions for configuration, region mapping, and data processing."""

from __future__ import annotations

from pathlib import Path

import yaml


DEFAULT_RUNTIME_CONFIG = {
    "PORT": 5000,
    "CORS_ORIGINS": ["http://localhost:4000"],
    "DATABASE_PATH": "data/haveibeensniped.db",
    "CACHE_ENABLED": True,
    "CACHE_TTL": 300,
    "RATE_LIMIT_PER_SECOND": 19,
}


# Regional routing mapping for Riot API
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


def load_runtime_config(config_path: str | Path | None = None) -> dict:
    """Load validated runtime configuration from config.yaml."""
    resolved_config_path = Path(config_path or Path(__file__).with_name("config.yaml"))

    try:
        with resolved_config_path.open("r", encoding="utf-8") as handle:
            file_config = yaml.safe_load(handle) or {}
    except FileNotFoundError:
        print("Error: config.yaml not found. Please create it from config.yaml.example")
        raise SystemExit(1)

    api_key = file_config.get("riot_api_key")
    if not api_key or api_key == "RGAPI-YOUR-API-KEY-HERE":
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
        "CORS_ORIGINS": file_config.get(
            "cors_origins", DEFAULT_RUNTIME_CONFIG["CORS_ORIGINS"]
        ),
        "PORT": file_config.get("port", DEFAULT_RUNTIME_CONFIG["PORT"]),
        "CACHE_ENABLED": file_config.get(
            "cache_enabled", DEFAULT_RUNTIME_CONFIG["CACHE_ENABLED"]
        ),
        "CACHE_TTL": file_config.get("cache_ttl", DEFAULT_RUNTIME_CONFIG["CACHE_TTL"]),
        "RATE_LIMIT_PER_SECOND": file_config.get(
            "rate_limit_per_second",
            DEFAULT_RUNTIME_CONFIG["RATE_LIMIT_PER_SECOND"],
        ),
    }


def get_regional_endpoint(platform: str) -> str:
    """
    Convert platform code to regional endpoint for Account API

    Args:
        platform: Platform code (e.g., 'NA1', 'EUW1')

    Returns:
        Regional endpoint (e.g., 'americas', 'europe')
    """
    return REGION_TO_REGIONAL.get(platform.upper(), 'americas')


def get_platform_endpoint(platform: str) -> str:
    """
    Get the platform-specific endpoint URL

    Args:
        platform: Platform code (e.g., 'NA1', 'EUW1')

    Returns:
        Platform endpoint URL
    """
    return platform.lower()
