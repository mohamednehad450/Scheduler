import EventEmitter from "events";
import { Cron, Pin, Sequence } from "../drizzle/schema";

interface PinsEvents {
  update: (item: Pin) => void;
  insert: (item: Pin) => void;
  remove: (key: Pin["channel"]) => void;
}

export class PinEmitter extends EventEmitter {
  emit<E extends keyof PinsEvents>(
    event: E,
    ...args: Parameters<PinsEvents[E]>
  ) {
    return super.emit(event, ...args);
  }

  on<E extends keyof PinsEvents>(
    event: E,
    listener: (...args: Parameters<PinsEvents[E]>) => void
  ) {
    return super.on(event, listener as any);
  }

  removeListener<E extends keyof PinsEvents>(
    event: E,
    listener: (...args: Parameters<PinsEvents[E]>) => void
  ) {
    return super.removeListener(event, listener as any);
  }

  addListener<E extends keyof PinsEvents>(
    event: E,
    listener: (...args: Parameters<PinsEvents[E]>) => void
  ) {
    return super.addListener(event, listener as any);
  }
}

interface SequenceEvents {
  update: (item: Sequence) => void;
  insert: (item: Sequence) => void;
  remove: (key: Sequence["id"]) => void;
}

export class SequenceEmitter extends EventEmitter {
  emit<E extends keyof SequenceEvents>(
    event: E,
    ...args: Parameters<SequenceEvents[E]>
  ) {
    return super.emit(event, ...args);
  }

  on<E extends keyof SequenceEvents>(
    event: E,
    listener: (...args: Parameters<SequenceEvents[E]>) => void
  ) {
    return super.on(event, listener as any);
  }

  removeListener<E extends keyof SequenceEvents>(
    event: E,
    listener: (...args: Parameters<SequenceEvents[E]>) => void
  ) {
    return super.removeListener(event, listener as any);
  }

  addListener<E extends keyof SequenceEvents>(
    event: E,
    listener: (...args: Parameters<SequenceEvents[E]>) => void
  ) {
    return super.addListener(event, listener as any);
  }
}

interface CronEvents {
  update: (item: Cron) => void;
  insert: (item: Cron) => void;
  remove: (key: Cron["id"]) => void;
}

export class CronEmitter extends EventEmitter {
  emit<E extends keyof CronEvents>(
    event: E,
    ...args: Parameters<CronEvents[E]>
  ) {
    return super.emit(event, ...args);
  }

  on<E extends keyof CronEvents>(
    event: E,
    listener: (...args: Parameters<CronEvents[E]>) => void
  ) {
    return super.on(event, listener as any);
  }

  removeListener<E extends keyof CronEvents>(
    event: E,
    listener: (...args: Parameters<CronEvents[E]>) => void
  ) {
    return super.removeListener(event, listener as any);
  }

  addListener<E extends keyof CronEvents>(
    event: E,
    listener: (...args: Parameters<CronEvents[E]>) => void
  ) {
    return super.addListener(event, listener as any);
  }
}
