import React, { useState } from 'react';
import { REGIONS } from '../constants';
import { Region } from '../types';
import { SearchIcon } from './Icons';

interface HeroProps {
  onSearch: (name: string, tag: string, region: Region) => void;
  onTryDemo: () => void;
  isLoading: boolean;
}

/* The encounter file: the earlier matches along one line with the four he keeps
   turning up in, then how one entry reads — figure, bar, case line, evidence. */
const ENCOUNTER_MARKS = [2, 7, 13, 17];

const evidence = [
  ['Encounter memory', 'Across matches, not just this lobby'],
  ['Risk context', 'Frequency, timing, and your notes'],
  ['You decide', 'Review the evidence before acting'],
];

const ExampleFile = () => (
  <aside className="panel min-w-0 p-5" aria-labelledby="preview-title">
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
      <span className="case-line">The encounter file</span>
      <span className="case-line">illustrative example</span>
    </div>

    <h2 id="preview-title" className="mt-5 text-[20px] font-medium leading-tight text-ink">
      A name is a clue. <span className="text-ink2">History is context.</span>
    </h2>

    <div className="mt-5 flex items-baseline justify-between gap-3 text-[11px] text-ink3">
      <span>Earlier matches</span>
      <span>Current lobby</span>
    </div>
    <div className="mt-2 flex items-center" aria-hidden="true">
      {Array.from({ length: 18 }, (_, i) => {
        const encounter = ENCOUNTER_MARKS.includes(i);
        return (
          <span key={i} className="flex flex-1 items-center border-t border-line">
            <i
              className={
                encounter
                  ? '-mt-1 h-2 w-2 rounded-full bg-accent'
                  : '-mt-[3px] h-1.5 w-1.5 rounded-full bg-line'
              }
            />
          </span>
        );
      })}
    </div>

    <div className="mt-4 flex items-center gap-3 border-y border-line py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-raised font-mono text-[12px] text-ink2">
        N
      </div>
      <div className="min-w-0">
        <div className="truncate text-[13px] text-ink">NightHeron#EUW</div>
        <div className="case-line mt-0.5 truncate">4 encounters · example player</div>
      </div>
      <div className="ml-auto shrink-0 text-right">
        <div className="font-mono text-lg tabular-nums leading-none text-alert">86</div>
        <div className="mt-1 text-[11px] text-ink3">risk</div>
      </div>
    </div>

    <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full bg-alert" style={{ width: '86%' }} />
    </div>

    <dl className="mt-4">
      {evidence.map(([term, detail]) => (
        <div
          key={term}
          className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 border-b border-line py-2.5 text-[11px] last:border-0"
        >
          <dt className="text-ink2">{term}</dt>
          <dd className="text-ink3">{detail}</dd>
        </div>
      ))}
    </dl>

    <p className="case-line mt-4">EUW1 · 7 matches · 3W/4L</p>
  </aside>
);

const Hero: React.FC<HeroProps> = ({ onSearch, onTryDemo, isLoading }) => {
  const [input, setInput] = useState('');
  const [region, setRegion] = useState<Region>('EUW1');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!input.includes('#')) {
      setValidationError('Enter your Riot ID as Name#Tag');
      return;
    }
    const [name, tag] = input.split('#');
    if (!name.trim() || !tag.trim()) {
      setValidationError('Both parts are required, for example Player#EUW');
      return;
    }
    onSearch(name.trim(), tag.trim(), region);
  };

  return (
    <section className="px-4 pt-16 pb-12 md:pt-20" aria-labelledby="scout-title">
      <div className="mx-auto grid max-w-6xl items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-16">
        <div className="min-w-0">
          <div className="case-line mb-5">League of Legends · live client · local database</div>

          <h1
            id="scout-title"
            className="max-w-xl text-[38px] font-medium leading-[1.05] tracking-[-0.02em] md:text-[52px]"
          >
            Familiar names.
            <br />
            <span className="text-accent">Know the pattern.</span>
          </h1>

          <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-ink2">
            Cross-reference the lobby you are in right now against your last 100 matches. The players
            you have met before are listed before the game starts, with the encounter history to back
            it up.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 max-w-xl" aria-busy={isLoading}>
            <label htmlFor="riot-id" className="case-line mb-2 block">
              Start with your Riot ID
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={region}
                onChange={(e) => { setRegion(e.target.value as Region); setValidationError(null); }}
                aria-label="Region"
                className="input-field h-10 sm:w-44"
              >
                {REGIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <input
                id="riot-id"
                type="text"
                placeholder="SummonerName#TAG"
                value={input}
                onChange={(e) => { setInput(e.target.value); setValidationError(null); }}
                disabled={isLoading}
                aria-invalid={Boolean(validationError)}
                aria-describedby={validationError ? 'riot-id-error' : undefined}
                className="input-field h-10 min-w-0 flex-1 disabled:opacity-50"
              />
            </div>

            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <button type="submit" disabled={isLoading} className="btn-primary flex-1 sm:flex-none">
                {isLoading ? (
                  <>
                    <span
                      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#0c0d10]/30 border-t-[#0c0d10]"
                      aria-hidden="true"
                    />
                    Scanning…
                  </>
                ) : (
                  <>
                    <SearchIcon size={15} />
                    Scan lobby
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={onTryDemo}
                data-testid="try-demo-button"
                className="btn-quiet"
              >
                Try demo
              </button>
            </div>

            {validationError && (
              <p id="riot-id-error" role="alert" className="mt-3 text-[13px] text-alert">
                {validationError}
              </p>
            )}
          </form>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-ink3">
            <span>11 regions</span>
            <span>Loading screen check</span>
            <span>100-match depth</span>
          </div>

          <p className="mt-4 max-w-lg text-[11px] leading-relaxed text-ink3">
            A repeat encounter is a signal, not proof of stream sniping.
          </p>
        </div>

        <ExampleFile />
      </div>
    </section>
  );
};

export default Hero;
