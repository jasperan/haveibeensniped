
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
    <div className="py-20 px-4 text-center">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tighter leading-[1.05]">
          Are you playing with a{' '}
          <span className="text-indigo-400">sniper?</span>
        </h1>
        <p className="text-zinc-400 text-lg mb-12 max-w-xl mx-auto leading-relaxed">
          Cross-reference your current lobby against your last 100 matches. Surface repeat players before the game starts.
        </p>

        <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto">
          <div className="flex flex-col md:flex-row gap-2 bg-zinc-900/80 p-2 rounded-2xl border border-zinc-800/80 shadow-[0_8px_40px_-12px_rgba(99,102,241,0.15)]">
            <select
              value={region}
              onChange={(e) => { setRegion(e.target.value as Region); setValidationError(null); }}
              className="bg-zinc-800 text-white px-4 py-3 rounded-xl border border-zinc-700/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
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
              className="flex-1 bg-transparent px-4 py-3 text-lg focus:outline-none placeholder:text-zinc-600 disabled:opacity-50"
            />
            <div className="flex flex-col gap-2 md:flex-row">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-indigo-600 hover:bg-indigo-500 active:scale-[0.97] disabled:bg-zinc-700 text-white px-8 py-3 rounded-xl font-bold transition-all duration-150 flex items-center justify-center gap-2 min-w-[140px]"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
          </div>

          {validationError && (
            <p className="mt-3 text-sm text-rose-400 font-medium animate-in fade-in duration-200">
              {validationError}
            </p>
          )}
        </form>

        <div className="mt-10 flex flex-wrap justify-center gap-3 text-2xs font-bold text-zinc-500">
          <span className="bg-zinc-900/60 px-3 py-1.5 rounded-full border border-zinc-800/60 uppercase tracking-[0.15em]">All Riot regions</span>
          <span className="bg-zinc-900/60 px-3 py-1.5 rounded-full border border-zinc-800/60 uppercase tracking-[0.15em]">Loading screen check</span>
          <span className="bg-zinc-900/60 px-3 py-1.5 rounded-full border border-zinc-800/60 uppercase tracking-[0.15em]">100-match depth</span>
        </div>
      </div>
    </div>
  );
};

export default Hero;
