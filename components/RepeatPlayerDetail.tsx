import React, { useEffect, useMemo, useState } from 'react';
import { CHAMPION_MAP, getChampIcon } from '../constants';
import { RepeatPlayer, RiskTier } from '../types';
import { CloseIcon } from './Icons';

interface RepeatPlayerDetailProps {
  player: RepeatPlayer | null;
  trackedProfileId?: number | null;
  onClose: () => void;
  onSaveWatchNote?: (playerPuuid: string, note: string) => Promise<void>;
}

const TIER_LABEL: Record<RiskTier, string> = {
  background: 'Background',
  repeat: 'Repeat',
  watch: 'Watch',
  'high-attention': 'High attention',
};

const relationCopy = (relation: RepeatPlayer['relation']) => {
  if (relation === 'enemy') {
    return {
      short: 'Enemy',
      header: 'Currently on the enemy side.',
      detail: 'This player is on the enemy side in the live lobby.',
    };
  }

  if (relation === 'ally') {
    return {
      short: 'Ally',
      header: 'Currently on your side.',
      detail: 'This player is on your side in the live lobby.',
    };
  }

  return {
    short: 'Unknown',
    header: 'The live payload did not resolve the side.',
    detail: 'The live payload did not resolve whether this player is on your side or the enemy side.',
  };
};

const formatMatchDate = (timestamp: number) => new Date(timestamp).toLocaleString(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const Figure = ({ label, value, detail, charge }: { label: string; value: string; detail: string; charge?: boolean }) => (
  <div className="border border-line p-4">
    <div className="text-[11px] text-ink3">{label}</div>
    <div className={`mt-2 font-mono text-2xl tabular-nums leading-none ${charge ? 'text-alert' : 'text-ink'}`}>{value}</div>
    <div className="mt-2 text-[12px] leading-relaxed text-ink3">{detail}</div>
  </div>
);

const Section = ({ title, aside, children }: { title: string; aside?: string; children: React.ReactNode }) => (
  <section className="border border-line p-5">
    <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2">
      <h4 className="text-[13px] text-ink">{title}</h4>
      {aside && <span className="case-line">{aside}</span>}
    </div>
    <div className="mt-3">{children}</div>
  </section>
);

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

  const relation = relationCopy(player.relation);
  const olderMemoryCount = Math.max(player.totalGames - sortedMatches.length, 0);
  const canSaveNote = Boolean(trackedProfileId && onSaveWatchNote);
  const isCharge = player.risk.tier === 'high-attention';

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
      className="fixed inset-0 z-50 overflow-y-auto bg-background/90 px-4 py-8"
      onClick={onClose}
    >
      <div className="mx-auto max-w-5xl" onClick={(event) => event.stopPropagation()}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="repeat-player-detail-title"
          className="panel overflow-hidden"
        >
          <div className="border-b border-line p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <img
                  src={getChampIcon(player.championId)}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-lg border border-line bg-raised object-cover"
                />

                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 id="repeat-player-detail-title" className="text-xl font-medium tracking-[-0.01em] text-ink">
                      {player.gameName}
                      <span className="ml-2 font-mono text-[12px] text-ink3">#{player.tagLine}</span>
                    </h3>
                    <span className={`text-[12px] ${isCharge ? 'text-alert' : 'text-ink3'}`}>
                      {TIER_LABEL[player.risk.tier]}
                    </span>
                  </div>

                  <p className="mt-2 text-[13px] leading-relaxed text-ink2">
                    {CHAMPION_MAP[player.championId] || 'Unknown champion'} in the current lobby.{' '}
                    {relation.header}
                  </p>

                  <div className="mt-3 case-line">
                    {player.region} · {player.totalGames} matches · {player.wins}W/{player.losses}L
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close repeat-player details"
                className="shrink-0 rounded-lg border border-line p-2 text-ink3 transition-colors hover:border-ink3 hover:text-ink"
              >
                <CloseIcon size={16} />
              </button>
            </div>
          </div>

          <div className="space-y-6 p-6 md:p-8">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Figure
                label="Risk score"
                value={String(player.risk.score)}
                detail={`${TIER_LABEL[player.risk.tier]} tier`}
                charge={isCharge}
              />
              <Figure
                label="Shared matches"
                value={String(player.totalGames)}
                detail="Saved in local encounter memory"
              />
              <Figure
                label="Record"
                value={`${player.wins}W/${player.losses}L`}
                detail="Across stored encounters"
              />
              <Figure
                label="Current side"
                value={relation.short}
                detail="In the live lobby right now"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
              <div className="space-y-4">
                <Section title="Risk reasons" aside={`${player.risk.reasons.length}`}>
                  <ul className="space-y-2">
                    {player.risk.reasons.map((reason) => (
                      <li key={reason} className="flex items-start gap-3">
                        <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${isCharge ? 'bg-alert' : 'bg-ink3'}`} />
                        <span className="text-[13px] leading-relaxed text-ink2">{reason}</span>
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section title="Watch note" aside="local only">
                  <p className="text-[13px] leading-relaxed text-ink3">
                    Your own context for this player. Notes persist in local SQLite memory.
                  </p>
                  <textarea
                    data-testid="watch-note-textarea"
                    value={draftNote}
                    onChange={(event) => setDraftNote(event.target.value)}
                    placeholder="For example: shows up in back-to-back queue windows"
                    aria-label="Watch note"
                    className="input-field mt-3 min-h-24 resize-y"
                  />
                  {noteError && (
                    <div className="mt-2 text-[12px] text-alert">{noteError}</div>
                  )}
                  {!noteError && !noteSaving && player.watchNote === draftNote.trim() && draftNote.trim() && (
                    <div className="mt-2 text-[12px] text-positive">Saved in local memory.</div>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      data-testid="save-watch-note"
                      type="button"
                      disabled={!canSaveNote || noteSaving}
                      onClick={() => void handleSaveNote()}
                      className="btn-primary h-9 text-[13px]"
                    >
                      {noteSaving ? 'Saving' : draftNote.trim() ? 'Save note' : 'Clear note'}
                    </button>
                    {!canSaveNote && (
                      <span className="text-[11px] text-ink3">
                        Run a scan or the demo first to save notes.
                      </span>
                    )}
                  </div>
                </Section>

                <Section title="What this payload shows">
                  <div className="space-y-2 text-[13px] leading-relaxed text-ink3">
                    <p>
                      <span className="text-ink2">Wins and losses:</span>{' '}
                      {player.wins} wins and {player.losses} losses across the encounters saved so far.
                    </p>
                    <p>
                      <span className="text-ink2">Current lobby side:</span>{' '}
                      {relation.detail}
                    </p>
                    {olderMemoryCount > 0 ? (
                      <p>
                        <span className="text-ink2">Older memory:</span>{' '}
                        {olderMemoryCount} older encounter{olderMemoryCount === 1 ? '' : 's'} still count
                        toward the totals, even when the live scan returned no per-match recap.
                      </p>
                    ) : (
                      <p>
                        <span className="text-ink2">Live scan detail:</span>{' '}
                        Every saved encounter for this player is also in the current payload.
                      </p>
                    )}
                  </div>
                </Section>
              </div>

              <Section title="Recent shared matches" aside={`${sortedMatches.length} shown`}>
                {sortedMatches.length > 0 ? (
                  <div className="divide-y divide-line">
                    {sortedMatches.map((match) => (
                      <div key={match.matchId} className="flex items-center justify-between gap-4 py-2.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex -space-x-2">
                            <img
                              src={getChampIcon(match.playerChampId)}
                              alt=""
                              className="h-7 w-7 rounded border border-surface bg-raised object-cover"
                            />
                            <img
                              src={getChampIcon(match.targetChampId)}
                              alt=""
                              className="h-7 w-7 rounded border border-surface bg-raised object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="case-line">{formatMatchDate(match.timestamp)}</div>
                            <div className="mt-1 text-[11px] text-ink3">
                              {match.team === 'with' ? 'Ally game' : 'Enemy game'}
                              {match.queueId ? ` · queue ${match.queueId}` : ''}
                            </div>
                          </div>
                        </div>

                        <span className={`shrink-0 text-[12px] ${match.win ? 'text-positive' : 'text-alert'}`}>
                          {match.win ? 'Win' : 'Loss'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] leading-relaxed text-ink3">
                    No per-match recap came back in this scan. The totals and reasons above still come
                    from local encounter memory, so you can see why this player stayed flagged.
                  </p>
                )}
              </Section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepeatPlayerDetail;
