from demo_data import DemoLiveClient
from live_client import LiveClient
from main import build_live_client, build_riot_client, get_bind_host
from riot_client import RiotAPIClient


def test_demo_only_runtime_disables_real_scan_client():
    riot_client = build_riot_client({
        "DEMO_MODE": True,
        "API_CONFIGURED": False,
        "RIOT_API_KEY": None,
    })
    live_client = build_live_client({
        "DEMO_MODE": True,
        "API_CONFIGURED": False,
    })

    assert riot_client is None
    assert isinstance(live_client, DemoLiveClient)


def test_demo_mode_keeps_real_clients_when_api_is_configured():
    riot_client = build_riot_client({
        "DEMO_MODE": True,
        "API_CONFIGURED": True,
        "RIOT_API_KEY": "test-key",
    })
    live_client = build_live_client({
        "DEMO_MODE": True,
        "API_CONFIGURED": True,
    })

    assert isinstance(riot_client, RiotAPIClient)
    assert isinstance(live_client, LiveClient)


def test_runtime_requires_real_client_when_demo_mode_is_off():
    riot_client = build_riot_client({
        "DEMO_MODE": False,
        "API_CONFIGURED": True,
        "RIOT_API_KEY": "test-key",
    })
    live_client = build_live_client({
        "DEMO_MODE": False,
        "API_CONFIGURED": True,
    })

    assert isinstance(riot_client, RiotAPIClient)
    assert isinstance(live_client, LiveClient)


def test_bind_host_defaults_to_localhost(monkeypatch):
    monkeypatch.delenv("HIBS_BIND_HOST", raising=False)
    assert get_bind_host() == "127.0.0.1"


def test_bind_host_can_be_overridden(monkeypatch):
    monkeypatch.setenv("HIBS_BIND_HOST", "0.0.0.0")
    assert get_bind_host() == "0.0.0.0"
