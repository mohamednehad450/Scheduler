import { Pin, Sequence } from "../drizzle/schema";
import { gpio } from "./utils";

export interface GpioManager {
  run: (
    data: Sequence & {
      orders: { duration: number; offset: number; channel: number }[];
    }
  ) => string | void;
  running: () => Sequence["id"][];
  stop: (id: Sequence["id"]) => Promise<void>;
  channelsStatus: () => Promise<{ [key: Pin["channel"]]: boolean }>;
  getReservedPins: () => { pin: Pin; sequenceId: Sequence["id"] }[];
  cleanup?: () => Promise<void>;
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

export type OrderTimer = {
  pin: Pin;
  startTimer: NodeJS.Timeout;
  stopTimer: NodeJS.Timeout;
};

export type SequenceTimer = {
  orderTimers: OrderTimer[];
  cleanup: NodeJS.Timeout;
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

export const orderToTimer = (
  pin: Pin,
  order: { duration: number; offset: number; channel: number },
  onChange: (state: { [key: Pin["channel"]]: boolean }) => void
) => ({
  pin,
  startTimer: setTimeout(() => {
    pinOn(pin)
      .then(() => onChange({ [pin.channel]: true }))
      .catch((err) => {
        // TODO
      });
  }, order.offset),
  stopTimer: setTimeout(() => {
    pinOff(pin)
      .then(() => onChange({ [pin.channel]: false }))
      .catch((err) => {
        // TODO
      });
  }, order.duration + order.offset),
});

export const setSequenceTimer = (
  sequence: Sequence & {
    orders: { duration: number; offset: number; channel: number }[];
  },
  pinMap: Map<Pin["channel"], Pin>,
  onChannelChange: (state: { [key: Pin["channel"]]: boolean }) => void,
  cleanup: () => void
): SequenceTimer => {
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
};

export const clearSequenceTimer = async (sequenceTimer: SequenceTimer) => {
  const pins = new Set<Pin>();
  sequenceTimer.orderTimers.forEach(
    ({ startTimer, stopTimer: closeTimer, pin }) => {
      clearTimeout(startTimer);
      clearTimeout(closeTimer);
      pins.add(pin);
    }
  );
  clearTimeout(sequenceTimer.cleanup);
  return await Promise.all(
    Array.from(pins).map(async (pin) => {
      await pinOff(pin);
      return pin;
    })
  );
};

export const pinSetup = async (pin: Pin): Promise<Pin> => {
  await gpio.promise.setup(
    pin.channel,
    pin.onState === "LOW" ? gpio.DIR_HIGH : gpio.DIR_LOW
  );
  return pin;
};

export const pinOn = (pin: Pin) => {
  return gpio.promise.write(pin.channel, pState[pin.onState]);
};

export const pinOff = (pin: Pin) => {
  return gpio.promise.write(pin.channel, !pState[pin.onState]);
};

export const pinRead = async (pin: Pin): Promise<boolean> => {
  const HIGH = await gpio.promise.read(pin.channel).catch((err) => {
    // TODO
  });
  return pin.onState === "HIGH" ? !!HIGH : !HIGH;
};
