/** @jsx React.createElement */
/** @jsxFrag React.Fragment */
import React, { useState, useCallback, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import { GameState } from './types';
import { Play, RotateCcw, Trophy, Rocket, Keyboard, CheckCircle } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // Update High Score when game ends or victory is achieved
  useEffect(() => {
    if (gameState === GameState.GAME_OVER || gameState === GameState.VICTORY) {
        if (score > highScore) {
            setHighScore(score);
        }
    }
  }, [gameState, score, highScore]);

  // Stable callback for score updates
  const handleScoreUpdate = useCallback((newScore: number) => {
    setScore(newScore);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-mono relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-sky-900 via-slate-900 to-slate-950"></div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 tracking-tighter italic uppercase drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            Thunder Strike
          </h1>
          <p className="text-cyan-200 mt-2 tracking-widest text-sm uppercase">Neon Horizon Defense</p>
        </div>

        {/* Game Container */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl blur opacity-30 group-hover:opacity-70 transition duration-1000"></div>
          <div className="relative bg-slate-950 rounded-xl border-4 border-slate-800 overflow-hidden">
            
            <GameCanvas 
              gameState={gameState} 
              setGameState={setGameState} 
              setScore={handleScoreUpdate} 
            />

            {/* MENU OVERLAY */}
            {gameState === GameState.MENU && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-8 z-20">
                <div className="mb-8 flex flex-col items-center animate-bounce">
                  <Rocket size={48} className="text-cyan-400 mb-2" />
                  <p className="text-lg font-bold text-cyan-100">Ready Pilot?</p>
                </div>
                
                <button 
                  onClick={() => setGameState(GameState.PLAYING)}
                  className="group relative px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xl rounded-full transition-all shadow-[0_0_20px_rgba(8,145,178,0.5)] hover:shadow-[0_0_40px_rgba(34,211,238,0.7)] flex items-center gap-3"
                >
                  <Play className="fill-white" />
                  START MISSION
                </button>

                <div className="mt-12 grid grid-cols-2 gap-6 text-slate-400 text-sm border-t border-slate-800 pt-6">
                  <div className="flex items-center gap-2">
                    <Keyboard size={20} />
                    <span>Arrows to Move</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-6 border border-slate-600 rounded flex items-center justify-center text-xs">SPACE</div>
                    <span>Missiles</span>
                  </div>
                </div>
              </div>
            )}

            {/* VICTORY OVERLAY */}
            {gameState === GameState.VICTORY && (
              <div className="absolute inset-0 bg-green-950/90 backdrop-blur-md flex flex-col items-center justify-center text-white z-20 animate-in fade-in zoom-in duration-500">
                <CheckCircle size={64} className="text-green-400 mb-4" />
                <h2 className="text-4xl font-black text-green-400 mb-2 uppercase tracking-widest drop-shadow-lg text-center">Mission Accomplished</h2>
                <p className="text-green-200 mb-8">Target Destroyed. Sector Clear.</p>
                
                <div className="flex flex-col gap-4 mb-8 w-64">
                  <div className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-green-800">
                    <span className="text-slate-400 text-sm">FINAL SCORE</span>
                    <span className="text-2xl font-bold text-white">{score}</span>
                  </div>
                </div>

                <button 
                  onClick={() => setGameState(GameState.PLAYING)}
                  className="px-8 py-3 bg-white text-green-700 hover:bg-gray-200 font-bold rounded-full transition-colors flex items-center gap-2"
                >
                  <RotateCcw size={20} />
                  PLAY AGAIN
                </button>
              </div>
            )}

            {/* GAME OVER OVERLAY */}
            {gameState === GameState.GAME_OVER && (
              <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center text-white z-20">
                <h2 className="text-5xl font-black text-red-500 mb-2 uppercase tracking-widest drop-shadow-lg">Mission Failed</h2>
                <p className="text-red-200 mb-8">Your ship has been destroyed.</p>
                
                <div className="flex flex-col gap-4 mb-8 w-64">
                  <div className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-red-900">
                    <span className="text-slate-400 text-sm">FINAL SCORE</span>
                    <span className="text-2xl font-bold text-white">{score}</span>
                  </div>
                  <div className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-yellow-900/50">
                    <span className="text-yellow-500/80 text-sm flex items-center gap-2"><Trophy size={14}/> BEST</span>
                    <span className="text-xl font-bold text-yellow-400">{Math.max(score, highScore)}</span>
                  </div>
                </div>

                <button 
                  onClick={() => setGameState(GameState.PLAYING)}
                  className="px-8 py-3 bg-white text-red-600 hover:bg-gray-200 font-bold rounded-full transition-colors flex items-center gap-2"
                >
                  <RotateCcw size={20} />
                  RETRY MISSION
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Instructions */}
        <div className="text-slate-500 text-xs flex gap-8">
           <span>Auto-Fire: <span className="text-green-400">ON</span></span>
           <span>Missile Cooldown: <span className="text-yellow-400">0.8s</span></span>
        </div>
      </div>
    </div>
  );
};

export default App;