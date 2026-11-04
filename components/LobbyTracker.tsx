import React from 'react';
import { CurrentGame, RepeatPlayer, Player } from '../types';
import { getChampIcon, CHAMPION_MAP } from '../constants';

interface LobbyTrackerProps {
  game: CurrentGame;
  snipes: RepeatPlayer[];
  userName: string;
}

interface PlayerCardProps {
  player: Player;
  snipe?: RepeatPlayer;
  isUser: boolean;
}

/* One row per participant. The case line under the name is the signature:
   region · shared matches · record, in mono, aligned in one column. */
const PlayerCard: React.FC<PlayerCardProps> = ({ player, snipe, isUser }) => (
  <div className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-0">
    <div className="flex min-w-0 items-center gap-3">
      <img
        src={getChampIcon(player.championId)}
        alt=""
        className="h-9 w-9 shrink-0 rounded border border-line bg-raised object-cover"
      />
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className={`truncate text-[13px] ${isUser ? 'text-ink' : 'text-ink2'}`}>
            {player.summonerName}
          </span>
          <span className="font-mono text-[11px] text-ink3">#{player.tagLine}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-[11px] text-ink3">
            {CHAMPION_MAP[player.championId] || 'Unknown champion'}
          </span>
          {snipe && (
            <span className="case-line">
              · {snipe.totalGames} matches · {snipe.wins}W/{snipe.losses}L
            </span>
          )}
        </div>
      </div>
    </div>

    {snipe ? (
      <span className={`shrink-0 font-mono text-[11px] tabular-nums ${
        snipe.risk.tier === 'high-attention' ? 'text-alert' : 'text-ink2'
      }`}>
        {snipe.risk.score}
      </span>
    ) : (
      <span className="shrink-0 text-[11px] text-ink3">no prior matches</span>
    )}
  </div>
);

const TeamColumn = ({
  label,
  side,
  players,
  snipes,
  userName,
}: {
  label: string;
  side: 'blue' | 'red';
  players: Player[];
  snipes: RepeatPlayer[];
  userName: string;
}) => (
  <div>
    <div className="flex items-baseline justify-between border-b border-line pb-2">
      <h2 className="flex items-center gap-2 text-[13px] text-ink">
        <span className={`h-1.5 w-1.5 rounded-full ${side === 'blue' ? 'bg-ink2' : 'bg-alert'}`} />
        {label}
      </h2>
      <span className="case-line">{players.length} players</span>
    </div>
    <div>
      {players.map((p) => (
        <PlayerCard
          key={p.puuid}
          player={p}
          snipe={snipes.find(s => s.puuid === p.puuid)}
          isUser={p.summonerName.toLowerCase() === userName.toLowerCase()}
        />
      ))}
    </div>
  </div>
);

const LobbyTracker: React.FC<LobbyTrackerProps> = ({ game, snipes, userName }) => {
  const blueTeam = game.participants.filter(p => p.teamId === 100);
  const redTeam = game.participants.filter(p => p.teamId === 200);

  return (
    <div className="mt-8 grid gap-x-12 gap-y-8 lg:grid-cols-2">
      <TeamColumn label="Your team" side="blue" players={blueTeam} snipes={snipes} userName={userName} />
      <TeamColumn label="Enemy team" side="red" players={redTeam} snipes={snipes} userName={userName} />
    </div>
  );
};

export default LobbyTracker;
