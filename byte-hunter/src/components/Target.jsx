import React from 'react';

function Target({ id, x, y, type, onClick, isHit }) {
  let icon = '👾';
  let isBad = false;

  if (type === 'file') {
    icon = '📁';
    isBad = true;
  } else if (type === 'trojan') {
    icon = '⚠️';
    isBad = true;
  }

  const positionStyle = { 
    left: `${x}%`, 
    top: `${y}%`,
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    // IMPORTANTE: Evita que el navegador seleccione el emoji al tocar rápido
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation' 
  };

  // --- MODO EXPLOSIÓN (PARTÍCULAS) ---
  if (isHit) {
    return (
      <div className={`target-exploding ${isBad ? 'bad-target' : ''}`} style={positionStyle}>
        {[...Array(9)].map((_, i) => <div key={i} className="particle-bit"></div>)}
      </div>
    );
  }

  // --- MODO JUEGO (DETECTAR TOQUE) ---
  return (
    <div 
      className="target-item" 
      style={{ 
        ...positionStyle, 
        cursor: 'pointer', 
        fontSize: type === 'trojan' ? '50px' : '42px', // Un poco más grandes para móvil
        zIndex: 10,
        padding: '10px' // Área de toque invisible extra para facilitar el dedo
      }}
      // Soporte Híbrido: Mouse (PC) y Dedo (Móvil)
      onMouseDown={(e) => {
        if (e.cancelable) e.preventDefault(); // Evita doble disparo
        onClick(id, type);
      }}
      onTouchStart={(e) => {
        if (e.cancelable) e.preventDefault(); // Evita scroll/zoom al tocar
        onClick(id, type);
      }}
    >
      {icon}
    </div>
  );
}

export default Target;