import React, { useState, useEffect, useCallback, useRef } from 'react';
import Target from './components/Target';
import './App.css';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';

function App() {
  // --- Estados del Juego ---
  const [gameState, setGameState] = useState('tutorial'); 
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
    
    setTargets((prev) => [...prev, { id, x, y, type, isHit: false }]);
    
    const disappearTime = Math.max(800, 2500 - (level * 150));
    setTimeout(() => { 
      setTargets((prev) => prev.filter((t) => t.id !== id && !t.isHit)); 
    }, disappearTime);
  };

  // --- LÓGICA DE CLIC (CON ANIMACIÓN DE EXPLOSIÓN) ---
  const handleTargetClick = (id, type) => {
    setTargets(prev => prev.map(t => t.id === id ? { ...t, isHit: true } : t));

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
            {targets.map((target) => ( <Target key={target.id} {...target} onClick={handleTargetClick} /> ))}
            
            {showHeart && (
              <div className="recovery-heart" onMouseDown={handleHeartClick} onTouchStart={(e) => { e.preventDefault(); handleHeartClick(e); }}>
                ❤️<span className="heart-clicks">{3 - heartClicks}</span>
              </div>
            )}
          </div>
        )}

        {/* --- PANTALLA 1: TUTORIAL / INFORME --- */}
        {gameState === 'tutorial' && (
          <div className="menu tutorial-window">
            <h2 style={{borderBottom: '2px solid #00ff41', paddingBottom: '10px'}}>INFORME DE MISIÓN</h2>
            
            {/* 1. PRIMERO EL OBJETIVO (META) */}
            <div className="mission-box" style={{marginBottom: '20px'}}>
              <p> <strong>OBJETIVO:</strong> Sumar <strong>150 puntos</strong> antes de que acaben los <strong>30s</strong>.</p>
              <hr style={{borderColor: '#00ff41', opacity: 0.3, margin: '8px 0'}}/>
              <p style={{fontSize: '0.8rem', color: '#ddd'}}>
                 <strong>DERROTA SI:</strong> El Tiempo llega a 0s <span style={{color:'#555'}}>|</span> La Integridad cae a 0%
              </p>
            </div>

            {/* 2. LUEGO EL INFORME DE ITEMS */}
            <div className="tutorial-grid">
              
              <div className="tutorial-item good">
                <span className="t-icon">👾</span>
                <div className="t-desc">
                  <strong>VIRUS</strong>
                  <p>Destrúyelos.</p>
                  <span>+10 Puntos</span>
                </div>
              </div>

              <div className="tutorial-item bad">
                <span className="t-icon">📁</span>
                <div className="t-desc">
                  <strong>ARCHIVO</strong>
                  <p>NO TOCAR.</p>
                  <span>-15% Vida</span>
                </div>
              </div>

              <div className="tutorial-item bad">
                <span className="t-icon">⚠️</span>
                <div className="t-desc">
                  <strong>TROYANO</strong>
                  <p>Amenaza (Nv 2+)</p>
                  <span>-35% Vida</span>
                </div>
              </div>

              <div className="tutorial-item heal">
                <span className="t-icon">❤️</span>
                <div className="t-desc">
                  <strong>RECOVERY</strong>
                  <p>Click x3</p>
                  <span>+10% Vida</span>
                </div>
              </div>

            </div>
            
            <button className="ready-btn" onClick={() => setGameState('menu')}>
               ENTENDIDO
            </button>
          </div>
        )}

        {/* --- PANTALLA 2: MENÚ PRINCIPAL --- */}
        {gameState === 'menu' && (
          <div className="menu">
            <h2>SISTEMA LISTO</h2>
            
            {/* Recordatorio breve */}
            <div className="mission-box">
              <p style={{fontSize:'0.9rem'}}> Todo listo para iniciar el escaneo. 👍👍</p>
            </div>
            
            <button onClick={startGame} className="ready-btn">INICIAR ESCANEO</button>
            
            <div className="leaderboard-list">
              <h4 style={{borderBottom:'1px solid #00ff41', paddingBottom:'5px'}}>🌐 TOP MUNDIAL</h4>
              {leaderboard.length > 0 ? leaderboard.map((e, i) => (<div key={i} className="leaderboard-item"><span>{i+1}. {e.name}</span><span>{e.score}</span></div>)) : <p>Cargando...</p>}
            </div>

            <button style={{marginTop:'10px', fontSize:'0.8rem', padding:'8px'}} onClick={() => setGameState('tutorial')}>❓ Ver Informe</button>
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
      <footer className="game-footer"><p>Byte Hunter v12.1 (Briefing Update) | 2026</p></footer>
    </div>
  );
}

export default App;