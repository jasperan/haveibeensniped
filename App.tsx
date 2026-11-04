import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import LobbyTracker from './components/LobbyTracker';
import MemoryCenter from './components/MemoryCenter';
import RepeatPlayerBoard from './components/RepeatPlayerBoard';
import RepeatPlayerDetail from './components/RepeatPlayerDetail';
import SnipeHistory from './components/SnipeHistory';
import { AlertIcon, BarsIcon, BoltIcon } from './components/Icons';
import {
  RiotService,
  mapScanCurrentGameToCurrentGame,
} from './services/riotService';
import { CurrentGame, LiveClientStatus, MemorySummary, Region, RepeatPlayer } from './types';

const LIVE_CLIENT_POLL_INTERVAL_MS = 5000;
const DISCONNECTED_LIVE_CLIENT_STATUS: LiveClientStatus = {
  connected: false,
  inGame: false,
  activePlayer: null,
  participantCount: 0,
  gameMode: null,
  mapName: null,
  sessionFingerprint: null,
  matchedProfile: null,
  canAutoScan: false,
};

const getLiveClientBanner = (
  liveClientStatus: LiveClientStatus,
  lastAutoScanFingerprint: string | null,
  loading: boolean,
) => {
  if (!liveClientStatus.connected) {
    return {
      accentClassName: 'bg-ink3',
      badgeClassName: 'border-line bg-raised text-ink2',
      text: 'offline on this machine.',
    };
  }

  if (!liveClientStatus.inGame) {
    return {
      accentClassName: 'bg-emerald-500',
      badgeClassName: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      text: 'connected, waiting for a game.',
    };
  }

  const riotId = liveClientStatus.activePlayer?.riotId || 'Unknown player';

  if (!liveClientStatus.matchedProfile) {
    return {
      accentClassName: 'bg-amber-500',
      badgeClassName: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
      text: `found ${riotId}, but no saved profile exists yet. Run one manual scan first.`,
    };
  }

  if (loading && liveClientStatus.canAutoScan && liveClientStatus.sessionFingerprint !== lastAutoScanFingerprint) {
    return {
      accentClassName: 'bg-indigo-500',
      badgeClassName: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
      text: `auto-scanning the current session for ${riotId}.`,
    };
  }

  if (liveClientStatus.canAutoScan && liveClientStatus.sessionFingerprint === lastAutoScanFingerprint) {
    return {
      accentClassName: 'bg-indigo-500',
      badgeClassName: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
      text: `auto-scanned the current session for ${riotId}.`,
    };
  }

  if (liveClientStatus.canAutoScan) {
    return {
      accentClassName: 'bg-emerald-500',
      badgeClassName: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      text: `ready to auto-scan for ${riotId}.`,
    };
  }

  return {
    accentClassName: 'bg-ink3',
    badgeClassName: 'border-line bg-raised text-ink2',
    text: 'connected.',
  };
};

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentGame, setCurrentGame] = useState<CurrentGame | null>(null);
  const [repeatPlayers, setRepeatPlayers] = useState<RepeatPlayer[]>([]);
  const [selectedRepeatPlayer, setSelectedRepeatPlayer] = useState<RepeatPlayer | null>(null);
  const [searchedUser, setSearchedUser] = useState<{ name: string; tag: string } | null>(null);
  const [trackedProfileId, setTrackedProfileId] = useState<number | null>(null);
  const [liveClientStatus, setLiveClientStatus] = useState<LiveClientStatus>(DISCONNECTED_LIVE_CLIENT_STATUS);
  const [lastAutoScanFingerprint, setLastAutoScanFingerprint] = useState<string | null>(null);
  const [lastScanSource, setLastScanSource] = useState<'manual' | 'auto' | 'demo' | null>(null);
  const [memorySummary, setMemorySummary] = useState<MemorySummary | null>(null);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const loadingRef = useRef(false);
  const autoScanInFlightRef = useRef(false);
  const lastAutoScanFingerprintRef = useRef<string | null>(null);
  const lastScanSourceRef = useRef<'manual' | 'auto' | 'demo' | null>(null);

  const liveClientBanner = useMemo(
    () => getLiveClientBanner(liveClientStatus, lastAutoScanFingerprint, loading),
    [lastAutoScanFingerprint, liveClientStatus, loading],
  );

  const loadMemorySummary = useCallback(async () => {
    setMemoryLoading(true);
    try {
      const summary = await RiotService.getMemorySummary();
      setMemorySummary(summary);
    } catch (memoryError) {
      console.error('Error loading memory summary:', memoryError);
    } finally {
      setMemoryLoading(false);
    }
  }, []);

  const runScan = useCallback(async (
    name: string,
    tag: string,
    region: Region,
    options?: { clearExisting?: boolean; source?: 'manual' | 'auto' },
  ) => {
    const clearExisting = options?.clearExisting ?? true;
    const source = options?.source ?? 'manual';

    setLoading(true);
    setError(null);
    if (clearExisting) {
      setCurrentGame(null);
      setRepeatPlayers([]);
      setSelectedRepeatPlayer(null);
    }
    setSearchedUser({ name, tag });

    try {
      const scan = await RiotService.scan(name, tag, region);

      if (!scan.currentGame) {
        setError(`Summoner ${name}#${tag} is currently not in a live game. Make sure you are in a loading screen or game!`);
        return false;
      }

      setCurrentGame(mapScanCurrentGameToCurrentGame(scan.currentGame));
      setRepeatPlayers(scan.repeatPlayers);
      setTrackedProfileId(scan.trackedProfile.id);
      setLastScanSource(source);
      void loadMemorySummary();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred while communicating with the Riot API.');
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadMemorySummary]);

  const handleDemo = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelectedRepeatPlayer(null);

    try {
      const scan = await RiotService.runDemoScan();
      setCurrentGame(mapScanCurrentGameToCurrentGame(scan.currentGame!));
      setRepeatPlayers(scan.repeatPlayers);
      setTrackedProfileId(scan.trackedProfile.id);
      setSearchedUser({
        name: scan.trackedProfile.gameName,
        tag: scan.trackedProfile.tagLine,
      });
      setLastScanSource('demo');
      if (liveClientStatus.sessionFingerprint) {
        lastAutoScanFingerprintRef.current = liveClientStatus.sessionFingerprint;
        setLastAutoScanFingerprint(liveClientStatus.sessionFingerprint);
      }
      await loadMemorySummary();
    } catch (demoError) {
      setError(demoError instanceof Error ? demoError.message : 'Failed to run demo mode.');
    } finally {
      setLoading(false);
    }
  }, [loadMemorySummary]);

  const handleSaveWatchNote = useCallback(async (playerPuuid: string, note: string) => {
    if (!trackedProfileId) {
      throw new Error('No tracked profile is loaded yet.');
    }

    const { note: savedNote } = await RiotService.saveWatchNote(trackedProfileId, playerPuuid, note);

    setRepeatPlayers((existingPlayers) => existingPlayers.map((player) => (
      player.puuid === playerPuuid
        ? { ...player, watchNote: savedNote || null }
        : player
    )));
    setSelectedRepeatPlayer((existingPlayer) => (
      existingPlayer && existingPlayer.puuid === playerPuuid
        ? { ...existingPlayer, watchNote: savedNote || null }
        : existingPlayer
    ));
    await loadMemorySummary();
  }, [loadMemorySummary, trackedProfileId]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    lastAutoScanFingerprintRef.current = lastAutoScanFingerprint;
  }, [lastAutoScanFingerprint]);

  useEffect(() => {
    lastScanSourceRef.current = lastScanSource;
  }, [lastScanSource]);

  const handleSearch = async (name: string, tag: string, region: Region) => {
    const didScan = await runScan(name, tag, region, { clearExisting: true, source: 'manual' });

    if (
      didScan
      && liveClientStatus.canAutoScan
      && liveClientStatus.sessionFingerprint
      && liveClientStatus.matchedProfile?.gameName.toLowerCase() === name.toLowerCase()
      && liveClientStatus.matchedProfile?.tagLine.toLowerCase() === tag.toLowerCase()
    ) {
      lastAutoScanFingerprintRef.current = liveClientStatus.sessionFingerprint;
      setLastAutoScanFingerprint(liveClientStatus.sessionFingerprint);
    }
  };

  useEffect(() => {
    void loadMemorySummary();
  }, [loadMemorySummary]);

  useEffect(() => {
    let cancelled = false;

    const pollLiveClientStatus = async () => {
      try {
        const status = await RiotService.getLiveClientStatus();
        if (cancelled) return;

        setLiveClientStatus(status);

        if (!status.inGame || !status.sessionFingerprint) {
          lastAutoScanFingerprintRef.current = null;
          setLastAutoScanFingerprint(null);
          if (lastScanSourceRef.current === 'auto') {
            setCurrentGame(null);
            setRepeatPlayers([]);
            setSelectedRepeatPlayer(null);
          }
          return;
        }

        if (!status.canAutoScan || !status.matchedProfile || loadingRef.current || autoScanInFlightRef.current) {
          return;
        }

        if (status.sessionFingerprint === lastAutoScanFingerprintRef.current) {
          return;
        }

        autoScanInFlightRef.current = true;
        try {
          const didScan = await runScan(
            status.matchedProfile.gameName,
            status.matchedProfile.tagLine,
            status.matchedProfile.region,
            { clearExisting: false, source: 'auto' },
          );

          if (!cancelled && didScan) {
            lastAutoScanFingerprintRef.current = status.sessionFingerprint;
            setLastAutoScanFingerprint(status.sessionFingerprint);
          }
        } finally {
          autoScanInFlightRef.current = false;
        }
      } catch (pollError) {
        if (cancelled) return;
        console.error('Error polling Live Client status:', pollError);
        setLiveClientStatus(DISCONNECTED_LIVE_CLIENT_STATUS);
      }
    };

    void pollLiveClientStatus();
    const intervalId = window.setInterval(() => {
      void pollLiveClientStatus();
    }, LIVE_CLIENT_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [runScan]);

  const handleInspectRepeatPlayer = (puuid: string) => {
    const player = repeatPlayers.find((candidate) => candidate.puuid === puuid);
    if (player) {
      setSelectedRepeatPlayer(player);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl flex-grow px-4 pb-24">
        <Hero onSearch={handleSearch} onTryDemo={() => void handleDemo()} isLoading={loading} />

        {/* Live client: one line, static indicator, no pulse */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-line py-3">
          <span className={`h-1.5 w-1.5 rounded-full ${liveClientBanner.accentClassName}`} />
          <span className="case-line">Live client</span>
          <span className="text-[13px] text-ink2">
            {liveClientStatus.activePlayer?.riotId && (
              <span className="mr-2 text-ink">{liveClientStatus.activePlayer.riotId}</span>
            )}
            {liveClientBanner.text}
          </span>
        </div>

        {error && (
          <div className="mt-6 flex items-start gap-3 border-l-2 border-alert bg-surface px-4 py-3">
            <AlertIcon size={16} className="mt-0.5 shrink-0 text-alert" />
            <p className="text-[13px] leading-relaxed text-ink2" role="alert">{error}</p>
          </div>
        )}

        {!error && currentGame && (
          <div>
            {lastScanSource === 'demo' && (
              <div className="mt-6 border-l-2 border-accent bg-surface px-4 py-3 text-[13px] leading-relaxed text-ink2">
                You are looking at demo data generated locally, so you can follow the whole flow without a
                Riot API key or a live lobby.
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                <span className="text-[13px] text-ink">
                  Live game · <span className="text-ink2">{currentGame.gameMode}</span>
                </span>
              </div>
              <span className="case-line">Lobby #{currentGame.gameId}</span>
            </div>

            <LobbyTracker
              game={currentGame}
              snipes={repeatPlayers}
              userName={searchedUser?.name || ''}
            />

            <RepeatPlayerBoard
              players={repeatPlayers}
              selectedPlayerPuuid={selectedRepeatPlayer?.puuid ?? null}
              onSelectPlayer={setSelectedRepeatPlayer}
            />

            <SnipeHistory
              snipes={repeatPlayers}
              onInspect={handleInspectRepeatPlayer}
            />
          </div>
        )}

        <MemoryCenter summary={memorySummary} loading={memoryLoading} />

        {!currentGame && !error && !loading && (
          <div className="mt-16 grid gap-x-8 gap-y-6 border-t border-line pt-8 md:grid-cols-3">
            {[
              {
                Icon: BoltIcon,
                title: 'Loading screen check',
                desc: 'Scan the lobby while the game loads. No waiting for match history to update.',
              },
              {
                Icon: BarsIcon,
                title: '100-match depth',
                desc: 'Every lobby participant is checked against your last 100 games.',
              },
              {
                Icon: AlertIcon,
                title: 'Risk scoring',
                desc: 'Win and loss records, repeat frequency, and the patterns worth a second look.',
              },
            ].map(({ Icon, title, desc }) => (
              <div key={title}>
                <Icon size={16} className="text-ink3" />
                <h3 className="mt-3 text-[14px] text-ink">{title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-ink3">{desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-line px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rotate-45 rounded-[2px] border border-ink3" aria-hidden="true" />
            <span className="text-[13px] text-ink3">
              Have I Been <span className="text-line">Sniped?</span>
            </span>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <span className="text-[12px] text-ink3">
              Built by <a href="https://github.com/jasperan" target="_blank" rel="noopener noreferrer" className="text-ink2 underline decoration-line underline-offset-4 transition-colors hover:text-ink">jasperan</a>
            </span>
            <p className="max-w-md text-[11px] leading-relaxed text-ink3">
              Not endorsed by Riot Games. Does not reflect the views of Riot Games or anyone involved in
              producing League of Legends.
            </p>
          </div>
        </div>
      </footer>

      <RepeatPlayerDetail
        player={selectedRepeatPlayer}
        trackedProfileId={trackedProfileId}
        onClose={() => setSelectedRepeatPlayer(null)}
        onSaveWatchNote={handleSaveWatchNote}
      />
    </div>
  );
};

export default App;
