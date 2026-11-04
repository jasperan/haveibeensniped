import React from 'react';
import { CHAMPION_MAP, getChampIcon } from '../constants';
import { RepeatPlayer, RiskTier } from '../types';

interface RepeatPlayerBoardProps {
  players: RepeatPlayer[];
  onSelectPlayer: (player: RepeatPlayer) => void;
  selectedPlayerPuuid?: string | null;
}

/* The tier carries the only red on the screen, and only when it is a charge. */
const TIER: Record<RiskTier, { label: string; tone: 'muted' | 'charge' }> = {
  background: { label: 'Background', tone: 'muted' },
  repeat: { label: 'Repeat', tone: 'muted' },
  watch: { label: 'Watch', tone: 'muted' },
  'high-attention': { label: 'High attention', tone: 'charge' },
};

const relationLabel = (relation: RepeatPlayer['relation']) => {
  if (relation === 'enemy') return 'Enemy side now';
  if (relation === 'ally') return 'Ally side now';
  return 'Side unresolved';
};

const RepeatPlayerBoard: React.FC<RepeatPlayerBoardProps> = ({
  players,
  onSelectPlayer,
  selectedPlayerPuuid,
}) => {
  if (players.length === 0) return null;

  const watchCount = players.filter((player) => (
    player.risk.tier === 'watch' || player.risk.tier === 'high-attention'
  )).length;

  return (
    <section className="mt-12">
      <div className="flex flex-col gap-2 border-b border-line pb-3 md:flex-row md:items-baseline md:justify-between">
        <div>
          <h2 className="text-[15px] font-medium text-ink">Repeat players</h2>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink3">
            Local encounter memory says these lobby players keep showing up. Open an entry for the
            evidence we have right now.
          </p>
        </div>
        <div className="flex items-center gap-4 case-line">
          <span>{players.length} in this lobby</span>
          {watchCount > 0 && <span className="text-alert">{watchCount} on watch</span>}
        </div>
      </div>

      <div className="grid gap-3 pt-4 md:grid-cols-2 xl:grid-cols-3">
        {players.map((player) => {
          const tier = TIER[player.risk.tier];
          const selected = selectedPlayerPuuid === player.puuid;
          const reasonPreview = player.watchNote || player.risk.reasons[0] || 'Flagged from saved encounter memory';
          const extraReasonCount = Math.max(player.risk.reasons.length - 1, 0);

          return (
            <button
              key={player.puuid}
              type="button"
              onClick={() => onSelectPlayer(player)}
              aria-pressed={selected}
              className={`text-left rounded-xl border p-4 transition-colors ${
                selected
                  ? 'border-accent bg-raised'
                  : 'border-line bg-surface hover:border-ink3'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <img
                    src={getChampIcon(player.championId)}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded border border-line bg-raised object-cover"
                  />
                  <div className="min-w-0">
                    <h3 className="truncate text-[14px] text-ink">{player.gameName}</h3>
                    <p className="truncate text-[11px] text-ink3">
                      <span className="font-mono">#{player.tagLine}</span>
                      <span> · {CHAMPION_MAP[player.championId] || 'Unknown champion'}</span>
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className={`font-mono text-2xl tabular-nums leading-none ${
                    tier.tone === 'charge' ? 'text-alert' : 'text-ink'
                  }`}>
                    {player.risk.score}
                  </div>
                </div>
              </div>

              {/* One graded bar: the figure it belongs to, nothing else */}
              <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-line">
                <div
                  className={`h-full rounded-full ${tier.tone === 'charge' ? 'bg-alert' : 'bg-ink2'}`}
                  style={{ width: `${Math.min(Math.max(player.risk.score, 0), 100)}%` }}
                />
              </div>

              <div className="mt-3 case-line truncate">
                {player.region} · {player.totalGames} matches · {player.wins}W/{player.losses}L
              </div>

              <p className="mt-2 line-clamp-2 min-h-10 text-[13px] leading-relaxed text-ink2">
                {reasonPreview}
              </p>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink3">
                  <span className={tier.tone === 'charge' ? 'text-alert' : ''}>{tier.label}</span>
                  <span>{relationLabel(player.relation)}</span>
                  {player.watchNote && <span>note saved</span>}
                </div>
                <span className="shrink-0 text-[11px] text-ink3">
                  {player.watchNote
                    ? 'Open note'
                    : extraReasonCount > 0
                      ? `+${extraReasonCount} more`
                      : 'Evidence'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default RepeatPlayerBoard;
