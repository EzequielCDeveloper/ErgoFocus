/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ErgoFocus - Suite de Pruebas Automatizadas de Integración y Smartwatch
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------
// 1. Simulación y verificación del servicio de la app móvil
// ---------------------------------------------------------

class MockWearableService {
  constructor() {
    this.listeners = new Set();
    this.lastSyncedPayload = null;
  }

  onCommand(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispatchCommand(command) {
    for (const listener of this.listeners) {
      listener(command);
    }
  }

  syncState(payload) {
    this.lastSyncedPayload = payload;
    return true;
  }

  static calculateNoiseStatus(decibels) {
    if (decibels === null) return 'optimal';
    if (decibels < 65) return 'optimal';
    if (decibels < 70) return 'warning';
    return 'danger';
  }

  static calculateLightStatus(lux) {
    if (lux === null) return 'optimal';
    if (lux >= 300 && lux <= 500) return 'optimal';
    return 'warning';
  }
}

// ---------------------------------------------------------
// 2. Simulación y verificación de la lógica del Smartwatch
// ---------------------------------------------------------

class MockWatchEngine {
  constructor() {
    this.vibrations = [];
    this.lastVibrationTime = 0;
    this.prevSedentaryAlert = false;
    this.prevNoiseStatus = 'optimal';
    this.hapticPattern = [0, 250, 100, 250];
    this.payload = {
      session: {
        isActive: true,
        isPaused: false,
        mode: 'focus',
        remainingSeconds: 18 * 60 + 42,
        totalSeconds: 25 * 60,
        distractionsCount: 2,
      },
      ambient: {
        noiseDb: 54,
        noiseStatus: 'optimal',
        lightLux: 420,
        lightStatus: 'optimal',
        sedentaryMinutes: 45,
        sedentaryAlert: false,
      },
      syncedAt: Date.now(),
    };
  }

  vibrate(pattern) {
    this.vibrations.push({ pattern, time: Date.now() });
  }

  receivePayload(newPayload, now = Date.now()) {
    const isSedentaryTrigger =
      newPayload.ambient.sedentaryAlert && !this.prevSedentaryAlert;
    const isNoiseDangerTrigger =
      newPayload.ambient.noiseStatus === 'danger' &&
      this.prevNoiseStatus !== 'danger';

    if ((isSedentaryTrigger || isNoiseDangerTrigger) && now - this.lastVibrationTime > 5000) {
      this.lastVibrationTime = now;
      this.vibrate(this.hapticPattern);
    }

    this.prevSedentaryAlert = newPayload.ambient.sedentaryAlert;
    this.prevNoiseStatus = newPayload.ambient.noiseStatus;
    this.payload = newPayload;
  }

  formatTime(remainingSeconds) {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  calculateProgress(totalSeconds, remainingSeconds) {
    if (totalSeconds <= 0) return 0;
    const elapsed = totalSeconds - remainingSeconds;
    return Math.min(1, Math.max(0, elapsed / totalSeconds));
  }

  getAmbientBadge(ambient) {
    // Ruido
    let noiseLabel = 'ÓPTIMO';
    if (ambient.noiseDb >= 70 || ambient.noiseStatus === 'danger') noiseLabel = 'PELIGRO';
    else if (ambient.noiseDb >= 65 || ambient.noiseStatus === 'warning') noiseLabel = 'MODERADO';

    // Luz
    let lightLabel = 'ADECUADO';
    if (ambient.lightLux < 300) lightLabel = 'DEFICIENTE';
    else if (ambient.lightLux > 500) lightLabel = 'EXCESIVO';

    // Sedentarismo
    let sedentaryLabel = 'ACTIVO';
    if (ambient.sedentaryMinutes >= 60 || ambient.sedentaryAlert) sedentaryLabel = '¡LEVÁNTATE!';
    else if (ambient.sedentaryMinutes >= 45) sedentaryLabel = 'ATENCIÓN';

    return { noiseLabel, lightLabel, sedentaryLabel };
  }
}

// ---------------------------------------------------------
// EJECUCIÓN DE PRUEBAS
// ---------------------------------------------------------

test('1. Umbrales Ambientales del Móvil (Ruido y Luz)', () => {
  // Ruido: < 65 dB óptimo, 65-70 dB warning, >= 70 dB danger
  assert.equal(MockWearableService.calculateNoiseStatus(45), 'optimal');
  assert.equal(MockWearableService.calculateNoiseStatus(64.9), 'optimal');
  assert.equal(MockWearableService.calculateNoiseStatus(65), 'warning');
  assert.equal(MockWearableService.calculateNoiseStatus(69.9), 'warning');
  assert.equal(MockWearableService.calculateNoiseStatus(70), 'danger');
  assert.equal(MockWearableService.calculateNoiseStatus(85), 'danger');

  // Luz: 300 - 500 lux óptimo, fuera de rango warning
  assert.equal(MockWearableService.calculateLightStatus(250), 'warning');
  assert.equal(MockWearableService.calculateLightStatus(300), 'optimal');
  assert.equal(MockWearableService.calculateLightStatus(420), 'optimal');
  assert.equal(MockWearableService.calculateLightStatus(500), 'optimal');
  assert.equal(MockWearableService.calculateLightStatus(600), 'warning');
});

test('2. Sincronización Móvil -> Smartwatch (Contrato de Datos)', () => {
  const service = new MockWearableService();
  const testPayload = {
    session: {
      isActive: true,
      isPaused: false,
      mode: 'focus',
      remainingSeconds: 1200,
      totalSeconds: 1500,
      distractionsCount: 3,
    },
    ambient: {
      noiseDb: 58,
      noiseStatus: 'optimal',
      lightLux: 450,
      lightStatus: 'optimal',
      sedentaryMinutes: 30,
      sedentaryAlert: false,
    },
    syncedAt: Date.now(),
  };

  const success = service.syncState(testPayload);
  assert.equal(success, true);
  assert.deepEqual(service.lastSyncedPayload, testPayload);
  assert.equal(service.lastSyncedPayload.session.distractionsCount, 3);
});

test('3. Comandos RPC Smartwatch -> Móvil (MessageClient)', () => {
  const service = new MockWearableService();
  const receivedCommands = [];

  const unsubscribe = service.onCommand((cmd) => {
    receivedCommands.push(cmd);
  });

  service.dispatchCommand({ type: 'TOGGLE_PAUSE' });
  service.dispatchCommand({ type: 'START_BREAK', durationMinutes: 5 });
  service.dispatchCommand({ type: 'ACKNOWLEDGE_SEDENTARY' });
  service.dispatchCommand({ type: 'FINISH_SESSION' });

  assert.equal(receivedCommands.length, 4);
  assert.equal(receivedCommands[0].type, 'TOGGLE_PAUSE');
  assert.deepEqual(receivedCommands[1], { type: 'START_BREAK', durationMinutes: 5 });
  assert.equal(receivedCommands[2].type, 'ACKNOWLEDGE_SEDENTARY');
  assert.equal(receivedCommands[3].type, 'FINISH_SESSION');

  unsubscribe();
  service.dispatchCommand({ type: 'TOGGLE_PAUSE' });
  assert.equal(receivedCommands.length, 4, 'El listener fue desuscrito correctamente');
});

test('4. Avisos Hápticos Silenciosos en la Muñeca (Vibración)', () => {
  const watch = new MockWatchEngine();
  const baseTime = 1000000;

  // Estado normal: sin vibración
  watch.receivePayload({
    ...watch.payload,
    ambient: { ...watch.payload.ambient, noiseStatus: 'optimal', sedentaryAlert: false },
  }, baseTime);
  assert.equal(watch.vibrations.length, 0);

  // Alerta 1: Exceso de ruido (>= 70 dB / danger) -> DEBE VIBRAR
  watch.receivePayload({
    ...watch.payload,
    ambient: { ...watch.payload.ambient, noiseStatus: 'danger', sedentaryAlert: false },
  }, baseTime + 1000);
  assert.equal(watch.vibrations.length, 1);
  assert.deepEqual(watch.vibrations[0].pattern, [0, 250, 100, 250]);

  // Si se mantiene en danger dentro del cooldown de 5 seg -> NO VIBRA DE NUEVO INNECESARIAMENTE
  watch.receivePayload({
    ...watch.payload,
    ambient: { ...watch.payload.ambient, noiseStatus: 'danger', sedentaryAlert: false },
  }, baseTime + 2000);
  assert.equal(watch.vibrations.length, 1);

  // Alerta 2: Sedentarismo activado después de enfriamiento -> DEBE VIBRAR
  watch.receivePayload({
    ...watch.payload,
    ambient: { ...watch.payload.ambient, noiseStatus: 'optimal', sedentaryAlert: true },
  }, baseTime + 7000);
  assert.equal(watch.vibrations.length, 2);
  assert.deepEqual(watch.vibrations[1].pattern, [0, 250, 100, 250]);
});

test('5. Formato de Pantalla y Progreso Circular del Reloj', () => {
  const watch = new MockWatchEngine();

  // 18m 42s -> "18:42"
  assert.equal(watch.formatTime(18 * 60 + 42), '18:42');
  // 5m 0s -> "05:00"
  assert.equal(watch.formatTime(300), '05:00');
  // 9s -> "00:09"
  assert.equal(watch.formatTime(9), '00:09');

  // Progreso circular (25 min total, 18:42 restante)
  // total = 1500s, transcurrido = 378s -> 378 / 1500 = 0.252 (25.2%)
  const progress = watch.calculateProgress(25 * 60, 18 * 60 + 42);
  assert.ok(Math.abs(progress - 0.252) < 0.001);
});

test('6. Semáforo Ambiental en Pantalla del Smartwatch', () => {
  const watch = new MockWatchEngine();

  // Condiciones de prueba según mockup de la especificación
  const badges = watch.getAmbientBadge({
    noiseDb: 54,
    noiseStatus: 'optimal',
    lightLux: 420,
    lightStatus: 'optimal',
    sedentaryMinutes: 45,
    sedentaryAlert: false,
  });

  assert.equal(badges.noiseLabel, 'ÓPTIMO');
  assert.equal(badges.lightLabel, 'ADECUADO');
  assert.equal(badges.sedentaryLabel, 'ATENCIÓN');

  // Condiciones adversas
  const dangerBadges = watch.getAmbientBadge({
    noiseDb: 75,
    noiseStatus: 'danger',
    lightLux: 150,
    lightStatus: 'warning',
    sedentaryMinutes: 65,
    sedentaryAlert: true,
  });

  assert.equal(dangerBadges.noiseLabel, 'PELIGRO');
  assert.equal(dangerBadges.lightLabel, 'DEFICIENTE');
  assert.equal(dangerBadges.sedentaryLabel, '¡LEVÁNTATE!');
});
