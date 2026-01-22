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

  // --- 🔊 MOTOR DE AUDIO (SINTETIZADOR) ---
  const playSound = useCallback((type) => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;

    if (type === 'virus') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } 
    else if (type === 'file' || type === 'trojan') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(50, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
    else if (type === 'levelup') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);       
      osc.frequency.setValueAtTime(554, now + 0.1); 
      osc.frequency.setValueAtTime(659, now + 0.2); 
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    }
    else if (type === 'gameover') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(10, now + 1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0, now + 1);
      osc.start(now);
      osc.stop(now + 1);
    }
  }, []);
  
  // --- Lógica de Puntos y Nivel ---
  const POINTS_PER_LEVEL = 150;
  const targetTotalScore = level * POINTS_PER_LEVEL;
  const currentLevelProgress = Math.max(0, score - ((level - 1) * POINTS_PER_LEVEL));

  const scoreRef = useRef(score);
  useEffect(() => { scoreRef.current = score; }, [score]);

  // --- Datos y Leaderboard ---
  const [localHighScore, setLocalHighScore] = useState(
    parseInt(localStorage.getItem('byteHunterScore')) || 0
  );
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);

  const fetchLeaderboard = async () => {
    try {
      const q = query(collection(db, "scores"), orderBy("score", "desc"), limit(5));
      const querySnapshot = await getDocs(q);
      setLeaderboard(querySnapshot.docs.map(doc => doc.data()));
    } catch (error) { console.error("Error leaderboard:", error); }
  };

  useEffect(() => { fetchLeaderboard(); }, []);

  const checkHighScores = useCallback((finalScore) => {
    if (finalScore > localHighScore) {
      setLocalHighScore(finalScore);
      localStorage.setItem('byteHunterScore', finalScore.toString());
    }
    if (finalScore > 0) setShowNameInput(true);
  }, [localHighScore]);

  const saveToLeaderboard = async () => {
    if (!playerName.trim()) return alert("¡Escribe un nombre!");
    try {
      await addDoc(collection(db, "scores"), { name: playerName, score: score, date: new Date() });
      await fetchLeaderboard();
      setShowNameInput(false); setPlayerName(''); setGameState('menu');
    } catch (error) { alert("Error: " + error.message); }
  };

  // --- EFECTOS DE JUEGO ---

  // 1. Subir Nivel
  useEffect(() => {
    if (gameState === 'playing' && score >= targetTotalScore) {
      setLevel(prev => prev + 1);
      setTimeLeft(30); 
      playSound('levelup'); 
    }
  }, [score, targetTotalScore, gameState, playSound]);

  // 2. Reloj y Game Over
  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('gameover');
          playSound('gameover'); 
          checkHighScores(scoreRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState, checkHighScores, playSound]);

  // 3. Corazón de Vida (Lento - 10s)
  useEffect(() => {
    if (gameState !== 'playing') { setShowHeart(false); return; }
    const heartSpawner = setInterval(() => {
      setShowHeart(true);
      setHeartClicks(0);
      setTimeout(() => setShowHeart(false), 10000); 
    }, 60000); 
    return () => clearInterval(heartSpawner);
  }, [gameState]);

  const handleHeartClick = (e) => {
    e.stopPropagation(); 
    const newClicks = heartClicks + 1;
    setHeartClicks(newClicks);
    playSound('virus'); 

    if (newClicks >= 3) {
      setIntegrity(prev => Math.min(100, prev + 10));
      setShowHeart(false);
      playSound('levelup'); 
    }
  };

  // 4. Spawner de Enemigos (PARTÍCULAS)
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
    
    // IMPORTANTE: isHit en false al crear
    setTargets((prev) => [...prev, { id, x, y, type, isHit: false }]);
    
    const disappearTime = Math.max(800, 2500 - (level * 150));
    setTimeout(() => { 
      // Solo borrar si NO ha sido golpeado (si fue golpeado, se encarga el otro efecto)
      setTargets((prev) => prev.filter((t) => t.id !== id && !t.isHit)); 
    }, disappearTime);
  };

  // --- LÓGICA DE CLIC (CON ANIMACIÓN DE EXPLOSIÓN) ---
  const handleTargetClick = (id, type) => {
    // 1. Marcar como golpeado (activa animación CSS)
    setTargets(prev => prev.map(t => t.id === id ? { ...t, isHit: true } : t));

    // 2. Puntos y sonido inmediatos
    if (type === 'virus') {
      setScore(prev => prev + 10);
      playSound('virus'); 
    } else if (type === 'file') { 
      setScore(prev => Math.max(0, prev - 10)); 
      updateIntegrity(15);
      playSound('file'); 
    } else if (type === 'trojan') { 
      setScore(prev => Math.max(0, prev - 50)); 
      updateIntegrity(35);
      playSound('trojan'); 
    }

    // 3. Borrar tras 0.5s (fin de animación)
    setTimeout(() => {
      setTargets(prev => prev.filter(t => t.id !== id));
    }, 500);
  };

  const updateIntegrity = (damage) => {
    setIntegrity(prev => {
      const newIntegrity = prev - damage;
      if (newIntegrity <= 0) {
        setGameState('gameover');
        playSound('gameover');
        checkHighScores(scoreRef.current);
        return 0;
      }
      return newIntegrity;
    });
  };

  const startGame = () => {
    setScore(0); setIntegrity(100); setTimeLeft(30); setLevel(1); setTargets([]);
    setShowHeart(false); setShowNameInput(false); setGameState('playing');
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) new AudioContext().resume();
  };

  return (
    <div className="game-container">
      {gameState === 'playing' && <div className="level-display"><div>NIVEL {level}</div></div>}

      <header><h1>BYTE HUNTER 🛡️</h1></header>
      
      <div className="stats">
        <div className="stats-info">
          {/* --- AQUÍ ESTÁ EL SCORE GENERAL QUE FALTABA --- */}
          <span className="total-score-display">SCORE: {score}</span>
          <span className="separator">|</span>
          <span style={{ color: currentLevelProgress >= POINTS_PER_LEVEL ? '#00ff41' : 'white' }}>
            PROGRESO: {currentLevelProgress} / {POINTS_PER_LEVEL}
          </span>
          <span className="separator">|</span>
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
            {/* Targets con soporte de toque móvil y partículas */}
            {targets.map((target) => ( <Target key={target.id} {...target} onClick={handleTargetClick} /> ))}
            
            {showHeart && (
              <div className="recovery-heart" onMouseDown={handleHeartClick} onTouchStart={(e) => { e.preventDefault(); handleHeartClick(e); }}>
                ❤️<span className="heart-clicks">{3 - heartClicks}</span>
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
              <div className="instruction-item"><span className="icon">❤️</span><p><strong>RECOVERY:</strong> Lento (10s).<br/><span>Click x3 = +10% Vida</span></p></div>
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
      <footer className="game-footer"><p>Byte Hunter v11.0 | 2026</p></footer>
    </div>
  );
}

export default App;