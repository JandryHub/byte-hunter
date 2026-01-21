import React, { useState, useEffect, useCallback, useRef } from 'react';
import Target from './components/Target';
import './App.css';
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

  // --- Estados del Corazón de Vida ---
  const [showHeart, setShowHeart] = useState(false);
  const [heartClicks, setHeartClicks] = useState(0);
  
  // --- Lógica de Puntos y Nivel ---
  const POINTS_PER_LEVEL = 150;
  const targetTotalScore = level * POINTS_PER_LEVEL;
  const currentLevelProgress = score - ((level - 1) * POINTS_PER_LEVEL);

  // Referencia para usar score dentro de intervalos sin perder valor
  const scoreRef = useRef(score);
  useEffect(() => { scoreRef.current = score; }, [score]);

  // --- Estados de Datos (Firebase & Local) ---
  const [localHighScore, setLocalHighScore] = useState(
    parseInt(localStorage.getItem('byteHunterScore')) || 0
  );
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);

  // --- 1. Cargar Ranking Mundial (Firebase) ---
  const fetchLeaderboard = async () => {
    try {
      const q = query(collection(db, "scores"), orderBy("score", "desc"), limit(5));
      const querySnapshot = await getDocs(q);
      const scores = querySnapshot.docs.map(doc => doc.data());
      setLeaderboard(scores);
    } catch (error) { console.error("Error cargando leaderboard:", error); }
  };

  useEffect(() => { fetchLeaderboard(); }, []);

  // --- 2. Revisar Récord al Perder ---
  const checkHighScores = useCallback((finalScore) => {
    if (finalScore > localHighScore) {
      setLocalHighScore(finalScore);
      localStorage.setItem('byteHunterScore', finalScore.toString());
    }
    // Siempre permite guardar si hiciste puntos
    if (finalScore > 0) setShowNameInput(true);
  }, [localHighScore]);

  // --- 3. Guardar en la Nube ---
  const saveToLeaderboard = async () => {
    if (playerName.trim() === '') { alert("¡Escribe un nombre!"); return; }
    try {
      await addDoc(collection(db, "scores"), { name: playerName, score: score, date: new Date() });
      await fetchLeaderboard();
      setShowNameInput(false); setPlayerName(''); setGameState('menu');
    } catch (error) { alert("Error: " + error.message); }
  };

  // --- LÓGICA DE JUEGO: Subir Nivel Instantáneo ---
  useEffect(() => {
    if (gameState === 'playing' && score >= targetTotalScore) {
      setLevel(prev => prev + 1);
      setTimeLeft(30); // Reinicia reloj a 30s
    }
  }, [score, targetTotalScore, gameState]);

  // --- LÓGICA DE JUEGO: Reloj Principal ---
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

  // --- EVENTO ESPECIAL: Corazón Fugaz (Cada 60s, dura 4s) ---
  useEffect(() => {
    if (gameState !== 'playing') {
      setShowHeart(false);
      return;
    }

    const heartSpawner = setInterval(() => {
      setShowHeart(true);
      setHeartClicks(0);
      
      // Desaparece a los 4 segundos si no lo atrapas
      setTimeout(() => {
        setShowHeart(false);
      }, 4000); 

    }, 60000); // Aparece cada 1 minuto

    return () => clearInterval(heartSpawner);
  }, [gameState]);

  // Click en el corazón
  const handleHeartClick = (e) => {
    e.stopPropagation(); 
    const newClicks = heartClicks + 1;
    setHeartClicks(newClicks);

    if (newClicks >= 3) {
      setIntegrity(prev => Math.min(100, prev + 10)); // Cura 10%
      setShowHeart(false);
    }
  };

  // --- Spawner de Enemigos ---
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
    setShowHeart(false); setShowNameInput(false); setGameState('playing');
  };

  return (
    <div className="game-container">
      {gameState === 'playing' && <div className="level-display"><div>NIVEL {level}</div></div>}

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
            
            {/* CORAZÓN DE VIDA */}
            {showHeart && (
              <div className="recovery-heart" onMouseDown={handleHeartClick}>
                ❤️
                <span className="heart-clicks">{3 - heartClicks}</span>
              </div>
            )}
          </div>
        )}

        {gameState === 'menu' && (
          <div className="menu">
            <h2>MANUAL DE OPERACIONES</h2>
            <div className="instructions-container">
              <div className="instruction-item"><span className="icon">👾</span><p><strong>VIRUS:</strong> Elimínalos.<br/><span>+10 Puntos</span></p></div>
              <div className="instruction-item"><span className="icon">📁</span><p><strong>ARCHIVO:</strong> No tocar.<br/><span>-15% Vida | -10 Puntos</span></p></div>
              <div className="instruction-item"><span className="icon">❤️</span><p><strong>RECOVERY:</strong> ¡Fugaz (4s)!<br/><span>Click x3 = +10% Vida</span></p></div>
              <div className="mission-box"><p>Obtén <strong>150 puntos</strong> en <strong>30s</strong> para avanzar.</p></div>
            </div>
            <p style={{fontSize:'0.8rem', color: '#888'}}>Mejor Personal: {localHighScore}</p>
            <button onClick={startGame} className="start-btn">INICIAR ESCANEO</button>
            
            <div className="leaderboard-list">
              <h4 style={{borderBottom:'1px solid #00ff41', paddingBottom:'5px'}}>🌐 TOP MUNDIAL</h4>
              {leaderboard.length > 0 ? leaderboard.map((e, i) => (<div key={i} className="leaderboard-item"><span>{i+1}. {e.name}</span><span>{e.score}</span></div>)) : <p>Cargando...</p>}
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
            ) : <button onClick={startGame}>REINTENTAR</button>}
          </div>
        )}
      </main>
      <footer className="game-footer"><p>Byte Hunter v9.0 | © 2026</p></footer>
    </div>
  );
}

export default App;