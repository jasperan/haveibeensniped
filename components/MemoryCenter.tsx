import React from 'react';
import { MemorySummary } from '../types';

interface MemoryCenterProps {
  summary: MemorySummary | null;
  loading: boolean;
}

const MemoryCenter: React.FC<MemoryCenterProps> = ({ summary, loading }) => {
  if (loading && !summary) {
    return (
      <section data-testid="memory-center" className="mt-16 px-4">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="h-7 w-48 rounded-lg bg-zinc-800/60 animate-pulse"></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-card rounded-3xl border border-zinc-800/70 p-5 space-y-3">
                <div className="h-3 w-24 rounded bg-zinc-800/60 animate-pulse"></div>
                <div className="h-8 w-16 rounded bg-zinc-800/40 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!summary) {
    return null;
  }

  const statCards = [
    { label: 'Tracked profiles', value: summary.stats.trackedProfileCount },
    { label: 'Saved scans', value: summary.stats.scanCount },
    { label: 'Shared encounters', value: summary.stats.encounterCount },
    { label: 'Repeat players', value: summary.stats.repeatPlayerCount },
  ];

  return (
    <section data-testid="memory-center" className="mt-16 px-4">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold tracking-tight">MEMORY CENTER</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-zinc-800 to-transparent"></div>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-500">
              Your local SQLite history survives beyond a single lobby. Demo scans also land here,
              so you can verify the product before using a real Riot session.
            </p>
          </div>
          {summary.stats.highAttentionCount > 0 && (
            <div className="rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-rose-300">
              {summary.stats.highAttentionCount} high-attention patterns
            </div>
          )}
          {summary.stats.watchNoteCount > 0 && (
            <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
              {summary.stats.watchNoteCount} watch note{summary.stats.watchNoteCount === 1 ? '' : 's'}
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <div key={card.label} className="glass-card rounded-3xl border border-zinc-800/70 p-5">
              <div className="text-2xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                {card.label}
              </div>
              <div className="mt-3 text-3xl font-black text-zinc-100">{card.value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="glass-card rounded-3xl border border-zinc-800/70 p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-400">
                Top repeat players
              </h3>
              <span className="text-xs font-semibold text-zinc-500">
                {summary.topRepeatPlayers.length} shown
              </span>
            </div>

            {summary.topRepeatPlayers.length > 0 ? (
              <div className="mt-4 space-y-3">
                {summary.topRepeatPlayers.map((player) => (
                  <div key={`${player.trackedProfileId}:${player.puuid}`} className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-lg font-bold text-zinc-100">
                          {player.gameName}
                          <span className="ml-2 text-xs font-mono text-zinc-500">#{player.tagLine}</span>
                        </div>
                        <div className="mt-2 text-2xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                          tracked under {player.trackedProfileName}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-indigo-300">{player.risk.score}</div>
                        <div className="text-2xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                          {player.risk.tier}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-2xs font-bold uppercase tracking-[0.2em]">
                      <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-zinc-400">
                        {player.totalGames} shared games
                      </span>
                      {player.watchNote && (
                        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-amber-300">
                          watch note saved
                        </span>
                      )}
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-zinc-300">
                      {player.watchNote || player.risk.reasons[0] || 'Saved from local memory'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 p-5 text-sm text-zinc-500">
                No local repeat-player history yet. Run a manual scan or the built-in demo.
              </div>
            )}
          </div>

          <div className="glass-card rounded-3xl border border-zinc-800/70 p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-400">
                Recent scans
              </h3>
              <span className="text-xs font-semibold text-zinc-500">
                {summary.recentScans.length} shown
              </span>
            </div>

            {summary.recentScans.length > 0 ? (
              <div className="mt-4 space-y-3">
                {summary.recentScans.map((scan) => (
                  <div key={scan.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-zinc-100">
                          {scan.trackedProfile.gameName}
                          <span className="ml-2 text-xs font-mono text-zinc-500">#{scan.trackedProfile.tagLine}</span>
                        </div>
                        <div className="mt-2 text-2xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                          {scan.source} · {scan.region} · {scan.status}
                        </div>
                      </div>
                      <div className="text-right text-xs text-zinc-500">
                        <div>{new Date(scan.createdAt).toLocaleString()}</div>
                        <div className="mt-2 font-semibold text-zinc-400">
                          {scan.encounterCount} overlap{scan.encounterCount === 1 ? '' : 's'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 p-5 text-sm text-zinc-500">
                Recent scans will appear here after your first run.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MemoryCenter;
