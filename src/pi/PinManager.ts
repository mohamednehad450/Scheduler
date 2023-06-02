import EventEmitter from "events";
import {
  pinSetup,
  clearSequenceTimer,
  setSequenceTimer,
  pinRead,
  setupGPIO,
  destroyGPIO,
} from "./helpers";
import type {
  Order,
  PinState,
  Pin,
  Sequence,
  GpioManager,
  PinManagerEvents,
  SequenceTimer,
} from "./helpers";

class PinManager extends EventEmitter implements GpioManager {
  private pins: Map<Pin["channel"], Pin> = new Map();
  private reservedPins: Map<Pin["channel"], Sequence["id"]> = new Map();
  private sequenceTimers: Map<Sequence["id"], SequenceTimer> = new Map();

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
    setupGPIO(pins);

    pins.map((pin) => this.pins.set(pin.channel, pin));

    this.cleanup = async () => {
      await Promise.all(
        Array.from(this.sequenceTimers.keys()).map((id) => this.stop(id))
      );
      await destroyGPIO();
      this.pins.clear();
      this.reservedPins.clear();
      this.sequenceTimers.clear();
      this.cleanup = undefined;
    };
  };

  cleanup?: () => Promise<void> = undefined;

  // New pin has been defined
  insert = async (pin: Pin) =>
    pinSetup(pin)
      .then(() => {
        this.pins.set(pin.channel, pin);
      })
      .catch((err) => {
        console.error("Failed to insert pin: ", pin);
        console.error(err);
      });

  running = () => {
    return Array.from(this.sequenceTimers.keys());
  };

  run = (
    sequence: Sequence & {
      orders: Order[];
    }
  ): { ok: true } | { ok: false; err: string } => {
    // Check for ALREADY_RUNNING Error
    if (this.sequenceTimers.has(sequence.id)) {
      this.emit("runError", "ALREADY_RUNNING", sequence.id);
      return {
        ok: false,
        err: `Sequence: ${sequence.name} is already running.`,
      };
    }

    const channels = new Set(sequence.orders.map((o) => o.channel));

    // Check for CHANNEL_IN_USE Error
    const reserved = Array.from(channels).filter((channel) =>
      this.reservedPins.has(channel)
    );
    if (reserved.length) {
      this.emit("runError", "CHANNEL_IN_USE", sequence.id, reserved);
      return {
        ok: false,
        err: `(channels: [${reserved.join(", ")}] are reserved.`,
      };
    }

    // Check for CHANNEL_NOT_INITIALIZED Error
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
      return {
        ok: false,
        err: `(channels: [${notInitialized.join(
          ", "
        )}] are not loaded, Reset PinManager.`,
      };
    }

    channels.forEach((channel) => this.reservedPins.set(channel, sequence.id));

    const onChannelChange = (state: PinState) =>
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

    return { ok: true };
  };

  stop = async (id: Sequence["id"]) => {
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
