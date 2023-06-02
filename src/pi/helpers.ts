import {
  Pin as DbPin,
  Sequence as DbSequence,
  Order as DbOrder,
} from "../drizzle/schema";
import { gpioConfig, gpio } from "./GPIO";

export type Order = Omit<Omit<DbOrder, "id">, "sequenceId">;

export type Sequence = DbSequence & { orders: Order[] };
export type Pin = DbPin;
export type PinState = { [key: Pin["channel"]]: boolean };

export type OrderTimer = {
  pin: Pin;
  startTimer: NodeJS.Timeout;
  stopTimer: NodeJS.Timeout;
};

export type SequenceTimer = {
  orderTimers: OrderTimer[];
  cleanup: NodeJS.Timeout;
};
export interface GpioManager {
  run: (sequence: Sequence) => { ok: true } | { ok: false; err: string };
  running: () => Sequence["id"][];
  stop: (id: Sequence["id"]) => Promise<void>;
  channelsStatus: () => Promise<PinState>;
  getReservedPins: () => { pin: Pin; sequenceId: Sequence["id"] }[];
  cleanup?: () => Promise<void>;
  start: (pins: Pin[]) => Promise<void>;
  insert: (pin: Pin) => Promise<void>;
}

type RunError =
  | "ALREADY_RUNNING"
  | "CHANNEL_IN_USE"
  | "CHANNEL_NOT_INITIALIZED";

// Used to implement the 'Normally open pin state'
const pState: { [key in Pin["onState"]]: boolean } = {
  HIGH: true,
  LOW: false,
};

export type PinManagerEvents = {
  run: (sequenceId: Sequence["id"]) => void;
  stop: (sequenceId: Sequence["id"]) => void;
  finish: (sequenceId: Sequence["id"]) => void;
  channelChange: (change: { [key: Pin["channel"]]: boolean }) => void;
  runError: (
    error: RunError,
    sequenceId: Sequence["id"],
    badChannel?: Pin["channel"][]
  ) => void;
};

export function orderToTimer(
  pin: Pin,
  { offset, duration }: Order,
  onChange: (state: PinState) => void
): OrderTimer {
  return {
    pin,
    startTimer: setTimeout(() => {
      pinOn(pin)
        .then(() => onChange({ [pin.channel]: true }))
        .catch((err) => {
          // TODO
        });
    }, offset),
    stopTimer: setTimeout(() => {
      pinOff(pin)
        .then(() => onChange({ [pin.channel]: false }))
        .catch((err) => {
          // TODO
        });
    }, offset + duration),
  };
}

export function setSequenceTimer(
  sequence: Sequence,
  pinMap: Map<Pin["channel"], Pin>,
  onChannelChange: (state: PinState) => void,
  cleanup: () => void
): SequenceTimer {
  const orderTimers: OrderTimer[] = sequence.orders.map((order) => {
    const pin = pinMap.get(order.channel) as Pin;
    return orderToTimer(pin, order, onChannelChange);
  });
  const maxDuration =
    Math.max(...sequence.orders.map((r) => r.duration + r.offset)) + 10;
  return {
    orderTimers,
    cleanup: setTimeout(cleanup, maxDuration),
  };
}

export async function clearSequenceTimer(sequenceTimer: SequenceTimer) {
  const pins = new Map<Pin["channel"], Pin>();
  sequenceTimer.orderTimers.forEach(({ startTimer, stopTimer, pin }) => {
    clearTimeout(startTimer);
    clearTimeout(stopTimer);
    pins.set(pin.channel, pin);
  });
  clearTimeout(sequenceTimer.cleanup);
  return await Promise.all(
    Array.from(pins.values()).map(async (pin) => {
      await pinOff(pin);
      return pin;
    })
  );
}

export async function pinSetup(pin: Pin) {
  await gpio.promise.setup(
    pin.channel,
    pin.onState === "LOW" ? gpio.DIR_HIGH : gpio.DIR_LOW
  );
}

export async function pinOn(pin: Pin) {
  return gpio.promise.write(pin.channel, pState[pin.onState]);
}

export async function pinOff(pin: Pin) {
  return gpio.promise.write(pin.channel, !pState[pin.onState]);
}

export async function pinRead(pin: Pin): Promise<boolean> {
  const HIGH = await gpio.promise.read(pin.channel).catch((err) => {
    // TODO
  });
  return pin.onState === "HIGH" ? !!HIGH : !HIGH;
}

export async function setupGPIO(pins: Pin[]) {
  const { boardMode } = gpioConfig;
  gpio.setMode(boardMode);
  await Promise.all(pins.map(async (pin) => await pinSetup(pin)));
}

export async function destroyGPIO() {
  await gpio.promise.destroy().catch(console.error);
}
