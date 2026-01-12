import React, { useState, useEffect } from 'react';
import Target from './components/Target';
import './App.css';

function App() {
  const [gameState, setGameState] = useState('menu'); // Estados: menu, playing, gameover
  const [score, setScore] = useState(0);
  const [integrity, setIntegrity] = useState(100); 
  const [timeLeft, setTimeLeft] = useState(60);
  const [targets, setTargets] = useState([]); 

  // Configuración
  const SPAWN_RATE = 1000; 

  useEffect(() => {
    if (gameState !== 'playing') return;

    // Reloj del juego
    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameState('gameover');
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
        if (newIntegrity <= 0) setGameState('gameover');
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
          <h3>Puntaje Final: {score}</h3>
          <button onClick={startGame}>REINICIAR</button>
        </div>
      )}
    </div>
  );
}

export default App;