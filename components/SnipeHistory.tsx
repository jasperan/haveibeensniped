import React from 'react';
import { RepeatPlayer } from '../types';
import { getChampIcon, CHAMPION_MAP } from '../constants';

interface SnipeHistoryProps {
  snipes: RepeatPlayer[];
  onInspect?: (puuid: string) => void;
}

const SnipeHistory: React.FC<SnipeHistoryProps> = ({ snipes, onInspect }) => {
  const snipesWithMatches = snipes.filter((snipe) => snipe.matches.length > 0);

  if (snipesWithMatches.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="flex flex-col gap-2 border-b border-line pb-3 md:flex-row md:items-baseline md:justify-between">
        <div>
          <h2 className="text-[15px] font-medium text-ink">Recent shared matches</h2>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink3">
            The match-by-match view. The repeat-player board has the risk reasons and the evidence panel.
          </p>
        </div>
      </div>

      <div className="grid gap-4 pt-4 md:grid-cols-2">
        {snipesWithMatches.map((snipe) => (
          <div key={snipe.puuid} className="panel overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-line p-4">
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={getChampIcon(snipe.championId)}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded border border-line bg-raised object-cover"
                />
                <div className="min-w-0">
                  <h3 className="truncate text-[14px] text-ink">{snipe.gameName}</h3>
                  <p className="mt-0.5 truncate text-[11px] text-ink3">
                    Now on {CHAMPION_MAP[snipe.championId] || 'an unknown champion'}
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono text-[13px] tabular-nums text-ink">
                  {snipe.wins}W/{snipe.losses}L
                </div>
                <div className="mt-1 case-line">{snipe.totalGames} matches</div>
                {onInspect && (
                  <button
                    type="button"
                    onClick={() => onInspect(snipe.puuid)}
                    className="mt-2 text-[11px] text-ink3 transition-colors hover:text-ink"
                  >
                    Open evidence
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-line">
              {snipe.matches.map((match) => (
                <div key={match.matchId} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex -space-x-2">
                      <img
                        src={getChampIcon(match.playerChampId)}
                        className="h-6 w-6 rounded border border-surface bg-raised"
                        alt=""
                        title="Your champion"
                      />
                      <img
                        src={getChampIcon(match.targetChampId)}
                        className="h-6 w-6 rounded border border-surface bg-raised"
                        alt=""
                        title="Their champion"
                      />
                    </div>
                    <span className="text-[12px] text-ink2">
                      {match.team === 'with' ? 'Ally game' : 'Enemy game'}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    <span className="case-line">{new Date(match.timestamp).toLocaleDateString()}</span>
                    <span className={`text-[12px] ${match.win ? 'text-positive' : 'text-alert'}`}>
                      {match.win ? 'Win' : 'Loss'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default SnipeHistory;
