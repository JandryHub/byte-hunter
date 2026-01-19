import React, { useState, useEffect, useCallback } from 'react';
import Target from './components/Target';
import './App.css';

function App() {
  // --- Estados del Juego ---
  const [gameState, setGameState] = useState('menu'); 
  const [score, setScore] = useState(0);
  const [integrity, setIntegrity] = useState(100); 
  const [timeLeft, setTimeLeft] = useState(60);
  const [targets, setTargets] = useState([]); 
  const [level, setLevel] = useState(1);
  
  // META DE PUNTOS: Nivel 1 = 150, Nivel 2 = 300...
  const targetScore = level * 150;

  // --- Persistencia ---
  const [highScore, setHighScore] = useState(
    parseInt(localStorage.getItem('byteHunterScore')) || 0
  );
  const [leaderboard, setLeaderboard] = useState(
    JSON.parse(localStorage.getItem('byteHunterLeaderboard')) || []
  );
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);

  // --- Sistema de Récords ---
  const checkHighScores = useCallback((finalScore) => {
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('byteHunterScore', finalScore.toString());
    }
    const lastScore = leaderboard.length > 0 ? leaderboard[leaderboard.length - 1].score : 0;
    if ((leaderboard.length < 5 || finalScore > lastScore) && finalScore > 0) {
      setShowNameInput(true);
    }
  }, [highScore, leaderboard]);

  // --- EFECTO 1: EL RELOJ (Solo baja el tiempo) ---
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // --- EFECTO 2: LÓGICA DE NIVEL (Se activa cuando el tiempo cambia) ---
  useEffect(() => {
    if (timeLeft === 0 && gameState === 'playing') {
      // Verificamos si cumplió la meta
      if (score >= targetScore) {
        // ¡NIVEL SUPERADO!
        setLevel(prev => prev + 1); // Sube 1 nivel exactamente
        setTimeLeft(60);            // Reinicia reloj
      } else {
        // GAME OVER
        setGameState('gameover');
        checkHighScores(score);
      }
    }
  }, [timeLeft, gameState, score, targetScore, checkHighScores]);

  // --- EFECTO 3: GENERADOR DE VIRUS (Spawner) ---
  // La velocidad depende del nivel
  const spawnRate = Math.max(250, 1000 - (level - 1) * 120); 

  useEffect(() => {
    if (gameState !== 'playing') return;

    const spawner = setInterval(() => {
      spawnTarget();
    }, spawnRate);

    return () => clearInterval(spawner);
  }, [gameState, spawnRate, level]); // Se reinicia solo si cambia el nivel

  // --- Funciones de Mecánica ---
  const spawnTarget = () => {
    const id = Date.now();
    const rand = Math.random();
    
    let type = 'virus'; 
    if (rand < 0.2) type = 'file'; 
    else if (rand < 0.35 && level >= 2) type = 'trojan'; 

    const x = Math.random() * 80 + 10; 
    const y = Math.random() * 60 + 20; 

    setTargets((prev) => [...prev, { id, x, y, type }]);

    const disappearTime = Math.max(800, 2500 - (level * 150));
    setTimeout(() => {
      setTargets((prev) => prev.filter((t) => t.id !== id));
    }, disappearTime);
  };

  const handleTargetClick = (id, type) => {
    setTargets((prev) => prev.filter((t) => t.id !== id));

    if (type === 'virus') {
      setScore(prev => prev + 10);
    } else if (type === 'file') {
      setScore(prev => Math.max(0, prev - 10));
      updateIntegrity(15);
    } else if (type === 'trojan') {
      setScore(prev => Math.max(0, prev - 50));
      updateIntegrity(35);
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
    setShowNameInput(false);
    setGameState('playing');
  };

  const saveToLeaderboard = () => {
    if (playerName.trim() === '') return;
    const newEntry = { name: playerName, score: score };
    const updated = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    
    setLeaderboard(updated);
    localStorage.setItem('byteHunterLeaderboard', JSON.stringify(updated));
    setShowNameInput(false);
    setPlayerName('');
    setGameState('menu'); 
  };

  return (
    <div className="game-container">
      {/* HUD Superior Derecha */}
      {gameState === 'playing' && (
        <div className="level-display">
          <div>NIVEL {level}</div>
          <div style={{fontSize: '0.8rem', color: score >= targetScore ? '#00ff41' : '#fff', marginTop: '5px'}}>
            META: {targetScore} PTS
          </div>
        </div>
      )}

      <header>
        <h1>BYTE HUNTER 🛡️</h1>
      </header>
      
      <div className="stats">
        <div className="stats-info">
          {/* El score cambia a verde cuando pasas la meta */}
          <span style={{ color: score >= targetScore ? '#00ff41' : 'white', transition: 'color 0.3s' }}>
            PUNTOS: {score} / {targetScore}
          </span>
          <span className={timeLeft <= 10 ? 'timer-warning' : ''}>
            TIEMPO: {timeLeft}s
          </span>
        </div>
        
        <div className="health-bar-container">
          <div 
            className={`health-bar-fill ${integrity > 50 ? 'health-green' : integrity > 20 ? 'health-yellow' : 'health-red'}`}
            style={{ width: `${integrity}%` }}
          ></div>
        </div>
        <span className="integrity-text">INTEGRIDAD: {integrity}%</span>
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
            <h2>Misión: Purga de Sistema</h2>
            <p>Alcanza la META de puntos antes de que acabe el tiempo.</p>
            <p>👾 Virus (+10) | 📁 Archivo (-Vida)</p>
            <p>⚠️ Troyano (DANGER - Nivel 2+)</p>
            <button onClick={startGame}>INICIAR ESCANEO</button>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="menu">
            <h2 style={{ color: 'red' }}>CONEXIÓN FINALIZADA</h2>
            
            {/* Mensaje dinámico según la causa de muerte */}
            {timeLeft === 0 && score < targetScore ? (
                <p style={{color: '#f1c40f'}}>TIEMPO AGOTADO: No alcanzaste la meta de datos.</p>
            ) : (
                <p style={{color: '#ff4141'}}>FALLO DE INTEGRIDAD: El sistema colapsó.</p>
            )}

            <h3>Puntos Finales: {score}</h3>
            <p>Nivel Alcanzado: {level}</p>
            
            {showNameInput ? (
              <div className="leaderboard-entry">
                <p>¡NUEVO RÉCORD TOP 5!</p>
                <input 
                  className="name-input-field" 
                  type="text" 
                  placeholder="Tu Alias" 
                  value={playerName} 
                  onChange={(e) => setPlayerName(e.target.value)} 
                  maxLength={10} 
                />
                <button onClick={saveToLeaderboard}>REGISTRAR</button>
              </div>
            ) : (
              <div className="leaderboard-list">
                 <button onClick={startGame}>REINTENTAR</button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="game-footer">
        <p>Byte Hunter v5.0 | Desarrollado por JandryHub | 2026</p>
      </footer>
    </div>
  );
}

export default App;