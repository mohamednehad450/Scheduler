type Order = { duration: number; offset: number; channel: number };
type Period = { start: number; end: number };

const isOverlapping = (t1: Period, t2: Period): boolean => {
  /* 
      Condition 1
          |--- Period 1 ---|
              | --- Period 2 --- |
  
      Condition 2
              | --- Period 1 --- |
          | --- Period 2 ---- |
  
      Condition 3
          | -------- Period 1 -------- |
              | --- Period 2 --- |
  
      Condition 4
              | --- Period 1 --- |
          | -------- Period 2 -------- |
  
      
      credit: https://stackoverflow.com/a/7325171
      */
  if (t1.start == t2.start || t1.end == t2.end) {
    return true; // If any set is the same time, then by default there must be some overlap.
  }

  if (t1.start < t2.start) {
    if (t1.end > t2.start && t1.end < t2.end) {
      return true; // Condition 1
    }
    if (t1.end > t2.end) {
      return true; // Condition 3
    }
  } else {
    if (t2.end > t1.start && t2.end < t1.end) {
      return true; // Condition 2
    }
    if (t2.end > t1.end) {
      return true; // Condition 4
    }
  }
  return false;
};

const getPeriodFromOrder = (order: Order) => ({
  start: order.offset,
  end: order.offset + order.duration,
});

const areOrdersOverlapping = (order: Order, arr: Order[]): boolean => {
  const t1 = getPeriodFromOrder(order);
  return arr.some((o) => isOverlapping(t1, getPeriodFromOrder(o)));
};

export const overlappingOrdersValidator = (orders: unknown) => {
  // Sort by channel and save original index
  const channels = new Map<number, Order[]>();

  (orders as Order[]).forEach((order) => {
    if (channels.has(order.channel)) {
      channels.get(order.channel)?.push(order);
    } else {
      channels.set(order.channel, [order]);
    }
  });

  for (const [_, orderArr] of channels) {
    // skip channels with only 1 order
    if (orderArr.length <= 1) continue;
    for (let i = 0; i < orderArr.length; i++) {
      if (areOrdersOverlapping(orderArr[i], orderArr.slice(i + 1))) {
        return false;
      }
    }
  }
  return true;
};
const validPins = [
  3, 5, 7, 8, 10, 11, 12, 13, 15, 16, 18, 19, 21, 22, 23, 24, 26, 29, 31, 32,
  33, 35, 36, 37, 38, 40,
] as const;

export type ValidChannel = (typeof validPins)[number];
export function isValidChannel(pin: unknown): pin is ValidChannel {
  return validPins.some((p) => p === pin);
}
