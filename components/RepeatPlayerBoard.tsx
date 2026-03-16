import React from 'react';
import { CHAMPION_MAP, getChampIcon } from '../constants';
import { RepeatPlayer, RiskTier } from '../types';

interface RepeatPlayerBoardProps {
  players: RepeatPlayer[];
  onSelectPlayer: (player: RepeatPlayer) => void;
  selectedPlayerPuuid?: string | null;
}

const TIER_STYLES: Record<RiskTier, {
  label: string;
  badgeClassName: string;
  scoreClassName: string;
}> = {
  background: {
    label: 'Background',
    badgeClassName: 'bg-zinc-800 text-zinc-300 border border-zinc-700/70',
    scoreClassName: 'text-zinc-300',
  },
  repeat: {
    label: 'Repeat',
    badgeClassName: 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30',
    scoreClassName: 'text-indigo-300',
  },
  watch: {
    label: 'Watch',
    badgeClassName: 'bg-amber-500/10 text-amber-300 border border-amber-500/30',
    scoreClassName: 'text-amber-300',
  },
  'high-attention': {
    label: 'High Attention',
    badgeClassName: 'bg-rose-500/10 text-rose-300 border border-rose-500/30',
    scoreClassName: 'text-rose-300',
  },
};

const getRelationPresentation = (relation: RepeatPlayer['relation']) => {
  if (relation === 'enemy') {
    return {
      badgeClassName: 'bg-rose-500/10 text-rose-300 border border-rose-500/20',
      label: 'Enemy side now',
    };
  }

  if (relation === 'ally') {
    return {
      badgeClassName: 'bg-blue-500/10 text-blue-300 border border-blue-500/20',
      label: 'Ally side now',
    };
  }

  return {
    badgeClassName: 'bg-zinc-800 text-zinc-300 border border-zinc-700/70',
    label: 'Side unresolved',
  };
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
    <section className="mt-16 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold tracking-tight">REPEAT-PLAYER BOARD</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-zinc-800 to-transparent"></div>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-500">
            Local encounter memory says these lobby players keep showing up. Open any card for the
            evidence we have right now.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
          <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-2">
            {players.length} repeats
          </span>
          {watchCount > 0 && (
            <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-indigo-300">
              {watchCount} on watch
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {players.map((player) => {
          const tierStyle = TIER_STYLES[player.risk.tier];
          const relation = getRelationPresentation(player.relation);
          const reasonPreview = player.risk.reasons[0] || 'Flagged from saved encounter memory';
          const extraReasonCount = Math.max(player.risk.reasons.length - 1, 0);

          return (
            <button
              key={player.puuid}
              type="button"
              onClick={() => onSelectPlayer(player)}
              className={`glass-card rounded-3xl border p-5 text-left transition-all ${
                selectedPlayerPuuid === player.puuid
                  ? 'border-indigo-500 shadow-[0_0_25px_-10px_rgba(99,102,241,0.8)]'
                  : 'border-zinc-800/70 hover:-translate-y-1 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <img
                    src={getChampIcon(player.championId)}
                    alt={`${player.gameName} champion`}
                    className="h-14 w-14 rounded-2xl border border-zinc-700/80 bg-zinc-900 object-cover"
                  />
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-bold text-zinc-100">{player.gameName}</h3>
                    <p className="truncate text-xs font-mono text-zinc-500">#{player.tagLine}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {CHAMPION_MAP[player.championId] || 'Unknown champion'}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className={`text-3xl font-black leading-none ${tierStyle.scoreClassName}`}>
                    {player.risk.score}
                  </div>
                  <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${tierStyle.badgeClassName}`}>
                    {tierStyle.label}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                    Shared matches
                  </div>
                  <div className="mt-2 text-xl font-bold text-zinc-100">{player.totalGames}</div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                    Record
                  </div>
                  <div className="mt-2 text-xl font-bold text-zinc-100">
                    {player.wins}W <span className="text-zinc-600">/</span> {player.losses}L
                  </div>
                </div>
              </div>

              <p className="mt-4 min-h-[3.75rem] text-sm leading-relaxed text-zinc-300">
                {reasonPreview}
              </p>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${relation.badgeClassName}`}>
                  {relation.label}
                </span>
                <span className="text-xs font-semibold text-zinc-500">
                  {extraReasonCount > 0
                    ? `+${extraReasonCount} more reason${extraReasonCount === 1 ? '' : 's'}`
                    : 'Open evidence'}
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
