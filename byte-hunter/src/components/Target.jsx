import React from 'react';

const Target = ({ id, x, y, type, onClick }) => {
  // Definimos los íconos según el tipo de objeto
  const icons = {
    virus: '👾',    // + Puntos
    file: '📁',     // - Vida (Error)
    trojan: '⚠️'    // -- Mucha Vida (Nivel 2+)
  };

  const style = {
    position: 'absolute', // Necesario para que use las coordenadas x, y
    left: `${x}%`,
    top: `${y}%`,
    cursor: 'pointer',
    fontSize: '40px', 
    transform: 'translate(-50%, -50%)', // Centra el ícono exactamente en el punto
    userSelect: 'none',
    animation: 'popIn 0.3s ease-out',
    zIndex: 5
  };

  return (
    <div 
      className={`target-item ${type}`} 
      style={style} 
      // onMouseDown es más rápido que onClick para juegos
      onMouseDown={() => onClick(id, type)}
    >
      {icons[type] || '👾'}
    </div>
  );
};

export default Target;