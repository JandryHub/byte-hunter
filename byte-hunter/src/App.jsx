import React, { useState, useEffect } from 'react';
import Target from './components/Target';
import './App.css';

function App() {
  const [gameState, setGameState] = useState('menu'); // Estados: menu, playing, gameover
  const [score, setScore] = useState(0);
  const [integrity, setIntegrity] = useState(100); 
  const [timeLeft, setTimeLeft] = useState(60);
  const [targets, setTargets] = useState([]); 
  const [highScore, setHighScore] = useState(
  parseInt(localStorage.getItem('byteHunterScore')) || 0
);
// Cargamos la lista de récords o una vacía si no hay nada
const [leaderboard, setLeaderboard] = useState(
  JSON.parse(localStorage.getItem('byteHunterLeaderboard')) || []
);
const [playerName, setPlayerName] = useState('');
const [showNameInput, setShowNameInput] = useState(false);

  // Configuración
  const SPAWN_RATE = 1000; 

  useEffect(() => {
    if (gameState !== 'playing') return;

    // Reloj del juego
    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
  setGameState('gameover');
  checkHighScores(score); 
  return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Generador de enemigos
    const spawnerInterval = setInterval(() => {
      spawnTarget();
    }, SPAWN_RATE);

    return () => {
      clearInterval(timerInterval);
      clearInterval(spawnerInterval);
    };
  }, [gameState]);

  const spawnTarget = () => {
    const id = Date.now();
    const type = Math.random() > 0.3 ? 'virus' : 'file'; 
    const x = Math.random() * 80 + 10; 
    const y = Math.random() * 60 + 20; 

    setTargets((prev) => [...prev, { id, x, y, type }]);

    // Desaparecen solos después de 3 segundos
    setTimeout(() => {
      setTargets((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const handleTargetClick = (id, type) => {
    setTargets((prev) => prev.filter((t) => t.id !== id));

    if (type === 'virus') {
      setScore(score + 10);
    } else {
      setScore(score - 5);
      setIntegrity(prev => {
        const newIntegrity = prev - 20;
        // Dentro de handleTargetClick o donde restas integridad:
if (newIntegrity <= 0) {
  setGameState('gameover');
  checkHighScores(score); // Llamamos a la función que revisa si hubo récord
};
        return newIntegrity;
      });
    }
  };

  const startGame = () => {
    setScore(0);
    setIntegrity(100);
    setTimeLeft(60);
    setTargets([]);
    setGameState('playing');
  };
  const checkHighScores = (currentScore) => {
  // 1. Actualizar récord personal simple
  if (currentScore > highScore) {
    setHighScore(currentScore);
    localStorage.setItem('byteHunterScore', currentScore);
  }

  // 2. Verificar si entra en el Top 5
  const isTopScore = leaderboard.length < 5 || currentScore > leaderboard[leaderboard.length - 1]?.score;
  
  if (isTopScore && currentScore > 0) {
    setShowNameInput(true); // Esto hará que cargue la pantalla para poner el nombre
  } else {
    setShowNameInput(false); // Si no hay récord, muestra la tabla directamente
  }
};

  const saveToLeaderboard = () => {
  if (playerName.trim() === '') return;

  const newEntry = { name: playerName, score: score };
  const updatedLeaderboard = [...leaderboard, newEntry]
    .sort((a, b) => b.score - a.score) // Ordenar de mayor a menor
    .slice(0, 5); // Guardar solo los 5 mejores

  setLeaderboard(updatedLeaderboard);
  localStorage.setItem('byteHunterLeaderboard', JSON.stringify(updatedLeaderboard));
  setShowNameInput(false);
  setPlayerName('');
};

  // Dentro del useEffect o donde manejas el Game Over:
if (gameState === 'gameover') {
  // Actualizar récord personal simple
  if (score > highScore) {
    setHighScore(score);
    localStorage.setItem('byteHunterScore', score);
  }
  
  // Si el puntaje es lo suficientemente alto para entrar al Top 5
  const isTopScore = leaderboard.length < 5 || score > leaderboard[leaderboard.length - 1]?.score;
  if (isTopScore && score > 0) {
    setShowNameInput(true);
  }
}

  return (
    <div className="game-container">
      <h1>BYTE HUNTER 🛡️</h1>
      
      <div style={{ display: 'flex', gap: '20px', fontSize: '1.5rem', color: '#00ff41' }}>
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
          <p>Click en 👾 (+10 pts) | Evita 📁 (-20% vida)</p>
          <button onClick={startGame}>INICIAR ESCANEO</button>
        </div>
      )}

      {gameState === 'gameover' && (
  <div className="menu">
    <h2 style={{ color: 'red' }}>SISTEMA COMPROMETIDO</h2>
    <h3>Tu puntaje: {score}</h3>
    
    {/* Si el jugador debe ingresar su nombre */}
    {showNameInput ? (
      <div style={{ marginBottom: '20px' }}>
        <p>¡NUEVO RÉCORD DETECTADO!</p>
        <input 
          className="name-input-field"
          type="text" 
          placeholder="Escribe tu Alias"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          maxLength={10}
        />
        <button onClick={saveToLeaderboard}>REGISTRAR</button>
      </div>
    ) : (
      /* Si no hay récord, mostramos la tabla directamente */
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
      </div>
    )}

    {!showNameInput && <button onClick={startGame}>REINTENTAR ESCANEO</button>}
  </div>
)}
    </div>
  );
}

export default App;