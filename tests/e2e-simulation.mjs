/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Simulación de ciclo de vida completo:
 * Móvil (Sensores/SSOT) <===> Smartwatch (Wear OS)
 */

console.log('====================================================');
console.log('🚀 INICIANDO SIMULACIÓN AUTOMÁTICA DE ERGOFOCUS');
console.log('   Móvil (Sensores/SSOT) <---> Smartwatch (Wear OS)');
console.log('====================================================\n');

// 1. Lógica del servicio del teléfono
class WearableMobileBridge {
  constructor() {
    this.commandListeners = new Set();
  }

  onCommand(listener) {
    this.commandListeners.add(listener);
    return () => this.commandListeners.delete(listener);
  }

  dispatchCommand(command) {
    for (const listener of this.commandListeners) {
      listener(command);
    }
  }

  calculateNoiseStatus(decibels) {
    if (decibels === null) return 'optimal';
    if (decibels < 65) return 'optimal';
    if (decibels < 70) return 'warning';
    return 'danger';
  }

  calculateLightStatus(lux) {
    if (lux === null) return 'optimal';
    if (lux >= 300 && lux <= 500) return 'optimal';
    return 'warning';
  }
}

const mobileBridge = new WearableMobileBridge();

// 2. Estado en memoria del reloj
let watchDisplayState = null;
let watchHapticEvents = [];

const onStateReceivedAtWatch = (payload) => {
  watchDisplayState = payload;
  console.log(`⌚ [RELOJ RECIBE SNAPSHOT]`);
  console.log(`   - Modo: ${payload.session.mode.toUpperCase()}`);
  console.log(`   - Tiempo Restante: ${Math.floor(payload.session.remainingSeconds / 60)}m ${payload.session.remainingSeconds % 60}s`);
  console.log(`   - Distracciones: ${payload.session.distractionsCount}`);
  console.log(`   - Ruido: ${payload.ambient.noiseDb} dB [${payload.ambient.noiseStatus.toUpperCase()}]`);
  console.log(`   - Luz: ${payload.ambient.lightLux} lx [${payload.ambient.lightStatus.toUpperCase()}]`);
  console.log(`   - Sedentarismo: ${payload.ambient.sedentaryMinutes} min [Alerta: ${payload.ambient.sedentaryAlert ? 'SÍ 🚨' : 'NO'}]`);

  // Verificación del trigger háptico
  if (payload.ambient.sedentaryAlert || payload.ambient.noiseStatus === 'danger') {
    watchHapticEvents.push({
      reason: payload.ambient.sedentaryAlert ? 'Sedentarismo Excesivo' : 'Ruido Peligroso',
      pattern: [0, 250, 100, 250],
      timestamp: Date.now(),
    });
    console.log(`   📳 [HÁPTICO EN MUÑECA] Vibración ejecutada: [0, 250, 100, 250]ms`);
  }
};

// 3. Estado en el teléfono móvil
let mobileFocusSession = {
  isActive: true,
  isPaused: false,
  mode: 'focus',
  remainingSeconds: 25 * 60,
  totalSeconds: 25 * 60,
  distractionsCount: 0,
};

let mobileAmbientReadings = {
  noiseDb: 48,
  lightLux: 410,
  sedentaryMinutes: 20,
  sedentaryAlert: false,
};

// Listener en el teléfono para comandos RPC desde el reloj
mobileBridge.onCommand((cmd) => {
  console.log(`\n📱 [TELÉFONO RECIBE COMANDO RPC]: ${JSON.stringify(cmd)}`);
  if (cmd.type === 'TOGGLE_PAUSE') {
    mobileFocusSession.isPaused = !mobileFocusSession.isPaused;
    console.log(`   -> Estado de pausa alternado a: ${mobileFocusSession.isPaused ? 'EN PAUSA' : 'ACTIVO'}`);
  } else if (cmd.type === 'START_BREAK') {
    mobileFocusSession.mode = 'break';
    mobileFocusSession.remainingSeconds = cmd.durationMinutes * 60;
    mobileFocusSession.totalSeconds = cmd.durationMinutes * 60;
    console.log(`   -> Iniciado descanso de ${cmd.durationMinutes} minutos`);
  } else if (cmd.type === 'ACKNOWLEDGE_SEDENTARY') {
    mobileAmbientReadings.sedentaryMinutes = 0;
    mobileAmbientReadings.sedentaryAlert = false;
    console.log(`   -> Alerta de sedentarismo confirmada por usuario. Minutos reseteados a 0.`);
  }
  syncToWatch();
});

function syncToWatch() {
  const payload = {
    session: { ...mobileFocusSession },
    ambient: {
      noiseDb: Math.round(mobileAmbientReadings.noiseDb),
      noiseStatus: mobileBridge.calculateNoiseStatus(mobileAmbientReadings.noiseDb),
      lightLux: Math.round(mobileAmbientReadings.lightLux),
      lightStatus: mobileBridge.calculateLightStatus(mobileAmbientReadings.lightLux),
      sedentaryMinutes: Math.round(mobileAmbientReadings.sedentaryMinutes),
      sedentaryAlert: mobileAmbientReadings.sedentaryAlert,
    },
    syncedAt: Date.now(),
  };
  onStateReceivedAtWatch(payload);
}

// ----------------------------------------------------------------------
// ETAPAS DEL TEST AUTOMÁTICO
// ----------------------------------------------------------------------

console.log('--- PASO 1: Inicio de sesión de concentración en el móvil ---');
syncToWatch();

console.log('\n--- PASO 2: Giroscopio detecta que el usuario tomó el celular (Distracción) ---');
mobileFocusSession.distractionsCount += 1;
mobileFocusSession.remainingSeconds -= 180; // 3 minutos transcurrieron
syncToWatch();

console.log('\n--- PASO 3: Micrófono detecta ruido ambiental alto (74 dB) ---');
mobileAmbientReadings.noiseDb = 74;
syncToWatch();

console.log('\n--- PASO 4: Usuario presiona "Pausar" en el smartwatch ---');
mobileBridge.dispatchCommand({ type: 'TOGGLE_PAUSE' });

console.log('\n--- PASO 5: Acelerómetro detecta 65 minutos continuos sin movimiento ---');
mobileAmbientReadings.sedentaryMinutes = 65;
mobileAmbientReadings.sedentaryAlert = true;
syncToWatch();

console.log('\n--- PASO 6: Usuario en smartwatch presiona "Me Levanté" ---');
mobileBridge.dispatchCommand({ type: 'ACKNOWLEDGE_SEDENTARY' });

console.log('\n--- PASO 7: Usuario en smartwatch presiona "Pausa de 5 min" ---');
mobileBridge.dispatchCommand({ type: 'START_BREAK', durationMinutes: 5 });

console.log('\n====================================================');
console.log('✅ SIMULACIÓN FINALIZADA CON ÉXITO');
console.log(`   Total de eventos hápticos recibidos: ${watchHapticEvents.length}`);
console.log(`   Último modo en reloj: ${watchDisplayState.session.mode}`);
console.log(`   Últimas distracciones en reloj: ${watchDisplayState.session.distractionsCount}`);
console.log('====================================================');
