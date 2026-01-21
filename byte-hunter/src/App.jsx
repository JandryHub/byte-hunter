import React, { useState, useEffect, useCallback, useRef } from 'react';
import Target from './components/Target';
import './App.css';

function App() {
  // --- Estados del Juego ---
  const [gameState, setGameState] = useState('menu'); 
  const [score, setScore] = useState(0); // Puntaje TOTAL acumulado
  const [integrity, setIntegrity] = useState(100); 
  const [timeLeft, setTimeLeft] = useState(30); 
  const [targets, setTargets] = useState([]); 
  const [level, setLevel] = useState(1);
  
  // CONFIGURACIÓN: Puntos necesarios para superar CADA nivel
  const POINTS_PER_LEVEL = 150;
  
  // CÁLCULO INTELIGENTE:
  // Meta Total = Nivel * 150 (Ej: Nivel 1=150, Nivel 2=300)
  const targetTotalScore = level * POINTS_PER_LEVEL;
  
  // Progreso en el nivel actual (Para que siempre empiece en 0 visualmente)
  // Ej: Si tienes 160 pts y estás en Nivel 2, tu progreso es 10 pts.
  const currentLevelProgress = score - ((level - 1) * POINTS_PER_LEVEL);

  // Ref para acceso seguro en timers
  const scoreRef = useRef(score);
  useEffect(() => { scoreRef.current = score; }, [score]);

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

  // --- EFECTO 1: SUBIR DE NIVEL (Instantáneo) ---
  useEffect(() => {
    if (gameState === 'playing' && score >= targetTotalScore) {
      setLevel(prev => prev + 1);
      setTimeLeft(30); // Reinicia tiempo
      // Nota: No reiniciamos 'score' porque es el acumulado para el Récord
    }
  }, [score, targetTotalScore, gameState]);

  // --- EFECTO 2: RELOJ ---
  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('gameover');
          checkHighScores(scoreRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState, checkHighScores]);

  // --- EFECTO 3: SPAWNER ---
  const spawnRate = Math.max(250, 1000 - (level - 1) * 120); 
  useEffect(() => {
    if (gameState !== 'playing') return;
    const spawner = setInterval(() => { spawnTarget(); }, spawnRate);
    return () => clearInterval(spawner);
  }, [gameState, spawnRate, level]);

  // --- Mecánicas ---
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
    if (type === 'virus') setScore(prev => prev + 10);
    else if (type === 'file') {
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
        checkHighScores(scoreRef.current);
        return 0;
      }
      return newIntegrity;
    });
  };

  const startGame = () => {
    setScore(0); setIntegrity(100); setTimeLeft(30); setLevel(1); setTargets([]);
    setShowNameInput(false); setGameState('playing');
  };

  const saveToLeaderboard = () => {
    if (playerName.trim() === '') return;
    const newEntry = { name: playerName, score: score };
    const updated = [...leaderboard, newEntry].sort((a, b) => b.score - a.score).slice(0, 5);
    setLeaderboard(updated);
    localStorage.setItem('byteHunterLeaderboard', JSON.stringify(updated));
    setShowNameInput(false); setPlayerName(''); setGameState('menu'); 
  };

  return (
    <div className="game-container">
      {gameState === 'playing' && (
        <div className="level-display">
          <div>NIVEL {level}</div>
        </div>
      )}

      <header>
        <h1>BYTE HUNTER 🛡️</h1>
      </header>
      
      <div className="stats">
        <div className="stats-info">
          {/* AQUÍ EL CAMBIO: Muestra progreso relativo (0/150) */}
          <span style={{ color: currentLevelProgress >= POINTS_PER_LEVEL ? '#00ff41' : 'white' }}>
            PROGRESO: {currentLevelProgress} / {POINTS_PER_LEVEL}
          </span>
          <span className={timeLeft <= 10 ? 'timer-warning' : ''}>
            TIEMPO: {timeLeft}s
          </span>
        </div>
        
        <div className="health-bar-container">
          <div className={`health-bar-fill ${integrity > 50 ? 'health-green' : integrity > 20 ? 'health-yellow' : 'health-red'}`} style={{ width: `${integrity}%` }}></div>
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
            <h2>MANUAL DE OPERACIONES</h2>
            <div className="instructions-container">
              <div className="instruction-item">
                <span className="icon">👾</span>
                <p><strong>VIRUS:</strong> Elimínalos. <br/> <span>+10 Puntos</span></p>
              </div>
              <div className="instruction-item">
                <span className="icon">📁</span>
                <p><strong>ARCHIVO:</strong> No tocar. <br/> <span>-15% Vida | -10 Puntos</span></p>
              </div>
              <div className="instruction-item">
                <span className="icon">⚠️</span>
                <p><strong>TROYANO:</strong> Amenaza (Nivel 2+). <br/> <span>-35% Vida | -50 Puntos</span></p>
              </div>
              <div className="mission-box">
                <p>Obtén <strong>150 puntos</strong> en menos de <strong>30s</strong> para avanzar de nivel.</p>
              </div>
            </div>
            <button onClick={startGame} className="start-btn">INICIAR ESCANEO</button>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="menu">
            <h2 style={{ color: 'red' }}>CONEXIÓN PERDIDA</h2>
            {timeLeft === 0 ? (
                <p style={{color: '#f1c40f'}}>TIEMPO AGOTADO: Cuota no alcanzada.</p>
            ) : (
                <p style={{color: '#ff4141'}}>FALLO DE INTEGRIDAD: Sistema destruido.</p>
            )}
            <h3>Puntos Totales: {score} | Nivel: {level}</h3>
            
            {showNameInput ? (
              <div className="leaderboard-entry">
                <p>¡NUEVO RÉCORD TOP 5!</p>
                <input className="name-input-field" type="text" placeholder="Tu Alias" value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={10} />
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
        <p>Byte Hunter v7.0 | Desarrollado por JandryHub | 2026</p>
      </footer>
    </div>
  );
}

export default App;