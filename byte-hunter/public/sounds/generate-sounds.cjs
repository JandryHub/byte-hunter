// Este archivo genera sonidos usando Web Audio API
// Ejecutarlo en Node.js para crear los archivos .wav

const fs = require('fs');
const path = require('path');

// Función para crear un archivo WAV simple
function generateWavFile(filename, frequency, duration, type = 'sine') {
  const sampleRate = 44100;
  const samples = sampleRate * duration;
  const buffer = new Float32Array(samples);
  
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const angle = 2 * Math.PI * frequency * t;
    
    switch(type) {
      case 'sine':
        buffer[i] = Math.sin(angle);
        break;
      case 'square':
        buffer[i] = Math.sin(angle) > 0 ? 1 : -1;
        break;
      case 'triangle':
        buffer[i] = Math.asin(Math.sin(angle)) * (2 / Math.PI);
        break;
      default:
        buffer[i] = Math.sin(angle);
    }
    
    // Fade out al final
    const fadeStart = samples * 0.8;
    if (i > fadeStart) {
      buffer[i] *= 1 - ((i - fadeStart) / (samples - fadeStart));
    }
  }
  
  const wavFile = encodeWav(buffer, sampleRate);
  const publicDir = path.join(__dirname);
  fs.writeFileSync(path.join(publicDir, filename), Buffer.from(wavFile));
  console.log(`✓ Creado: ${filename}`);
}

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  
  // WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  
  // Convertir float a 16-bit PCM
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }
  
  return buffer;
}

// Generar sonidos
generateWavFile('virus.wav', 600, 0.2, 'square');  // Sonido más agresivo tipo laser para virus
generateWavFile('trojan.wav', 400, 0.5, 'square');  // Sonido más bajo para trojan
generateWavFile('file.wav', 200, 0.4, 'triangle');  // Sonido grave para archivo
generateWavFile('levelup.wav', 1200, 0.6, 'sine');  // Sonido de victoria para level up
generateWavFile('gameover.wav', 300, 0.8, 'sine');  // Sonido grave y largo para fin de juego

console.log('\n✓ ¡Todos los sonidos fueron creados!');
