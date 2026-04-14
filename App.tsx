import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import LobbyTracker from './components/LobbyTracker';
import MemoryCenter from './components/MemoryCenter';
import RepeatPlayerBoard from './components/RepeatPlayerBoard';
import RepeatPlayerDetail from './components/RepeatPlayerDetail';
import SnipeHistory from './components/SnipeHistory';
import {
  RiotService,
  mapRepeatPlayersToSnipedPlayers,
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
      accentClassName: 'bg-zinc-500',
      badgeClassName: 'border-zinc-700 bg-zinc-900 text-zinc-300',
      text: 'Live Client offline on this machine.',
    };
  }

  if (!liveClientStatus.inGame) {
    return {
      accentClassName: 'bg-emerald-500',
      badgeClassName: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      text: 'Live Client connected. Waiting for a game.',
    };
  }

  const riotId = liveClientStatus.activePlayer?.riotId || 'Unknown player';

  if (!liveClientStatus.matchedProfile) {
    return {
      accentClassName: 'bg-amber-500',
      badgeClassName: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
      text: `Found local player ${riotId}, but no saved tracked profile exists yet. Run one manual scan first.`,
    };
  }

  if (loading && liveClientStatus.canAutoScan && liveClientStatus.sessionFingerprint !== lastAutoScanFingerprint) {
    return {
      accentClassName: 'bg-indigo-500',
      badgeClassName: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
      text: `Auto-scanning the current session for ${riotId}.`,
    };
  }

  if (liveClientStatus.canAutoScan && liveClientStatus.sessionFingerprint === lastAutoScanFingerprint) {
    return {
      accentClassName: 'bg-indigo-500',
      badgeClassName: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
      text: `Auto-scanned current session for ${riotId}.`,
    };
  }

  if (liveClientStatus.canAutoScan) {
    return {
      accentClassName: 'bg-emerald-500',
      badgeClassName: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      text: `Auto-scan ready for ${riotId}.`,
    };
  }

  return {
    accentClassName: 'bg-zinc-500',
    badgeClassName: 'border-zinc-700 bg-zinc-900 text-zinc-300',
    text: 'Live Client connected.',
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

  const snipedPlayers = useMemo(
    () => mapRepeatPlayersToSnipedPlayers(repeatPlayers),
    [repeatPlayers],
  );

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
    <div className="min-h-screen league-gradient flex flex-col">
      <Navbar />

      <main className="max-w-7xl mx-auto pb-24 relative flex-grow">
        {/* Background decorations — single-hue indigo */}
        <div className="absolute top-0 right-0 -z-10 w-[500px] h-[500px] bg-indigo-600/8 blur-[140px] rounded-full"></div>
        <div className="absolute top-60 left-0 -z-10 w-[350px] h-[350px] bg-indigo-800/6 blur-[120px] rounded-full"></div>

        <Hero onSearch={handleSearch} onTryDemo={() => void handleDemo()} isLoading={loading} />

        <div className="px-4 mb-8">
          <div className="mx-auto max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className={`mt-1.5 h-3 w-3 rounded-full ${liveClientBanner.accentClassName}`}></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full border px-3 py-1 text-2xs font-bold uppercase tracking-[0.2em] ${liveClientBanner.badgeClassName}`}>
                    Live Client
                  </span>
                  {liveClientStatus.activePlayer?.riotId && (
                    <span className="text-2xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                      {liveClientStatus.activePlayer.riotId}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                  {liveClientBanner.text}
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="max-w-3xl mx-auto px-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-rose-500/10 border border-rose-500/50 p-6 rounded-2xl flex items-center gap-4 text-rose-200">
              <svg className="w-8 h-8 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              <div className="font-medium">{error}</div>
            </div>
          </div>
        )}

        {!error && currentGame && (
          <div className="px-4">
            {lastScanSource === 'demo' && (
              <div className="max-w-3xl mx-auto mb-6 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-sm leading-relaxed text-indigo-200">
                You are viewing demo data generated locally so you can test the full product flow without
                a real Riot API key or live lobby.
              </div>
            )}
            <div className="max-w-2xl mx-auto bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between mb-8 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                <div className="text-sm font-bold text-zinc-300 uppercase tracking-widest">
                  Live Game Detected: <span className="text-indigo-400">{currentGame.gameMode}</span>
                </div>
              </div>
              <div className="text-xs font-mono text-zinc-500">
                LOBBY ID: #{currentGame.gameId}
              </div>
            </div>

            <LobbyTracker
              game={currentGame}
              snipes={snipedPlayers}
              userName={searchedUser?.name || ''}
            />

            <RepeatPlayerBoard
              players={repeatPlayers}
              selectedPlayerPuuid={selectedRepeatPlayer?.puuid ?? null}
              onSelectPlayer={setSelectedRepeatPlayer}
            />

            <SnipeHistory
              snipes={snipedPlayers}
              onInspect={handleInspectRepeatPlayer}
            />
          </div>
        )}

        <MemoryCenter summary={memorySummary} loading={memoryLoading} />

        {!currentGame && !error && !loading && (
          <div className="px-4 max-w-4xl mx-auto mt-16 space-y-4">
            {[
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />,
                title: 'Loading screen check',
                desc: 'Scan your lobby while the game loads. No waiting for match history to update.',
              },
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
                title: '100-match depth',
                desc: 'Cross-references every lobby participant against your last 100 games.',
              },
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
                title: 'Risk scoring',
                desc: 'Tracks win/loss records, repeat frequency, and flags suspicious patterns automatically.',
              },
            ].map((feature) => (
              <div key={feature.title} className="glass-card rounded-2xl border-zinc-800/40 p-5 flex items-start gap-5 transition-colors hover:border-zinc-700/60 group">
                <div className="w-10 h-10 shrink-0 bg-indigo-600/15 rounded-xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600/25 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{feature.icon}</svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">{feature.title}</h3>
                  <p className="mt-1 text-sm text-zinc-500 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="py-10 px-4 border-t border-zinc-800/40">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-zinc-800 rounded flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-zinc-500 rounded-sm rotate-45"></div>
              </div>
              <span className="font-semibold text-sm text-zinc-500 tracking-tight">
                HAVEIBEEN<span className="text-zinc-600">SNIPED</span>
              </span>
            </div>
            <div className="flex flex-col items-center md:items-end gap-2">
              <div className="text-zinc-500 text-sm">
                Built by <a href="https://github.com/jasperan" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 transition-colors">jasperan</a>
              </div>
              <p className="text-zinc-600 text-2xs max-w-md text-center md:text-right font-medium">
                Not endorsed by Riot Games. Doesn't reflect the views of Riot Games or anyone involved in producing League of Legends.
              </p>
            </div>
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
