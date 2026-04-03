import React, { useEffect, useMemo, useState } from 'react';
import { CHAMPION_MAP, getChampIcon } from '../constants';
import { RepeatPlayer, RiskTier } from '../types';

interface RepeatPlayerDetailProps {
  player: RepeatPlayer | null;
  trackedProfileId?: number | null;
  onClose: () => void;
  onSaveWatchNote?: (playerPuuid: string, note: string) => Promise<void>;
}

const TIER_STYLES: Record<RiskTier, {
  label: string;
  badgeClassName: string;
}> = {
  background: {
    label: 'Background',
    badgeClassName: 'bg-zinc-800 text-zinc-300 border border-zinc-700/70',
  },
  repeat: {
    label: 'Repeat',
    badgeClassName: 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30',
  },
  watch: {
    label: 'Watch',
    badgeClassName: 'bg-amber-500/10 text-amber-300 border border-amber-500/30',
  },
  'high-attention': {
    label: 'High Attention',
    badgeClassName: 'bg-rose-500/10 text-rose-300 border border-rose-500/30',
  },
};

const getRelationPresentation = (relation: RepeatPlayer['relation']) => {
  if (relation === 'enemy') {
    return {
      badgeClassName: 'bg-rose-500/10 text-rose-300 border border-rose-500/20',
      badgeLabel: 'Enemy side now',
      shortLabel: 'Enemy',
      headerText: 'Currently on the enemy side.',
      detailText: 'This player is on the enemy side in the live lobby.',
    };
  }

  if (relation === 'ally') {
    return {
      badgeClassName: 'bg-blue-500/10 text-blue-300 border border-blue-500/20',
      badgeLabel: 'Ally side now',
      shortLabel: 'Ally',
      headerText: 'Currently on your side.',
      detailText: 'This player is on your side in the live lobby.',
    };
  }

  return {
    badgeClassName: 'bg-zinc-800 text-zinc-300 border border-zinc-700/70',
    badgeLabel: 'Side unresolved',
    shortLabel: 'Unknown',
    headerText: 'Current side could not be resolved from the live payload.',
    detailText: 'The live payload did not resolve whether this player is on your side or the enemy side.',
  };
};

const formatMatchDate = (timestamp: number) => new Date(timestamp).toLocaleString(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const RepeatPlayerDetail: React.FC<RepeatPlayerDetailProps> = ({
  player,
  trackedProfileId,
  onClose,
  onSaveWatchNote,
}) => {
  const sortedMatches = useMemo(() => {
    if (!player) return [];
    return [...player.matches].sort((left, right) => right.timestamp - left.timestamp);
  }, [player]);
  const [draftNote, setDraftNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  useEffect(() => {
    if (!player) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [player, onClose]);

  useEffect(() => {
    setDraftNote(player?.watchNote || '');
    setNoteError(null);
    setNoteSaving(false);
  }, [player]);

  if (!player) return null;

  const tierStyle = TIER_STYLES[player.risk.tier];
  const relation = getRelationPresentation(player.relation);
  const olderMemoryCount = Math.max(player.totalGames - sortedMatches.length, 0);
  const canSaveNote = Boolean(trackedProfileId && onSaveWatchNote);

  const handleSaveNote = async () => {
    if (!canSaveNote || !onSaveWatchNote) return;
    setNoteSaving(true);
    setNoteError(null);

    try {
      await onSaveWatchNote(player.puuid, draftNote);
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : 'Failed to save note');
    } finally {
      setNoteSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/85 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="mx-auto max-w-5xl" onClick={(event) => event.stopPropagation()}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="repeat-player-detail-title"
          className="glass-card overflow-hidden rounded-3xl border border-zinc-700/80 shadow-2xl"
        >
          <div className="border-b border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-indigo-950/30 p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <img
                  src={getChampIcon(player.championId)}
                  alt={`${player.gameName} champion`}
                  className="h-16 w-16 rounded-2xl border border-zinc-700/80 bg-zinc-900 object-cover"
                />

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 id="repeat-player-detail-title" className="text-2xl font-black tracking-tight text-zinc-100">
                      {player.gameName}
                      <span className="ml-2 text-sm font-mono font-medium text-zinc-500">
                        #{player.tagLine}
                      </span>
                    </h3>
                    <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${tierStyle.badgeClassName}`}>
                      {tierStyle.label}
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    {CHAMPION_MAP[player.championId] || 'Unknown champion'} in the current lobby.
                    {' '}{relation.headerText}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold uppercase tracking-[0.2em]">
                    <span className="rounded-full border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-zinc-300">
                      Score {player.risk.score}
                    </span>
                    <span className={`rounded-full px-3 py-2 ${relation.badgeClassName}`}>
                      {relation.badgeLabel}
                    </span>
                    <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-zinc-500">
                      {player.region}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close repeat-player details"
                className="rounded-2xl border border-zinc-700 bg-zinc-900/80 p-3 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-100"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>

          <div className="space-y-6 p-6 md:p-8">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Score</div>
                <div className="mt-3 text-3xl font-black text-zinc-100">{player.risk.score}</div>
                <div className="mt-2 text-sm text-zinc-500">{tierStyle.label} tier</div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Shared matches</div>
                <div className="mt-3 text-3xl font-black text-zinc-100">{player.totalGames}</div>
                <div className="mt-2 text-sm text-zinc-500">Saved in local encounter memory</div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Record</div>
                <div className="mt-3 text-3xl font-black text-zinc-100">{player.wins}W / {player.losses}L</div>
                <div className="mt-2 text-sm text-zinc-500">Across stored encounters</div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Current relation</div>
                <div className="mt-3 text-3xl font-black text-zinc-100">
                  {relation.shortLabel}
                </div>
                <div className="mt-2 text-sm text-zinc-500">In the live lobby right now</div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
              <div className="space-y-6">
                <section className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-5">
                  <h4 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-400">Risk reasons</h4>
                  <ul className="mt-4 space-y-3">
                    {player.risk.reasons.map((reason) => (
                      <li key={reason} className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3">
                        <div className="mt-1 h-2 w-2 rounded-full bg-indigo-400"></div>
                        <span className="text-sm leading-relaxed text-zinc-200">{reason}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-400">Watch note</h4>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                      Local only
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-500">
                    Save your own context for this repeat player. Notes persist in local SQLite memory.
                  </p>
                  <textarea
                    data-testid="watch-note-textarea"
                    value={draftNote}
                    onChange={(event) => setDraftNote(event.target.value)}
                    placeholder="Example: shows up in back-to-back queue windows"
                    className="mt-4 min-h-28 w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-600 focus:border-indigo-500"
                  />
                  {noteError && (
                    <div className="mt-3 text-sm text-rose-300">{noteError}</div>
                  )}
                  {!noteError && !noteSaving && player.watchNote === draftNote.trim() && draftNote.trim() && (
                    <div className="mt-3 text-sm text-emerald-300">Saved in local memory.</div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      data-testid="save-watch-note"
                      type="button"
                      disabled={!canSaveNote || noteSaving}
                      onClick={() => void handleSaveNote()}
                      className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-indigo-200 transition-colors hover:border-indigo-400/50 hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {noteSaving ? 'Saving…' : draftNote.trim() ? 'Save note' : 'Clear note'}
                    </button>
                    {!canSaveNote && (
                      <span className="text-xs text-zinc-500">
                        Run a scan or demo first to save notes.
                      </span>
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-5">
                  <h4 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-400">What this payload shows</h4>
                  <div className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-400">
                    <p>
                      <span className="font-semibold text-zinc-200">Wins and losses:</span>
                      {' '}{player.wins} wins and {player.losses} losses across the encounters saved so far.
                    </p>
                    <p>
                      <span className="font-semibold text-zinc-200">Current lobby side:</span>
                      {' '}{relation.detailText}
                    </p>
                    {olderMemoryCount > 0 ? (
                      <p>
                        <span className="font-semibold text-zinc-200">Older memory:</span>
                        {' '}{olderMemoryCount} older encounter{olderMemoryCount === 1 ? '' : 's'} still count
                        toward the totals, even if the live scan did not return a per-match recap.
                      </p>
                    ) : (
                      <p>
                        <span className="font-semibold text-zinc-200">Live scan detail:</span>
                        {' '}Every saved encounter in this case is also reflected in the current payload.
                      </p>
                    )}
                  </div>
                </section>
              </div>

              <section className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-400">Recent shared matches</h4>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                      This is the per-match evidence the current scan returned.
                    </p>
                  </div>
                  {sortedMatches.length > 0 && (
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                      {sortedMatches.length} shown
                    </div>
                  )}
                </div>

                {sortedMatches.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {sortedMatches.map((match) => (
                      <div key={match.matchId} className="rounded-2xl border border-zinc-800/70 bg-zinc-900/60 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex -space-x-3">
                              <img
                                src={getChampIcon(match.playerChampId)}
                                alt="Your champion"
                                className="h-10 w-10 rounded-full border-2 border-zinc-900 bg-zinc-800 object-cover"
                              />
                              <img
                                src={getChampIcon(match.targetChampId)}
                                alt={`${player.gameName} champion`}
                                className="h-10 w-10 rounded-full border-2 border-zinc-900 bg-zinc-800 object-cover"
                              />
                            </div>

                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-zinc-100">
                                {formatMatchDate(match.timestamp)}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.2em]">
                                <span className={`rounded-full px-2 py-1 ${match.team === 'with' ? 'bg-blue-500/10 text-blue-300' : 'bg-rose-500/10 text-rose-300'}`}>
                                  {match.team === 'with' ? 'Ally game' : 'Enemy game'}
                                </span>
                                {match.queueId && (
                                  <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1 text-zinc-500">
                                    Queue {match.queueId}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className={`shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase ${
                            match.win
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {match.win ? 'Win' : 'Loss'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/60 p-5 text-sm leading-relaxed text-zinc-500">
                    No per-match recap came back in this scan. The totals and reasons above are still
                    coming from local encounter memory, so you can see why this player stayed flagged.
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepeatPlayerDetail;
