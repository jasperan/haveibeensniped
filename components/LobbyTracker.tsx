
import React from 'react';
import { CurrentGame, SnipedPlayer, Player } from '../types';
import { getChampIcon, CHAMPION_MAP } from '../constants';

interface LobbyTrackerProps {
  game: CurrentGame;
  snipes: SnipedPlayer[];
  userName: string;
}

// Define props for PlayerCard
interface PlayerCardProps {
  player: Player;
  snipe?: SnipedPlayer;
  isUser: boolean;
}

// Moved PlayerCard outside of the main component to resolve TS 'key' prop errors and improve rendering performance
const PlayerCard: React.FC<PlayerCardProps> = ({ player, snipe, isUser }) => {
  return (
    <div className={`p-4 rounded-xl border flex items-center justify-between transition-all group ${
      snipe 
        ? 'bg-indigo-500/10 border-indigo-500 shadow-[0_0_15px_-3px_rgba(99,102,241,0.3)]' 
        : 'bg-zinc-900/50 border-zinc-800'
    } ${isUser ? 'border-zinc-500' : ''}`}>
      <div className="flex items-center gap-4">
        <div className="relative">
          <img src={getChampIcon(player.championId)} alt="champ" className="w-12 h-12 rounded-lg border border-zinc-700" />
          {snipe && (
            <div className="absolute -top-2 -right-2 bg-indigo-500 text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
              Sniped
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={`font-bold ${isUser ? 'text-zinc-100' : 'text-zinc-300'}`}>
              {player.summonerName}
            </span>
            <span className="text-zinc-600 text-xs font-mono">#{player.tagLine}</span>
          </div>
          <div className="text-xs text-zinc-500 font-medium">
            {CHAMPION_MAP[player.championId] || 'Unknown Champion'}
          </div>
        </div>
      </div>
      
      {snipe ? (
        <div className="text-right">
          <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Found in History</div>
          <div className="flex items-center gap-2 justify-end">
            <span className="text-sm font-bold text-zinc-200">{snipe.totalGames} Games</span>
            <div className="flex gap-1 h-1.5 w-16 bg-zinc-800 rounded-full overflow-hidden">
              <div style={{ width: `${(snipe.wins / snipe.totalGames) * 100}%` }} className="bg-emerald-500 h-full" />
              <div style={{ width: `${(snipe.losses / snipe.totalGames) * 100}%` }} className="bg-rose-500 h-full" />
            </div>
          </div>
        </div>
      ) : (
        <div className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Fresh Soul</div>
      )}
    </div>
  );
};

const LobbyTracker: React.FC<LobbyTrackerProps> = ({ game, snipes, userName }) => {
  const blueTeam = game.participants.filter(p => p.teamId === 100);
  const redTeam = game.participants.filter(p => p.teamId === 200);

  return (
    <div className="grid lg:grid-cols-2 gap-12 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Blue Team */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4 border-b border-blue-900/30 pb-2">
          <h2 className="text-blue-400 font-black text-xl italic uppercase tracking-tighter flex items-center gap-2">
            <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
            Blue Team
          </h2>
          <span className="text-zinc-600 text-xs font-bold">ALLIES</span>
        </div>
        <div className="space-y-3">
          {blueTeam.map(p => (
            <PlayerCard 
              key={p.puuid} 
              player={p} 
              snipe={snipes.find(s => s.puuid === p.puuid)}
              isUser={p.summonerName.toLowerCase() === userName.toLowerCase()}
            />
          ))}
        </div>
      </div>

      {/* Red Team */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4 border-b border-rose-900/30 pb-2">
          <h2 className="text-rose-400 font-black text-xl italic uppercase tracking-tighter flex items-center gap-2">
            <div className="w-2 h-6 bg-rose-500 rounded-full"></div>
            Red Team
          </h2>
          <span className="text-zinc-600 text-xs font-bold">OPPONENTS</span>
        </div>
        <div className="space-y-3">
          {redTeam.map(p => (
            <PlayerCard 
              key={p.puuid} 
              player={p} 
              snipe={snipes.find(s => s.puuid === p.puuid)}
              isUser={p.summonerName.toLowerCase() === userName.toLowerCase()}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LobbyTracker;
