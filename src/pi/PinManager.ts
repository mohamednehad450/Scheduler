import EventEmitter from "events";
import { BaseSequence, Pin } from "../db/types";
import {
  pinSetup,
  clearSequenceTimer,
  setSequenceTimer,
  pinRead,
} from "./helpers";
import { config, gpio } from "./utils";

import type { GpioManager, PinManagerEvents, SequenceTimer } from "./helpers";

class PinManager extends EventEmitter implements GpioManager {
  private pins: Map<Pin["channel"], Pin> = new Map();
  private reservedPins: Map<Pin["channel"], BaseSequence["id"]> = new Map();
  private sequenceTimers: Map<BaseSequence["id"], SequenceTimer> = new Map();

  constructor() {
    super();
  }

  emit<K extends keyof PinManagerEvents>(
    event: K,
    ...args: Parameters<PinManagerEvents[K]>
  ) {
    return super.emit(event, ...args);
  }

  on<K extends keyof PinManagerEvents>(
    event: K,
    listener: (...args: Parameters<PinManagerEvents[K]>) => void
  ) {
    return super.on(event, listener as any);
  }

  removeListener<K extends keyof PinManagerEvents>(
    event: K,
    listener: (...args: Parameters<PinManagerEvents[K]>) => void
  ) {
    return super.removeListener(event, listener as any);
  }

  addListener<K extends keyof PinManagerEvents>(
    event: K,
    listener: (...args: Parameters<PinManagerEvents[K]>) => void
  ) {
    return super.addListener(event, listener as any);
  }

  start = async (pins: Pin[]) => {
    const { boardMode } = config;
    gpio.setMode(boardMode);

    await Promise.all(
      pins.map(async (pin) => this.pins.set(pin.channel, await pinSetup(pin)))
    );

    this.cleanup = async () => {
      await Promise.resolve(
        Array.from(this.sequenceTimers.keys()).map((id) => this.stop(id))
      );
      await gpio.promise.destroy().catch(console.error);
      this.pins.clear();
      this.reservedPins.clear();
      this.sequenceTimers.clear();
      this.cleanup = undefined;
    };
  };

  cleanup?: () => Promise<void> = undefined;

  // New pin has been defined
  insert = async (pin: Pin) => this.pins.set(pin.channel, await pinSetup(pin));

  running = () => {
    return Array.from(this.sequenceTimers.keys());
  };

  run = (sequence: BaseSequence) => {
    if (this.sequenceTimers.has(sequence.id)) {
      this.emit("runError", "ALREADY_RUNNING", sequence.id);
      return `Sequence: ${sequence.name} is already running.`;
    }

    const channels = new Set(sequence.orders.map((o) => o.channel));

    const reserved = Array.from(channels).filter((channel) =>
      this.reservedPins.has(channel)
    );
    if (reserved.length) {
      this.emit("runError", "CHANNEL_IN_USE", sequence.id, reserved);
      return `(channels: [${reserved.join(", ")}] are reserved.`;
    }

    const notInitialized = Array.from(channels).filter(
      (channel) => !this.pins.has(channel)
    );
    if (notInitialized.length) {
      this.emit(
        "runError",
        "CHANNEL_NOT_INITIALIZED",
        sequence.id,
        notInitialized
      );
      return `(channels: [${notInitialized.join(
        ", "
      )}] are not loaded, Reset PinManager.`;
    }

    channels.forEach((channel) => this.reservedPins.set(channel, sequence.id));

    const onChannelChange = (state: { [key: Pin["channel"]]: boolean }) =>
      this.emit("channelChange", state);
    const cleanup = () => {
      channels.forEach((channel) => this.reservedPins.delete(channel));
      this.sequenceTimers.delete(sequence.id);
      this.emit("finish", sequence.id);
    };
    this.sequenceTimers.set(
      sequence.id,
      setSequenceTimer(sequence, this.pins, onChannelChange, cleanup)
    );
    this.emit("run", sequence.id);
  };

  stop = async (id: BaseSequence["id"]) => {
    const sequenceTimer = this.sequenceTimers.get(id);
    if (!sequenceTimer) {
      return;
    }

    const pins = await clearSequenceTimer(sequenceTimer);

    const status: { [key: Pin["channel"]]: boolean } = {};
    pins.forEach((pin) => {
      this.reservedPins.delete(pin.channel);
      status[pin.channel] = false;
    });

    this.sequenceTimers.delete(id);
    this.emit("channelChange", status);
    this.emit("stop", id);
  };

  channelsStatus = async () => {
    const status: { [key: Pin["channel"]]: boolean } = {};
    for (const [channel, pin] of this.pins) {
      status[channel] = await pinRead(pin);
    }
    return status;
  };

  getReservedPins = () => {
    return Array.from(this.reservedPins.entries()).map(
      ([channel, sequenceId]) => {
        const pin = this.pins.get(channel) as Pin;
        return { pin, sequenceId };
      }
    );
  };
}

export default PinManager;
