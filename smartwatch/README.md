# ErgoFocus - Smartwatch Companion App (Wear OS)

Aplicación compañera ligera (**Thin Companion**) para relojes inteligentes con Wear OS, diseñada para complementar la aplicación móvil ErgoFocus.

---

## 1. Principio Rector y Arquitectura

* **SSOT (Single Source of Truth):** La app móvil de ErgoFocus es el cerebro que procesa todos los sensores (luz, micrófono, acelerómetro, giroscopio) y mantiene la sesión de enfoque activa.
* **Thin Companion:** El reloj no realiza peticiones directas a Supabase ni almacena bases de datos SQLite locales.
* **Interacciones ultra-rápidas:** Interfaces concebidas para consultas y controles de 2 a 5 segundos (Glanceable UI).
* **Feedback Háptico:** Avisos vibratorios discretos en muñeca ante posturas sedentarias prolongadas (>= 60 min) o ambientes ruidosos (>= 70 dB).

---

## 2. Pantallas de la Aplicación

La navegación utiliza un **Swipe Pager horizontal** optimizado para pantallas circulares con fondo negro OLED (`#000000`):

```
┌───────────────────────┐   swipe   ┌───────────────────────┐   swipe   ┌───────────────────────┐
│     PANTALLA 1        │  ◄─────►  │     PANTALLA 2        │  ◄─────►  │     PANTALLA 3        │
│    Enfoque Activo     │           │   Salud Ambiental     │           │   Acciones Rápidas    │
│                       │           │                       │           │                       │
│     ╭──────────╮      │           │      [🔊 54 dB]       │           │  ┌─────────────────┐  │
│    │   18:42    │     │           │       ÓPTIMO          │           │  │  Pausa de 5 min │  │
│     ╰──────────╯      │           │                       │           │  └─────────────────┘  │
│   Distracciones: 2    │           │      [💡 420 lx]      │           │  ┌─────────────────┐  │
│                       │           │       ADECUADO        │           │  │   Me Levanté    │  │
│   [ ⏸ Pausar ]       │           │                       │           │  └─────────────────┘  │
│   [ ⏹ Terminar ]     │           │    [🪑 45m sentado]   │           │    Móvil: Conectado   │
└───────────────────────┘           └───────────────────────┘           └───────────────────────┘
```

1. **Pantalla 1 - Enfoque Activo (Home):**
   * Arco de progreso circular (`react-native-svg`).
   * Tiempo restante en tipografía grande (`PlusJakartaSans`).
   * Estado: *Enfocado*, *En Pausa*, *En Descanso*.
   * Contador de distracciones detectadas por giroscopio del teléfono en tiempo real.
   * Controles: Alternar Pausa/Reanudar y Terminar.

2. **Pantalla 2 - Salud Ambiental (Semáforo Ergonómico):**
   * **Ruido:** Verde (< 65 dB, Óptimo), Amarillo (65-70 dB, Moderado), Rojo (>= 70 dB, Peligro).
   * **Luz:** Verde (300-500 lux, Adecuado), Amarillo fuera de rango (Deficiente o Excesivo).
   * **Sedentarismo:** Minutos transcurridos desde el último movimiento físico.

3. **Pantalla 3 - Acciones Rápidas y Conectividad:**
   * Botón "Pausa de 5 min" (Trigger RPC hacia el móvil).
   * Botón "Me Levanté" (Reseteo de sedentarismo).
   * Indicador visual del enlace Bluetooth con el teléfono móvil.
   * Herramientas de prueba háptica y simulación en vivo.

---

## 3. Contrato de Datos y Canales de Comunicación

### Wearable Data Layer API (Google Play Services)

* **DataItem (`/ergofocus/state`):** Canal unidireccional (Móvil ➔ Reloj). Sincroniza el snapshot del estado:
```typescript
export interface SmartwatchStatePayload {
  session: {
    isActive: boolean;
    isPaused: boolean;
    mode: 'focus' | 'break';
    remainingSeconds: number;
    totalSeconds: number;
    distractionsCount: number;
  };
  ambient: {
    noiseDb: number;
    noiseStatus: 'optimal' | 'warning' | 'danger';
    lightLux: number;
    lightStatus: 'optimal' | 'warning';
    sedentaryMinutes: number;
    sedentaryAlert: boolean;
  };
  syncedAt: number;
}
```

* **MessageClient (`/ergofocus/command`):** Canal instantáneo RPC (Reloj ➔ Móvil):
```typescript
export type SmartwatchCommand =
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'FINISH_SESSION' }
  | { type: 'START_BREAK'; durationMinutes: number }
  | { type: 'ACKNOWLEDGE_SEDENTARY' };
```

---

## 4. Avisos Hápticos Silenciosos

Al recibir un nuevo payload donde `sedentaryAlert === true` o `ambient.noiseStatus === 'danger'`, el reloj ejecuta:
```typescript
Vibration.vibrate([0, 250, 100, 250]);
```
Esto notifica discretamente al usuario en la muñeca sin emitir sonidos molestos en su entorno de trabajo.

---

## 5. Ejecución y Desarrollo

### Requisitos
* Node.js v18+
* Expo CLI / React Native

### Pasos
1. Entrar al directorio del smartwatch:
   ```bash
   cd smartwatch
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Iniciar el servidor de desarrollo:
   ```bash
   npm start
   # o para probar directamente en el emulador de Wear OS:
   npm run android
   ```
4. El reloj incluye un modo interactivo de simulación para validar toda la UI, navegación y hápticos aun sin un smartwatch físico enlazado en el momento.
