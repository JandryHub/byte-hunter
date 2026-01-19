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
  const [level, setLevel] = useState(1); // Nivel actual

  // --- Persistencia (LocalStorage) ---
  const [highScore, setHighScore] = useState(
    parseInt(localStorage.getItem('byteHunterScore')) || 0
  );
  const [leaderboard, setLeaderboard] = useState(
    JSON.parse(localStorage.getItem('byteHunterLeaderboard')) || []
  );
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);

  // Dificultad: Los virus salen más rápido en cada nivel (mínimo 250ms)
  const spawnRate = Math.max(250, 1000 - (level - 1) * 150); 

  // --- Sistema de Récords ---
  const checkHighScores = useCallback((finalScore) => {
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('byteHunterScore', finalScore.toString());
    }
    const lastScore = leaderboard.length > 0 ? leaderboard[leaderboard.length - 1].score : 0;
    // Entra al leaderboard si supera al último o si hay menos de 5 registros
    if ((leaderboard.length < 5 || finalScore > lastScore) && finalScore > 0) {
      setShowNameInput(true);
    } else {
      setShowNameInput(false);
    }
  }, [highScore, leaderboard]);

  // --- Ciclo de Vida del Juego ---
  useEffect(() => {
    if (gameState !== 'playing') return;

    // Cronómetro Progresivo
    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // ALERTA: Si el tiempo acaba, SUBES DE NIVEL (no pierdes)
          setLevel(curr => curr + 1);
          return 60; // Te damos 60 segundos más para el nuevo nivel
        }
        return prev - 1;
      });
    }, 1000);

    // Generador de Enemigos
    const spawnerInterval = setInterval(() => {
      spawnTarget();
    }, spawnRate);

    return () => {
      clearInterval(timerInterval);
      clearInterval(spawnerInterval);
    };
  }, [gameState, spawnRate]); // Se actualiza cuando cambia el nivel (spawnRate)

  // --- Mecánicas de Juego ---
  const spawnTarget = () => {
    const id = Date.now();
    const rand = Math.random();
    
    let type = 'virus'; 
    if (rand < 0.2) type = 'file'; // Archivo (No tocar)
    else if (rand < 0.35 && level >= 2) type = 'trojan'; // Troyano (Solo nivel 2+)

    const x = Math.random() * 80 + 10; 
    const y = Math.random() * 60 + 20; 

    setTargets((prev) => [...prev, { id, x, y, type }]);

    // Desaparecen más rápido en niveles altos
    const disappearTime = Math.max(800, 2500 - (level * 150));
    setTimeout(() => {
      setTargets((prev) => prev.filter((t) => t.id !== id));
    }, disappearTime);
  };

  const handleTargetClick = (id, type) => {
    setTargets((prev) => prev.filter((t) => t.id !== id));

    if (type === 'virus') {
      setScore(prev => prev + (10 * level)); // Más puntos por nivel
    } else if (type === 'file') {
      setScore(prev => Math.max(0, prev - 10));
      updateIntegrity(15); // Daño medio
    } else if (type === 'trojan') {
      setScore(prev => Math.max(0, prev - 50));
      updateIntegrity(35); // Daño crítico
    }
  };

  const updateIntegrity = (damage) => {
    setIntegrity(prev => {
      const newIntegrity = prev - damage;
      if (newIntegrity <= 0) {
        setGameState('gameover');
        // Usamos el score actual del estado para el check
        setScore(currentScore => {
            checkHighScores(currentScore);
            return currentScore;
        });
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
    setGameState('menu'); // Vuelve al menú tras guardar
  };

  return (
    <div className="game-container">
      {/* Indicador de Nivel Flotante (Arriba Derecha) */}
      {gameState === 'playing' && (
        <div className="level-display">
          NIVEL {level}
        </div>
      )}

      <header>
        <h1>BYTE HUNTER 🛡️</h1>
      </header>
      
      <div className="stats">
        <div className="stats-info">
          <span>PUNTOS: {score}</span>
          <span className={timeLeft <= 10 ? 'timer-warning' : ''}>
            TIEMPO: {timeLeft}s
          </span>
        </div>
        
        {/* Barra de Vida */}
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
            <p>👾 Virus (+pts) | 📁 Archivo (-vida)</p>
            <p>⚠️ Troyano (DANGER - Nivel 2+)</p>
            <p style={{marginTop: '15px', color: '#fff'}}>Récord Local: {highScore}</p>
            <button onClick={startGame}>INICIAR ESCANEO</button>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="menu">
            <h2 style={{ color: 'red' }}>SISTEMA COMPROMETIDO</h2>
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
                <h4>TOP 5 HACKERS</h4>
                {leaderboard.length > 0 ? (
                    leaderboard.map((e, i) => (
                        <div key={i} className="leaderboard-item">
                            <span>{i+1}. {e.name}</span>
                            <span>{e.score}</span>
                        </div>
                    ))
                ) : <p>Sin registros</p>}
                <button onClick={startGame} style={{marginTop: '20px'}}>REINTENTAR</button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="game-footer">
        <p>Byte Hunter v3.0 | Desarrollado por JandryHub | 2026</p>
      </footer>
    </div>
  );
}

export default App;