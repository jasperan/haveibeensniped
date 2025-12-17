
import React from 'react';

const Navbar: React.FC = () => {
  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-sm rotate-45"></div>
            </div>
            <span className="font-bold text-xl tracking-tighter">HAVEIBEEN<span className="text-indigo-500">SNIPED</span></span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40"></div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
