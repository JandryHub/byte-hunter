import React from 'react';

const Target = ({ id, x, y, type, onClick }) => {
  const style = {
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    cursor: 'pointer',
    fontSize: '40px', 
    transform: 'translate(-50%, -50%)',
    userSelect: 'none',
    animation: 'popIn 0.3s ease-out'
  };

  // Si es 'virus' mostramos un marcianito, si no, una carpeta
  const content = type === 'virus' ? '👾' : '📁'; 

  return (
    <div style={style} onMouseDown={() => onClick(id, type)}>
      {content}
    </div>
  );
};

export default Target;