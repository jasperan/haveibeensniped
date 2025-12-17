
import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import LobbyTracker from './components/LobbyTracker';
import SnipeHistory from './components/SnipeHistory';
import { RiotService } from './services/riotService';
import { CurrentGame, SnipedPlayer, Region } from './types';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentGame, setCurrentGame] = useState<CurrentGame | null>(null);
  const [snipedPlayers, setSnipedPlayers] = useState<SnipedPlayer[]>([]);
  const [searchedUser, setSearchedUser] = useState<{ name: string; tag: string } | null>(null);

  const handleSearch = async (name: string, tag: string, region: Region) => {
    setLoading(true);
    setError(null);
    setCurrentGame(null);
    setSnipedPlayers([]);
    setSearchedUser({ name, tag });

    try {
      // 1. Check if In Game
      const game = await RiotService.checkInGame(name, tag, region);
      
      if (!game) {
        setError(`Summoner ${name}#${tag} is currently not in a live game. Make sure you are in a loading screen or game!`);
        setLoading(false);
        return;
      }

      setCurrentGame(game);

      // 2. Fetch History & Cross-reference
      const userPuuid = game.participants.find(p => p.summonerName.toLowerCase() === name.toLowerCase())?.puuid || 'user-puuid';
      const snipes = await RiotService.analyzeSnipes(userPuuid, game.participants, region);
      
      setSnipedPlayers(snipes);
    } catch (err) {
      setError("An unexpected error occurred while communicating with the Riot API.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen league-gradient selection:bg-indigo-500 selection:text-white flex flex-col">
      <Navbar />
      
      <main className="max-w-7xl mx-auto pb-24 relative flex-grow">
        {/* Background Decorations */}
        <div className="absolute top-0 right-0 -z-10 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute top-40 left-0 -z-10 w-[400px] h-[400px] bg-pink-600/5 blur-[100px] rounded-full"></div>
        
        <Hero onSearch={handleSearch} isLoading={loading} />

        {error && (
          <div className="max-w-3xl mx-auto px-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-rose-500/10 border border-rose-500/50 p-6 rounded-2xl flex items-center gap-4 text-rose-200">
              <svg className="w-8 h-8 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              <div className="font-medium">{error}</div>
            </div>
          </div>
        )}

        {!error && currentGame && (
          <div className="px-4">
            {/* Status Indicator */}
            <div className="max-w-2xl mx-auto bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between mb-8 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                <div className="text-sm font-bold text-zinc-300 uppercase tracking-widest">
                  Live Game Detected: <span className="text-indigo-400">{currentGame.gameMode}</span>
                </div>
              </div>
              <div className="text-xs font-mono text-zinc-500">
                LOBBY ID: #{currentGame.gameId}
              </div>
            </div>

            <LobbyTracker 
              game={currentGame} 
              snipes={snipedPlayers} 
              userName={searchedUser?.name || ''} 
            />
            
            <SnipeHistory snipes={snipedPlayers} />
          </div>
        )}

        {/* Informational Cards if nothing is searched */}
        {!currentGame && !error && !loading && (
          <div className="grid md:grid-cols-3 gap-6 px-4 max-w-5xl mx-auto mt-12">
            <div className="glass-card p-8 rounded-3xl border-zinc-800/50 hover:border-zinc-700 transition-colors group">
              <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center mb-6 text-indigo-500 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Instant Check</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">No need to wait for match history to update. Check your lobby while in the loading screen.</p>
            </div>
            <div className="glass-card p-8 rounded-3xl border-zinc-800/50 hover:border-zinc-700 transition-colors group">
              <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center mb-6 text-purple-500 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
              </div>
              <h3 className="text-xl font-bold mb-3">100 Match Deep Scan</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">We scan the last 100 matches to find any overlap with your current 9 lobby participants.</p>
            </div>
            <div className="glass-card p-8 rounded-3xl border-zinc-800/50 hover:border-zinc-700 transition-colors group">
              <div className="w-12 h-12 bg-pink-600/20 rounded-2xl flex items-center justify-center mb-6 text-pink-500 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Win/Loss Tracking</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">See if that teammate you recognize is actually a win-streak partner or a game-thrower.</p>
            </div>
          </div>
        )}
      </main>

      <footer className="py-12 px-4 border-t border-zinc-900 bg-zinc-950/80">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-zinc-800 rounded flex items-center justify-center">
                <div className="w-3 h-3 bg-zinc-400 rounded-sm rotate-45"></div>
              </div>
              <span className="font-bold text-zinc-400 tracking-tight">HAVEIBEEN<span className="text-zinc-600">SNIPED</span></span>
            </div>
            <div className="flex flex-col items-center md:items-end gap-2">
              <div className="text-zinc-400 text-sm font-medium">
                created by <span className="text-indigo-400">jasperan</span>
              </div>
              <div className="text-zinc-600 text-[10px] max-w-md text-center md:text-right uppercase tracking-[0.2em] font-bold">
                HaveIBeenSniped isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends.
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
