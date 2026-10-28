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
} from '../types';

type StateListener = (payload: SmartwatchStatePayload) => void;

class WearableClient {
  private stateListeners: Set<StateListener> = new Set();
  private nativeModule: any = null;
  private eventEmitter: NativeEventEmitter | null = null;
  private isConnected: boolean = false;
  private broadcastChannel: any = null;
  private eventSource: any = null;

  constructor() {
    this.initWearableBridge();
    this.initWebBridge();
  }

  private initWearableBridge() {
    // Busca módulos nativos de Wear OS Data Layer
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
        const handleDataChanged = (event: any) => {
          if (event?.path === WEARABLE_STATE_PATH && event?.data) {
            try {
              const payload: SmartwatchStatePayload =
                typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
              this.isConnected = true;
              this.notifyListeners(payload);
            } catch (err) {
              console.warn('[WearableClient] Error deserializing state payload:', err);
            }
          }
        };

        const handleNodeConnected = () => {
          this.isConnected = true;
        };

        const handleNodeDisconnected = () => {
          this.isConnected = false;
        };

        if (typeof this.nativeModule.addListener === 'function') {
          this.nativeModule.addListener('onWearDataChanged', handleDataChanged);
          this.nativeModule.addListener('onWearNodeConnected', handleNodeConnected);
          this.nativeModule.addListener('onWearNodeDisconnected', handleNodeDisconnected);
        } else {
          this.eventEmitter = new NativeEventEmitter(this.nativeModule);
          this.eventEmitter.addListener('onWearDataChanged', handleDataChanged);
          this.eventEmitter.addListener('onWearNodeConnected', handleNodeConnected);
          this.eventEmitter.addListener('onWearNodeDisconnected', handleNodeDisconnected);
        }
      } catch (e) {
        console.log('[WearableClient] Native Wear OS bridge running in standalone / dev mode');
      }
    }
  }

  private initWebBridge() {
    if (Platform.OS !== 'web' && typeof window === 'undefined') return;

    // 1. BroadcastChannel para comunicación web instantánea
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.broadcastChannel = new BroadcastChannel('ergofocus_wear_bridge');
        this.broadcastChannel.onmessage = (event: any) => {
          if (event?.data?.type === 'STATE_UPDATE' && event.data.payload) {
            this.isConnected = true;
            this.notifyListeners(event.data.payload);
          }
        };
      }
    } catch (e) {}

    // 2. Conexión al servidor de retransmisión local (SSE en http://localhost:9099)
    try {
      if (typeof EventSource !== 'undefined') {
        this.eventSource = new EventSource('http://localhost:9099/events');
        this.eventSource.onmessage = (event: any) => {
          try {
            const data = JSON.parse(event.data);
            if (data?.type === 'STATE_UPDATE' && data.payload) {
              this.isConnected = true;
              this.notifyListeners(data.payload);
            }
          } catch (e) {}
        };
        this.eventSource.onopen = () => {
          this.isConnected = true;
        };
      }
    } catch (e) {}
  }

  public subscribe(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  public notifyListeners(payload: SmartwatchStatePayload): void {
    for (const listener of this.stateListeners) {
      try {
        listener(payload);
      } catch (err) {
        console.error('[WearableClient] Listener invocation failed:', err);
      }
    }
  }

  /**
   * Envía un comando RPC al teléfono mediante MessageClient (/ergofocus/command)
   * o vía BroadcastChannel y Relay HTTP en la web
   */
  public async sendCommand(command: SmartwatchCommand): Promise<boolean> {
    if (Platform.OS === 'android' && this.nativeModule?.sendMessage) {
      try {
        await this.nativeModule.sendMessage(WEARABLE_COMMAND_PATH, JSON.stringify(command));
        return true;
      } catch (err) {
        console.warn('[WearableClient] Error sending message via MessageClient:', err);
        return false;
      }
    }

    // Web / Navegador: Broadcast local y Relay HTTP
    if (Platform.OS === 'web' || typeof window !== 'undefined') {
      try {
        if (this.broadcastChannel) {
          this.broadcastChannel.postMessage({ type: 'COMMAND', command });
        }
      } catch (e) {}

      try {
        fetch('http://localhost:9099/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(command),
        }).catch(() => {});
      } catch (e) {}

      return true;
    }

    return true;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }
}

export const wearableClient = new WearableClient();
