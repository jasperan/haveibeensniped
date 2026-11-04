import React from 'react';
import { MemorySummary } from '../types';

interface MemoryCenterProps {
  summary: MemorySummary | null;
  loading: boolean;
}

const MemoryCenter: React.FC<MemoryCenterProps> = ({ summary, loading }) => {
  if (loading && !summary) {
    return (
      <section data-testid="memory-center" className="mt-12">
        <div className="space-y-6">
          <div className="h-4 w-40 rounded bg-line/60 animate-pulse" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="panel space-y-3 p-4">
                <div className="h-2.5 w-24 rounded bg-line/60 animate-pulse" />
                <div className="h-6 w-12 rounded bg-line/40 animate-pulse" />
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
    <section data-testid="memory-center" className="mt-16">
      <div className="space-y-6">
        <div className="flex flex-col gap-2 border-b border-line pb-3 md:flex-row md:items-baseline md:justify-between">
          <div>
            <h2 className="text-[15px] font-medium text-ink">Memory center</h2>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink3">
              Your local SQLite history survives a single lobby. Demo scans land here too, so you can
              verify the product before using a real Riot session.
            </p>
          </div>
          <div className="flex items-center gap-4 case-line">
            {summary.stats.highAttentionCount > 0 && (
              <span className="text-alert">{summary.stats.highAttentionCount} high attention</span>
            )}
            {summary.stats.watchNoteCount > 0 && (
              <span>{summary.stats.watchNoteCount} notes</span>
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <div key={card.label} className="panel p-4">
              <div className="text-[11px] text-ink3">{card.label}</div>
              <div className="mt-2 font-mono text-2xl tabular-nums text-ink">{card.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr),minmax(0,0.9fr)]">
          <div className="panel p-5">
            <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2">
              <h3 className="text-[13px] text-ink">Top repeat players</h3>
              <span className="case-line">{summary.topRepeatPlayers.length} shown</span>
            </div>

            {summary.topRepeatPlayers.length > 0 ? (
              <div className="mt-1">
                {summary.topRepeatPlayers.map((player) => (
                  <div
                    key={`${player.trackedProfileId}:${player.puuid}`}
                    className="border-b border-line py-3 last:border-0"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-[13px] text-ink">
                          {player.gameName}
                          <span className="ml-1.5 font-mono text-[11px] text-ink3">#{player.tagLine}</span>
                        </div>
                        <div className="mt-1 case-line truncate">
                          {player.totalGames} shared games · under {player.trackedProfileName}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-mono text-lg tabular-nums text-ink">{player.risk.score}</div>
                        <div className="text-[11px] text-ink3">{player.risk.tier}</div>
                      </div>
                    </div>

                    <p className="mt-2 text-[13px] leading-relaxed text-ink2">
                      {player.watchNote || player.risk.reasons[0] || 'Saved from local memory'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 border border-dashed border-line p-4 text-[13px] text-ink3">
                No local repeat-player history yet. Run a manual scan or the built-in demo.
              </div>
            )}
          </div>

          <div className="panel p-5">
            <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2">
              <h3 className="text-[13px] text-ink">Recent scans</h3>
              <span className="case-line">{summary.recentScans.length} shown</span>
            </div>

            {summary.recentScans.length > 0 ? (
              <div className="mt-1">
                {summary.recentScans.map((scan) => (
                  <div key={scan.id} className="border-b border-line py-3 last:border-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-[13px] text-ink">
                          {scan.trackedProfile.gameName}
                          <span className="ml-1.5 font-mono text-[11px] text-ink3">#{scan.trackedProfile.tagLine}</span>
                        </div>
                        <div className="mt-1 case-line truncate">
                          {scan.source} · {scan.region} · {scan.status}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="case-line">{new Date(scan.createdAt).toLocaleString()}</div>
                        <div className="mt-1 text-[11px] text-ink3">
                          {scan.encounterCount} overlap{scan.encounterCount === 1 ? '' : 's'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 border border-dashed border-line p-4 text-[13px] text-ink3">
                Recent scans will appear here after the first run.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MemoryCenter;
