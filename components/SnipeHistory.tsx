import React from 'react';
import { SnipedPlayer } from '../types';
import { getChampIcon, CHAMPION_MAP } from '../constants';

interface SnipeHistoryProps {
  snipes: SnipedPlayer[];
  onInspect?: (puuid: string) => void;
}

const SnipeHistory: React.FC<SnipeHistoryProps> = ({ snipes, onInspect }) => {
  const snipesWithMatches = snipes.filter((snipe) => snipe.matches.length > 0);

  if (snipesWithMatches.length === 0) return null;

  return (
    <div className="mt-16 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold tracking-tight">RECENT SHARED MATCHES</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-zinc-800 to-transparent"></div>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-500">
          This stays as the quick match-by-match view. Use the repeat-player board for risk reasons
          and the full evidence panel.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {snipesWithMatches.map((snipe) => (
          <div key={snipe.puuid} className="glass-card rounded-2xl overflow-hidden border-zinc-700/50">
            <div className="p-5 bg-gradient-to-br from-zinc-800/80 to-zinc-900/40 border-b border-zinc-700/50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <img src={getChampIcon(snipe.championId)} className="w-10 h-10 rounded-lg" alt="champ" />
                <div className="min-w-0">
                  <h3 className="font-bold text-lg truncate">{snipe.summonerName}</h3>
                  <p className="text-xs text-zinc-500 font-medium truncate">
                    Currently playing {CHAMPION_MAP[snipe.championId] || 'Unknown champion'}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-emerald-500">{snipe.wins}W - {snipe.losses}L</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Overall Record</div>
                {onInspect && (
                  <button
                    type="button"
                    onClick={() => onInspect(snipe.puuid)}
                    className="mt-3 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300 transition-colors hover:border-indigo-400/50 hover:text-indigo-200"
                  >
                    Open evidence
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 space-y-3">
              {snipe.matches.map((match) => (
                <div key={match.matchId} className="flex items-center justify-between gap-4 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex -space-x-3">
                      <img src={getChampIcon(match.playerChampId)} className="w-8 h-8 rounded-full border-2 border-zinc-900" title="Your Champ" />
                      <img src={getChampIcon(match.targetChampId)} className="w-8 h-8 rounded-full border-2 border-zinc-900" title="Their Champ" />
                    </div>
                    <div>
                      <span className={`text-xs font-bold uppercase tracking-widest ${match.team === 'with' ? 'text-blue-400' : 'text-orange-400'}`}>
                        {match.team === 'with' ? 'Ally' : 'Enemy'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-[10px] text-zinc-600 font-bold uppercase">
                      {new Date(match.timestamp).toLocaleDateString()}
                    </div>
                    <div className={`text-xs font-black uppercase px-2 py-1 rounded ${match.win ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {match.win ? 'Win' : 'Loss'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SnipeHistory;
