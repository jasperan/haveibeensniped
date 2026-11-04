import React, { useState } from 'react';
import { REGIONS } from '../constants';
import { Region } from '../types';
import { SearchIcon } from './Icons';

interface HeroProps {
  onSearch: (name: string, tag: string, region: Region) => void;
  onTryDemo: () => void;
  isLoading: boolean;
}

/* The example entry is the whole product in one ledger line:
   a portrait, one tabular figure, one graded bar, and the case line. */
const ExampleEntry = () => (
  <div className="panel overflow-hidden">
    <div className="flex items-center justify-between border-b border-line px-4 h-10">
      <span className="case-line">How one entry reads</span>
      <span className="case-line">example</span>
    </div>

    <div className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-raised font-mono text-[12px] text-ink2">
            TB
          </div>
          <div className="min-w-0">
            <div className="truncate text-[15px] text-ink">Teemo Bandit</div>
            <div className="case-line mt-0.5 truncate">#EUW · Lee Sin</div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-2xl tabular-nums leading-none text-alert">86</div>
          <div className="mt-1 text-2xs text-ink3">risk</div>
        </div>
      </div>

      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-alert" style={{ width: '86%' }} />
      </div>

      <div className="case-line mt-3">EUW1 · 7 matches · 3W/4L</div>
      <p className="mt-3 text-[13px] leading-relaxed text-ink2">
        Queued into you three times in six days, twice on the enemy side.
      </p>
      <div className="mt-3 flex items-center gap-2 text-2xs text-ink3">
        <span className="h-1.5 w-1.5 rounded-full bg-alert" />
        high attention
      </div>
    </div>
  </div>
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
    <section className="px-4 pt-16 pb-12 md:pt-20">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-16">
        <div>
          <div className="case-line mb-5">League of Legends · live client · local database</div>

          <h1 className="max-w-xl text-[38px] font-medium leading-[1.05] tracking-[-0.02em] md:text-[52px]">
            Are you playing with a <span className="text-accent">sniper?</span>
          </h1>

          <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-ink2">
            Cross-reference the lobby you are in right now against your last 100 matches. The players
            you have met before are listed before the game starts.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 max-w-xl">
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
                type="text"
                placeholder="SummonerName#TAG"
                value={input}
                onChange={(e) => { setInput(e.target.value); setValidationError(null); }}
                disabled={isLoading}
                aria-label="Riot ID"
                className="input-field h-10 flex-1 disabled:opacity-50"
              />
            </div>

            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <button type="submit" disabled={isLoading} className="btn-primary flex-1 sm:flex-none">
                {isLoading ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#0c0d10]/30 border-t-[#0c0d10]" />
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
              <p className="mt-3 text-[13px] text-alert">{validationError}</p>
            )}
          </form>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-ink3">
            <span>11 regions</span>
            <span>Loading screen check</span>
            <span>100-match depth</span>
          </div>
        </div>

        <ExampleEntry />
      </div>
    </section>
  );
};

export default Hero;
