
import React, { useState } from 'react';
import { REGIONS } from '../constants';
import { Region } from '../types';

interface HeroProps {
  onSearch: (name: string, tag: string, region: Region) => void;
  onTryDemo: () => void;
  isLoading: boolean;
}

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
      setValidationError('Both name and tag are required (e.g. Player#EUW)');
      return;
    }
    onSearch(name.trim(), tag.trim(), region);
  };

  return (
    <section className="scout-hero" aria-labelledby="scout-title">
      <div className="scout-copy">
        <p className="scout-eyebrow"><span /> LOBBY INTELLIGENCE / LEAGUE OF LEGENDS</p>
        <h1 id="scout-title">
          Familiar names.<br />
          <span>Know the pattern.</span>
        </h1>
        <p className="scout-intro">
          Check your lobby against your last 100 matches. See who's been here before, with the encounter history to back it up.
        </p>

        <form onSubmit={handleSubmit} className="scout-form" aria-busy={isLoading}>
          <label htmlFor="riot-id" className="scout-form-label">Start with your Riot ID</label>
          <div className="scout-search-row">
            <select
              aria-label="Riot region"
              value={region}
              onChange={(e) => { setRegion(e.target.value as Region); setValidationError(null); }}
              className="bg-zinc-800 text-white px-4 py-3 rounded-xl border border-zinc-700/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
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
              className="flex-1 bg-transparent px-4 py-3 text-lg focus:outline-none placeholder:text-zinc-600 disabled:opacity-50"
            />
          </div>
            <div className="scout-actions">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-indigo-600 hover:bg-indigo-500 active:scale-[0.97] disabled:bg-zinc-700 text-white px-8 py-3 rounded-xl font-bold transition-all duration-150 flex items-center justify-center gap-2 min-w-[140px]"
              >
                {isLoading ? (
                  <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true"></span>Scanning…</>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    Scan lobby
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={onTryDemo}
                data-testid="try-demo-button"
                className="border border-indigo-500/30 bg-indigo-500/10 px-6 py-3 rounded-xl font-bold text-indigo-200 transition-all duration-150 hover:border-indigo-400/50 hover:bg-indigo-500/15 active:scale-[0.97] disabled:opacity-50"
              >
                Try demo
              </button>
            </div>

          {validationError && (
            <p id="riot-id-error" role="alert" className="mt-3 text-sm text-rose-400 font-medium animate-in fade-in duration-200">
              {validationError}
            </p>
          )}
        </form>

        <p className="scout-caution">A repeat encounter is a signal—not proof of stream sniping.</p>
      </div>
      <aside className="scout-preview" aria-labelledby="preview-title">
        <div className="scout-preview-top"><span>THE ENCOUNTER FILE</span><span className="scout-example">Illustrative example</span></div>
        <h2 id="preview-title">A name is a clue.<br /><em>History is context.</em></h2>
        <div className="scout-timeline-label"><span>Earlier matches</span><span>Current lobby</span></div>
        <div className="scout-timeline" aria-hidden="true">
          {Array.from({length:18},(_,i)=><span key={i} className={[2,7,13,17].includes(i)?'encounter':''}><i /></span>)}
        </div>
        <div className="scout-example-player"><div className="scout-monogram">N</div><div><strong>NightHeron#EUW</strong><span>Example player · 4 encounters</span></div><span className="scout-repeat">REPEAT</span></div>
        <dl className="scout-evidence"><div><dt>Encounter memory</dt><dd>Across matches, not just this lobby</dd></div><div><dt>Risk context</dt><dd>Frequency, timing, and your notes</dd></div><div><dt>You decide</dt><dd>Review the evidence before acting</dd></div></dl>
        <p className="scout-preview-foot">01 / SCAN &nbsp;&nbsp; 02 / COMPARE &nbsp;&nbsp; 03 / REVIEW</p>
      </aside>
    </section>
  );
};

export default Hero;
