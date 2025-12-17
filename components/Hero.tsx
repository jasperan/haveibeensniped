
import React, { useState } from 'react';
import { REGIONS } from '../constants';
import { Region } from '../types';

interface HeroProps {
  onSearch: (name: string, tag: string, region: Region) => void;
  isLoading: boolean;
}

const Hero: React.FC<HeroProps> = ({ onSearch, isLoading }) => {
  const [input, setInput] = useState('');
  const [region, setRegion] = useState<Region>('EUW1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.includes('#')) {
      alert('Please enter your Riot ID in the format: Name#Tag');
      return;
    }
    const [name, tag] = input.split('#');
    onSearch(name.trim(), tag.trim(), region);
  };

  return (
    <div className="py-16 px-4 text-center">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight">
          ARE YOU PLAYING WITH A <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">SNIPER?</span>
        </h1>
        <p className="text-zinc-400 text-lg mb-10 max-w-xl mx-auto">
          Instantly check if you've coincided with any player in your current lobby during your last 100 matches.
        </p>
        
        <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto">
          <div className="flex flex-col md:flex-row gap-2 bg-zinc-900 p-2 rounded-2xl border border-zinc-800 shadow-2xl">
            <select 
              value={region}
              onChange={(e) => setRegion(e.target.value as Region)}
              className="bg-zinc-800 text-white px-4 py-3 rounded-xl border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
            >
              {REGIONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <input 
              type="text"
              placeholder="SummonerName#TAG"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="flex-1 bg-transparent px-4 py-3 text-lg focus:outline-none placeholder:text-zinc-600 disabled:opacity-50"
            />
            <button 
              type="submit"
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 min-w-[140px]"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                  Search
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs font-semibold text-zinc-500">
          <span className="bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800 uppercase tracking-widest">Supports all Riot Regions</span>
          <span className="bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800 uppercase tracking-widest">Real-time Lobby Check</span>
          <span className="bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800 uppercase tracking-widest">Last 100 Games</span>
        </div>
      </div>
    </div>
  );
};

export default Hero;
