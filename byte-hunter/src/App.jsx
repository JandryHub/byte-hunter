import React, { useState, useEffect, useCallback } from 'react';
import Target from './components/Target';
import './App.css';

function App() {
  // --- Estados Principales ---
  const [gameState, setGameState] = useState('menu'); 
  const [score, setScore] = useState(0);
  const [integrity, setIntegrity] = useState(100); 
  const [timeLeft, setTimeLeft] = useState(60);
  const [targets, setTargets] = useState([]); 

  // --- Estados de Persistencia (LocalStorage) ---
  const [highScore, setHighScore] = useState(
    parseInt(localStorage.getItem('byteHunterScore')) || 0
  );
  const [leaderboard, setLeaderboard] = useState(
    JSON.parse(localStorage.getItem('byteHunterLeaderboard')) || []
  );
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);

  const SPAWN_RATE = 1000; 

  // --- Lógica de Récords (Corregida) ---
  const checkHighScores = useCallback((finalScore) => {
    // 1. Actualizar récord personal
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('byteHunterScore', finalScore);
    }

    // 2. Verificar entrada al Top 5
    const isTopScore = leaderboard.length < 5 || finalScore > (leaderboard[leaderboard.length - 1]?.score || 0);
    
    if (isTopScore && finalScore > 0) {
      setShowNameInput(true);
    } else {
      setShowNameInput(false);
    }
  }, [highScore, leaderboard]);

  // --- Ciclo de Vida del Juego ---
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameState('gameover');
          // Capturamos el score actual para el leaderboard
          setScore(currentScore => {
            checkHighScores(currentScore);
            return currentScore;
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const spawnerInterval = setInterval(() => {
      spawnTarget();
    }, SPAWN_RATE);

    return () => {
      clearInterval(timerInterval);
      clearInterval(spawnerInterval);
    };
  }, [gameState, checkHighScores]);

  // --- Funciones de Mecánica ---
  const spawnTarget = () => {
    const id = Date.now();
    const type = Math.random() > 0.3 ? 'virus' : 'file'; 
    const x = Math.random() * 80 + 10; 
    const y = Math.random() * 60 + 20; 

    setTargets((prev) => [...prev, { id, x, y, type }]);

    setTimeout(() => {
      setTargets((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  };

  const handleTargetClick = (id, type) => {
    setTargets((prev) => prev.filter((t) => t.id !== id));

    if (type === 'virus') {
      setScore(prev => prev + 10);
    } else {
      setScore(prev => Math.max(0, prev - 5));
      setIntegrity(prev => {
        const newIntegrity = prev - 20;
        if (newIntegrity <= 0) {
          setGameState('gameover');
          setScore(currentScore => {
            checkHighScores(currentScore);
            return currentScore;
          });
          return 0;
        }
        return newIntegrity;
      });
    }
  };

  const startGame = () => {
    setScore(0);
    setIntegrity(100);
    setTimeLeft(60);
    setTargets([]);
    setShowNameInput(false);
    setGameState('playing');
  };

  const saveToLeaderboard = () => {
    if (playerName.trim() === '') return;

    const newEntry = { name: playerName, score: score };
    const updatedLeaderboard = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    setLeaderboard(updatedLeaderboard);
    localStorage.setItem('byteHunterLeaderboard', JSON.stringify(updatedLeaderboard));
    setShowNameInput(false);
    setPlayerName('');
  };

  // --- Renderizado ---
  return (
    <div className="game-container">
      <h1>BYTE HUNTER 🛡️</h1>
      
      <div className="stats" style={{ display: 'flex', gap: '20px', color: '#00ff41', justifyContent: 'center' }}>
        <span>Puntos: {score}</span>
        <span>Integridad: {integrity}%</span>
        <span>Tiempo: {timeLeft}s</span>
      </div>

      {gameState === 'playing' && (
        <div className="game-board">
          {targets.map((target) => (
            <Target key={target.id} {...target} onClick={handleTargetClick} />
          ))}
        </div>
      )}

      {gameState === 'menu' && (
        <div className="menu">
          <h2>Misión: Eliminar Malware</h2>
          <p>👾 +10 pts | 📁 -20% vida</p>
          <button onClick={startGame}>INICIAR ESCANEO</button>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="menu">
          <h2 style={{ color: 'red' }}>SISTEMA COMPROMETIDO</h2>
          <h3>Score Final: {score}</h3>
          
          {showNameInput ? (
            <div className="leaderboard-entry">
              <p>¡NUEVO RÉCORD EN EL TOP 5!</p>
              <input 
                className="name-input-field"
                type="text" 
                placeholder="Ingresa tu Alias"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={10}
              />
              <button onClick={saveToLeaderboard}>REGISTRAR</button>
            </div>
          ) : (
            <div className="leaderboard-list">
              <h4>TOP 5 HACKERS</h4>
              {leaderboard.length > 0 ? (
                leaderboard.map((entry, index) => (
                  <div key={index} className="leaderboard-item">
                    <span>{index + 1}. {entry.name}</span>
                    <span>{entry.score} pts</span>
                  </div>
                ))
              ) : (
                <p>No hay registros todavía.</p>
              )}
              <button onClick={startGame} style={{ marginTop: '20px' }}>REINTENTAR</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;