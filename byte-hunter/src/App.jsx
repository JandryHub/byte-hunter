import React, { useState, useEffect, useCallback, useRef } from 'react';
import Target from './components/Target';
import './App.css';

// --- IMPORTAMOS FIREBASE ---
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';

function App() {
  // --- Estados del Juego ---
  const [gameState, setGameState] = useState('menu'); 
  const [score, setScore] = useState(0); 
  const [integrity, setIntegrity] = useState(100); 
  const [timeLeft, setTimeLeft] = useState(30); 
  const [targets, setTargets] = useState([]); 
  const [level, setLevel] = useState(1);
  
  const POINTS_PER_LEVEL = 150;
  const targetTotalScore = level * POINTS_PER_LEVEL;
  const currentLevelProgress = score - ((level - 1) * POINTS_PER_LEVEL);

  const scoreRef = useRef(score);
  useEffect(() => { scoreRef.current = score; }, [score]);

  // --- Estados de Datos ---
  // El récord personal lo mantenemos local para que veas TU mejor puntaje
  const [localHighScore, setLocalHighScore] = useState(
    parseInt(localStorage.getItem('byteHunterScore')) || 0
  );
  // El Leaderboard ahora viene de la NUBE (Firebase)
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);

  // --- FUNCIONES DE BASE DE DATOS (NUEVO) ---
  
  // 1. Cargar el Top 5 Mundial desde Firebase
  const fetchLeaderboard = async () => {
    try {
      const q = query(collection(db, "scores"), orderBy("score", "desc"), limit(5));
      const querySnapshot = await getDocs(q);
      const scores = querySnapshot.docs.map(doc => doc.data());
      setLeaderboard(scores);
    } catch (error) {
      console.error("Error cargando leaderboard:", error);
    }
  };

  // Cargar el ranking al iniciar el juego
  useEffect(() => {
    fetchLeaderboard();
  }, []);

  // --- Sistema de Récords ---
  const checkHighScores = useCallback((finalScore) => {
    // Actualizamos récord personal local
    if (finalScore > localHighScore) {
      setLocalHighScore(finalScore);
      localStorage.setItem('byteHunterScore', finalScore.toString());
    }
    
    // Siempre mostramos el input si hiciste puntos, para intentar entrar al ranking global
    if (finalScore > 0) {
      setShowNameInput(true);
    }
  }, [localHighScore]);

  // --- 2. Guardar tu puntaje en Firebase ---
  const saveToLeaderboard = async () => {
    if (playerName.trim() === '') return;
    
    try {
      // Guardamos en la nube
      await addDoc(collection(db, "scores"), {
        name: playerName,
        score: score,
        date: new Date()
      });
      
      // Recargamos el ranking para ver tu nombre ahí
      await fetchLeaderboard();
      
      setShowNameInput(false);
      setPlayerName('');
      setGameState('menu');
    } catch (error) {
      console.error("Error guardando score:", error);
      alert("Error de conexión. Intenta de nuevo.");
    }
  };

  // --- EFECTOS DE JUEGO (Mecánica Intacta) ---
  useEffect(() => {
    if (gameState === 'playing' && score >= targetTotalScore) {
      setLevel(prev => prev + 1);
      setTimeLeft(30); 
    }
  }, [score, targetTotalScore, gameState]);

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

  const spawnRate = Math.max(250, 1000 - (level - 1) * 120); 
  useEffect(() => {
    if (gameState !== 'playing') return;
    const spawner = setInterval(() => { spawnTarget(); }, spawnRate);
    return () => clearInterval(spawner);
  }, [gameState, spawnRate, level]);

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
    setTimeout(() => { setTargets((prev) => prev.filter((t) => t.id !== id)); }, disappearTime);
  };

  const handleTargetClick = (id, type) => {
    setTargets((prev) => prev.filter((t) => t.id !== id));
    if (type === 'virus') setScore(prev => prev + 10);
    else if (type === 'file') { setScore(prev => Math.max(0, prev - 10)); updateIntegrity(15); }
    else if (type === 'trojan') { setScore(prev => Math.max(0, prev - 50)); updateIntegrity(35); }
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

  return (
    <div className="game-container">
      {gameState === 'playing' && (
        <div className="level-display"><div>NIVEL {level}</div></div>
      )}

      <header><h1>BYTE HUNTER 🛡️</h1></header>
      
      <div className="stats">
        <div className="stats-info">
          <span style={{ color: currentLevelProgress >= POINTS_PER_LEVEL ? '#00ff41' : 'white' }}>
            PROGRESO: {currentLevelProgress} / {POINTS_PER_LEVEL}
          </span>
          <span className={timeLeft <= 10 ? 'timer-warning' : ''}>TIEMPO: {timeLeft}s</span>
        </div>
        <div className="health-bar-container">
          <div className={`health-bar-fill ${integrity > 50 ? 'health-green' : integrity > 20 ? 'health-yellow' : 'health-red'}`} style={{ width: `${integrity}%` }}></div>
        </div>
        <span className="integrity-text">INTEGRIDAD: {integrity}%</span>
      </div>

      <main className="game-wrapper">
        {gameState === 'playing' && (
          <div className="game-board">
            {targets.map((target) => ( <Target key={target.id} {...target} onClick={handleTargetClick} /> ))}
          </div>
        )}

        {gameState === 'menu' && (
          <div className="menu">
            <h2>MANUAL DE OPERACIONES</h2>
            <div className="instructions-container">
              <div className="instruction-item"><span className="icon">👾</span><p><strong>VIRUS:</strong> Elimínalos. <br/><span>+10 Puntos</span></p></div>
              <div className="instruction-item"><span className="icon">📁</span><p><strong>ARCHIVO:</strong> No tocar. <br/><span>-15% Vida | -10 Puntos</span></p></div>
              <div className="instruction-item"><span className="icon">⚠️</span><p><strong>TROYANO:</strong> Amenaza (Nivel 2+). <br/><span>-35% Vida | -50 Puntos</span></p></div>
              <div className="mission-box"><p>Obtén <strong>150 puntos</strong> en <strong>30s</strong> para avanzar.</p></div>
            </div>
            {/* Aquí mostramos tu récord personal local */}
            <p style={{fontSize:'0.8rem', color: '#888'}}>Mejor Personal: {localHighScore}</p>
            <button onClick={startGame} className="start-btn">INICIAR ESCANEO</button>
            
            {/* LEADERBOARD MUNDIAL (Firebase) */}
            <div className="leaderboard-list">
              <h4 style={{borderBottom:'1px solid #00ff41', paddingBottom:'5px'}}>🌐 TOP MUNDIAL</h4>
              {leaderboard.length > 0 ? (
                leaderboard.map((entry, index) => (
                  <div key={index} className="leaderboard-item">
                    <span>{index + 1}. {entry.name}</span>
                    <span>{entry.score} pts</span>
                  </div>
                ))
              ) : (
                <p style={{fontSize:'0.8rem'}}>Cargando datos...</p>
              )}
            </div>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="menu">
            <h2 style={{ color: 'red' }}>CONEXIÓN PERDIDA</h2>
            {timeLeft === 0 ? <p style={{color: '#f1c40f'}}>TIEMPO AGOTADO.</p> : <p style={{color: '#ff4141'}}>SISTEMA DESTRUIDO.</p>}
            <h3>Puntos Totales: {score} | Nivel: {level}</h3>
            
            {showNameInput ? (
              <div className="leaderboard-entry">
                <p>¡REGISTRA TU PUNTAJE!</p>
                <input className="name-input-field" type="text" placeholder="Tu Alias" value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={10} />
                <button onClick={saveToLeaderboard}>ENVIAR</button>
              </div>
            ) : (
              <button onClick={startGame}>REINTENTAR</button>
            )}
          </div>
        )}
      </main>

      <footer className="game-footer"><p>Byte Hunter v8.0 (Online) | Desarrollado por JandryHub | 2026</p></footer>
    </div>
  );
}

export default App;