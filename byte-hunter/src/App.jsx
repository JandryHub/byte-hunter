import React, { useState, useEffect, useCallback } from 'react';
import Target from './components/Target';
import './App.css';

function App() {
  const [gameState, setGameState] = useState('menu'); 
  const [score, setScore] = useState(0);
  const [integrity, setIntegrity] = useState(100); 
  const [timeLeft, setTimeLeft] = useState(60);
  const [targets, setTargets] = useState([]); 
  const [level, setLevel] = useState(1);

  const [highScore, setHighScore] = useState(
    parseInt(localStorage.getItem('byteHunterScore')) || 0
  );
  const [leaderboard, setLeaderboard] = useState(
    JSON.parse(localStorage.getItem('byteHunterLeaderboard')) || []
  );
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);

  // La dificultad aumenta: los virus aparecen más rápido según el nivel
  const spawnRate = Math.max(300, 1000 - (level - 1) * 150); 

  const checkHighScores = useCallback((finalScore) => {
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('byteHunterScore', finalScore.toString());
    }
    const lastLeaderboardScore = leaderboard.length > 0 ? leaderboard[leaderboard.length - 1].score : 0;
    const isTopScore = leaderboard.length < 5 || finalScore > lastLeaderboardScore;
    if (isTopScore && finalScore > 0) setShowNameInput(true);
  }, [highScore, leaderboard]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Al terminar el tiempo, subes de nivel y el reloj vuelve a 60
          setLevel(curr => curr + 1);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    const spawnerInterval = setInterval(() => {
      spawnTarget();
    }, spawnRate);

    return () => {
      clearInterval(timerInterval);
      clearInterval(spawnerInterval);
    };
  }, [gameState, spawnRate, checkHighScores]);

  const spawnTarget = () => {
    const id = Date.now();
    const rand = Math.random();
    
    let type = 'virus'; 
    if (rand < 0.2) type = 'file'; 
    else if (rand < 0.35 && level >= 2) type = 'trojan'; // El troyano aparece desde el Nivel 2

    const x = Math.random() * 80 + 10; 
    const y = Math.random() * 60 + 20; 

    setTargets((prev) => [...prev, { id, x, y, type }]);

    const disappearTime = Math.max(1000, 2500 - (level * 200));
    setTimeout(() => {
      setTargets((prev) => prev.filter((t) => t.id !== id));
    }, disappearTime);
  };

  const handleTargetClick = (id, type) => {
    setTargets((prev) => prev.filter((t) => t.id !== id));

    if (type === 'virus') {
      setScore(prev => prev + (10 * level));
    } else if (type === 'file') {
      setScore(prev => Math.max(0, prev - 10));
      updateIntegrity(20);
    } else if (type === 'trojan') {
      setScore(prev => Math.max(0, prev - 25));
      updateIntegrity(40);
    }
  };

  const updateIntegrity = (damage) => {
    setIntegrity(prev => {
      const newIntegrity = prev - damage;
      if (newIntegrity <= 0) {
        setGameState('gameover');
        checkHighScores(score);
        return 0;
      }
      return newIntegrity;
    });
  };

  const startGame = () => {
    setScore(0);
    setIntegrity(100);
    setTimeLeft(60);
    setLevel(1);
    setTargets([]);
    setGameState('playing');
  };

  const saveToLeaderboard = () => {
    if (playerName.trim() === '') return;
    const updated = [...leaderboard, { name: playerName, score: score }]
      .sort((a, b) => b.score - a.score).slice(0, 5);
    setLeaderboard(updated);
    localStorage.setItem('byteHunterLeaderboard', JSON.stringify(updated));
    setShowNameInput(false);
    setGameState('menu');
  };

  return (
    <div className="game-container">
      <header>
        <h1>BYTE HUNTER 🛡️ <span className="level-badge">Nivel {level}</span></h1>
      </header>
      
      <div className="stats">
        <div className="stats-info">
          <span>Puntos: {score}</span>
          <span className={timeLeft <= 10 ? 'timer-warning' : ''}>Tiempo: {timeLeft}s</span>
        </div>
        
        <div className="health-bar-container">
          <div 
            className={`health-bar-fill ${integrity > 50 ? 'health-green' : integrity > 20 ? 'health-yellow' : 'health-red'}`}
            style={{ width: `${integrity}%` }}
          ></div>
        </div>
        <span className="integrity-text">Integridad del Sistema: {integrity}%</span>
      </div>

      <main className="game-wrapper">
        {gameState === 'playing' && (
          <div className="game-board">
            {targets.map((target) => (
              <Target key={target.id} {...target} onClick={handleTargetClick} />
            ))}
          </div>
        )}

        {gameState === 'menu' && (
          <div className="menu">
            <h2>Misión: Escaneo Progresivo</h2>
            <p>👾 Virus (+pts) | 📁 Archivo (-vida) | ⚠️ Troyano (--vida)</p>
            <button onClick={startGame}>INICIAR ESCANEO</button>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="menu">
            <h2 style={{ color: 'red' }}>SISTEMA CAÍDO</h2>
            <h3>Puntaje Final: {score} (Nivel {level})</h3>
            {showNameInput ? (
              <div className="leaderboard-entry">
                <input className="name-input-field" type="text" placeholder="Tu Alias" value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={10} />
                <button onClick={saveToLeaderboard}>REGISTRAR</button>
              </div>
            ) : (
              <button onClick={startGame}>REINTENTAR</button>
            )}
          </div>
        )}
      </main>

      <footer className="game-footer">
        <p>Byte Hunter v2.0 | 2026</p>
      </footer>
    </div>
  );
}

export default App;