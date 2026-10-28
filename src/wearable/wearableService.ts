/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import {
  SmartwatchCommand,
  SmartwatchStatePayload,
  WEARABLE_COMMAND_PATH,
  WEARABLE_STATE_PATH,
} from './types';

type CommandListener = (command: SmartwatchCommand) => void;

class WearableService {
  private commandListeners: Set<CommandListener> = new Set();
  private lastPayload: SmartwatchStatePayload | null = null;
  private nativeModule: any = null;
  private eventEmitter: NativeEventEmitter | null = null;
  private broadcastChannel: any = null;
  private eventSource: any = null;

  constructor() {
    this.initNativeBridge();
    this.initWebBridge();
  }

  private initNativeBridge() {
    // Busca módulos Wear Connectivity si existen en la build nativa de Android
    let expoModule: any = null;
    try {
      expoModule = requireOptionalNativeModule('WearableDataLayerModule');
    } catch (e) {}

    this.nativeModule =
      expoModule ||
      NativeModules.WearConnectivity ||
      NativeModules.WearableDataLayerModule ||
      NativeModules.RNWearDataLayer;

    if (this.nativeModule) {
      try {
        const handleMessage = (event: any) => {
          if (event?.path === WEARABLE_COMMAND_PATH && event?.data) {
            try {
              const command: SmartwatchCommand =
                typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
              this.dispatchCommand(command);
            } catch (err) {
              console.warn('[WearableService] Error parsing command from watch:', err);
            }
          }
        };

        if (typeof this.nativeModule.addListener === 'function') {
          this.nativeModule.addListener('onWearMessageReceived', handleMessage);
        } else {
          this.eventEmitter = new NativeEventEmitter(this.nativeModule);
          this.eventEmitter.addListener('onWearMessageReceived', handleMessage);
        }
      } catch (e) {
        console.log('[WearableService] Native event emitter not available in current environment');
      }
    }
  }

  private initWebBridge() {
    if (Platform.OS !== 'web' && typeof window === 'undefined') return;

    // 1. BroadcastChannel para sincronización directa en el navegador
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.broadcastChannel = new BroadcastChannel('ergofocus_wear_bridge');
        this.broadcastChannel.onmessage = (event: any) => {
          if (event?.data?.type === 'COMMAND' && event.data.command) {
            this.dispatchCommand(event.data.command);
          }
        };
      }
    } catch (e) {
      // Ignorar si no está soportado
    }

    // 2. Conexión al servidor de retransmisión local (SSE en http://localhost:9099)
    try {
      if (typeof EventSource !== 'undefined') {
        this.eventSource = new EventSource('http://localhost:9099/events');
        this.eventSource.onmessage = (event: any) => {
          try {
            const data = JSON.parse(event.data);
            if (data?.type === 'COMMAND' && data.command) {
              this.dispatchCommand(data.command);
            }
          } catch (e) {
            // Ignorar
          }
        };
      }
    } catch (e) {
      // Ignorar si el relay no está activo
    }
  }

  /**
   * Suscribirse a comandos provenientes del reloj
   */
  public onCommand(listener: CommandListener): () => void {
    this.commandListeners.add(listener);
    return () => {
      this.commandListeners.delete(listener);
    };
  }

  /**
   * Despacha un comando recibido desde el reloj hacia la app móvil
   */
  public dispatchCommand(command: SmartwatchCommand): void {
    for (const listener of this.commandListeners) {
      try {
        listener(command);
      } catch (err) {
        console.error('[WearableService] Listener execution error:', err);
      }
    }
  }

  /**
   * Envía el snapshot completo del estado al Smartwatch
   * Vía Wearable Data Layer API (Android) o BroadcastChannel / Relay SSE (Web)
   */
  public async syncState(payload: SmartwatchStatePayload): Promise<boolean> {
    this.lastPayload = payload;

    // Android Nativo
    if (Platform.OS === 'android' && this.nativeModule?.sendDataItem) {
      try {
        await this.nativeModule.sendDataItem(WEARABLE_STATE_PATH, JSON.stringify(payload));
        return true;
      } catch (err) {
        console.warn('[WearableService] Error sending DataItem to Wearable:', err);
        return false;
      }
    }

    // Web / Navegador: Broadcast local y Relay HTTP
    if (Platform.OS === 'web' || typeof window !== 'undefined') {
      try {
        if (this.broadcastChannel) {
          this.broadcastChannel.postMessage({ type: 'STATE_UPDATE', payload });
        }
      } catch (e) {}

      // Intentar enviar al relay HTTP si está activo
      try {
        fetch('http://localhost:9099/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {});
      } catch (e) {}

      return true;
    }

    return true;
  }

  public getLastPayload(): SmartwatchStatePayload | null {
    return this.lastPayload;
  }

  public calculateNoiseStatus(decibels: number | null): 'optimal' | 'warning' | 'danger' {
    return WearableService.calculateNoiseStatus(decibels);
  }

  public calculateLightStatus(lux: number | null): 'optimal' | 'warning' {
    return WearableService.calculateLightStatus(lux);
  }

  /**
   * Determina el estado del semáforo de ruido según especificación ErgoFocus:
   * < 65 dB -> optimal
   * 65-70 dB -> warning
   * >= 70 dB -> danger
   */
  public static calculateNoiseStatus(decibels: number | null): 'optimal' | 'warning' | 'danger' {
    if (decibels === null) return 'optimal';
    if (decibels < 65) return 'optimal';
    if (decibels < 70) return 'warning';
    return 'danger';
  }

  /**
   * Determina el estado del semáforo de luz según especificación ErgoFocus:
   * 300 - 500 lux -> optimal
   * fuera de rango -> warning
   */
  public static calculateLightStatus(lux: number | null): 'optimal' | 'warning' {
    if (lux === null) return 'optimal';
    if (lux >= 300 && lux <= 500) return 'optimal';
    return 'warning';
  }
}

export const wearableService = new WearableService();
