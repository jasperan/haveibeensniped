
import React from 'react';
import { SnipedPlayer } from '../types';
import { getChampIcon, CHAMPION_MAP } from '../constants';

interface SnipeHistoryProps {
  snipes: SnipedPlayer[];
}

const SnipeHistory: React.FC<SnipeHistoryProps> = ({ snipes }) => {
  if (snipes.length === 0) return null;

  return (
    <div className="mt-16 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight">ENCOUNTER DETAILS</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-zinc-800 to-transparent"></div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        {snipes.map(snipe => (
          <div key={snipe.puuid} className="glass-card rounded-2xl overflow-hidden border-zinc-700/50">
            <div className="p-5 bg-gradient-to-br from-zinc-800/80 to-zinc-900/40 border-b border-zinc-700/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={getChampIcon(snipe.championId)} className="w-10 h-10 rounded-lg" alt="champ" />
                <div>
                  <h3 className="font-bold text-lg">{snipe.summonerName}</h3>
                  <p className="text-xs text-zinc-500 font-medium">Currently playing {CHAMPION_MAP[snipe.championId]}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-emerald-500">{snipe.wins}W - {snipe.losses}L</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Overall Record</div>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              {snipe.matches.map(m => (
                <div key={m.matchId} className="flex items-center justify-between bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-3">
                      <img src={getChampIcon(m.playerChampId)} className="w-8 h-8 rounded-full border-2 border-zinc-900" title="Your Champ" />
                      <img src={getChampIcon(m.targetChampId)} className="w-8 h-8 rounded-full border-2 border-zinc-900" title="Their Champ" />
                    </div>
                    <div>
                      <span className={`text-xs font-bold uppercase tracking-widest ${m.team === 'with' ? 'text-blue-400' : 'text-orange-400'}`}>
                        {m.team === 'with' ? 'Ally' : 'Enemy'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-[10px] text-zinc-600 font-bold uppercase">
                      {new Date(m.timestamp).toLocaleDateString()}
                    </div>
                    <div className={`text-xs font-black uppercase px-2 py-1 rounded ${m.win ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {m.win ? 'Win' : 'Loss'}
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
