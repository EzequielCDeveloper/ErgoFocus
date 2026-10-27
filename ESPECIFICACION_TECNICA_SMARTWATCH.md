# Especificación Técnica: App Compañera para Smartwatch (Wear OS)

## 1. Visión y Principio Rector

La aplicación de smartwatch actúa como un **Thin Companion (Visualizador y Control Remoto)** dependiente del teléfono.

* **Fuente Única de la Verdad (SSOT):** La app móvil de ErgoFocus.
* **Sin base de datos local pesada ni conexiones de red independientes:** El reloj no realiza peticiones a Supabase ni ejecuta almacenamiento SQLite.
* **Cero procesamiento duplicado de sensores:** Los algoritmos de telemetría (detección de manipulación por giroscopio, umbrales de lux y metering de audio) se ejecutan en el teléfono.
* **Interacciones ultra-rápidas (Glanceable):** Vistas diseñadas para sesiones de uso de 2 a 5 segundos con feedback háptico.

---

## 2. Funciones Viables

| Función | Tipo de Interacción | Descripción |
|---|---|---|
| **Monitor de Enfoque (Timer & Pomodoro)** | Lectura / Control | Muestra el tiempo restante del bloque de concentración y permite pausar/reanudar con un toque. |
| **Contador de Distracciones** | Lectura | Refleja las manipulaciones del teléfono detectadas por el giroscopio del móvil en tiempo real. |
| **Semáforo Ambiental** | Lectura pasiva | Badges de color (Verde/Amarillo/Rojo) con el estado de ruido (dB), luz (lux) y tiempo de sedentarismo. |
| **Avisos Hápticos Silenciosos** | Alerta en muñeca | Vibración configurable cuando el móvil detecta exceso de ruido (>= 70 dB), iluminación deficiente o 1 hora de sedentarismo. |
| **Trigger de Micro-Pausa** | Acción rápida (RPC) | Botón para iniciar descanso ergonómico de 5 minutos o confirmar que el usuario se levantó. |

---

## 3. Arquitectura de Interfaces (3 Pantallas)

Diseño basado en navegación por desplazamiento horizontal (`Swipe Pager`), optimizado para pantallas circulares de Wear OS:

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

### Detalle de Vistas

1. **Pantalla 1: Enfoque / Pomodoro (Home)**
   * Arco de progreso circular (`react-native-svg`).
   * Tiempo restante en tipografía grande y legible (`PlusJakartaSans`).
   * Estado: *Enfocado*, *En Pausa* o *En Descanso*.
   * Botón principal de acción: Alternar Pausa / Reanudar.
2. **Pantalla 2: Semáforo Ambiental (Ergonomía)**
   * 3 tarjetas compactas con indicadores semafóricos según umbrales de ErgoFocus:
     * **Ruido:** Verde (< 65 dB), Amarillo (65-70 dB), Rojo (>= 70 dB).
     * **Luz:** Verde (300-500 lux), Amarillo fuera de rango.
     * **Sedentarismo:** Minutos transcurridos desde el último movimiento.
3. **Pantalla 3: Acciones Rápidas y Conectividad**
   * Botón de reseteo rápido de sedentarismo ("Ya me estiré").
   * Botón para forzar descanso de 5 min.
   * Indicador visual de enlace Bluetooth con el teléfono móvil.

---

## 4. Contrato de Datos y Protocolo de Comunicación

### A. Canal de Sincronización: Wearable Data Layer API

Se utiliza el canal nativo de Google Play Services:
* **`DataClient` (Móvil ➔ Reloj):** Sincroniza el snapshot del estado. Si el reloj se desconecta, al reconectarse recibe la última versión automáticamente.
* **`MessageClient` (Reloj ➔ Móvil):** Envía comandos ligeros e instantáneos de acción (RPC).

### B. Payload de Estado (Móvil ➔ Reloj)

Ruta del DataItem: `/ergofocus/state`

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
  syncedAt: number; // Unix timestamp
}
```

### C. Comandos RPC (Reloj ➔ Móvil)

Ruta del Message: `/ergofocus/command`

```typescript
export type SmartwatchCommand =
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'FINISH_SESSION' }
  | { type: 'START_BREAK'; durationMinutes: number }
  | { type: 'ACKNOWLEDGE_SEDENTARY' };
```

---

## 5. Máquina de Estados y Lógica del Smartwatch

```
                ┌───────────────────────────────┐
                │          INICIALIZAR          │
                └───────────────┬───────────────┘
                                │
                                ▼
                ┌───────────────────────────────┐
       ┌───────►│     ESPERANDO CONEXIÓN        │◄───────┐
       │        └───────────────┬───────────────┘        │
Pérdida│                        │ Recibe DataItem inicial│
Enlace │                        ▼                        │ Desconexión
       │        ┌───────────────────────────────┐        │ Bluetooth
       └────────┤      ESTADO SINCRONIZADO      ├────────┘
                │       (Renderiza Vistas)      │
                └───────────┬───────▲───────────┘
                            │       │
       Usuario presiona     │       │ Móvil procesa y emite
       botón en el reloj    ▼       │ nuevo DataItem actualizado
                ┌───────────────────────────────┐
                │        ENVÍA MENSAJE RPC      │
                │        (MessageClient)        │
                └───────────────────────────────┘
```

1. **Montaje:** El reloj se suscribe al listener de `DataClient`.
2. **Recepción:** Al llegar un nuevo `SmartwatchStatePayload`, actualiza el estado local en memoria (React Context o Zustand ligero).
3. **Hápticos:** Si `sedentaryAlert == true` o `ambient.noiseStatus == 'danger'` en un nuevo payload, invoca `Vibration.vibrate([0, 250, 100, 250])`.
4. **Acción de usuario:** El reloj no recalcula el temporizador ni muta variables globales; envía el comando correspondiente al teléfono mediante `MessageClient`.
