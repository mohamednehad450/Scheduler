import gpio from "rpi-gpio";

type GpioConfig = {
  validPins: readonly [
    3,
    5,
    7,
    8,
    10,
    11,
    12,
    13,
    15,
    16,
    18,
    19,
    21,
    22,
    23,
    24,
    26,
    29,
    31,
    32,
    33,
    35,
    36,
    37,
    38,
    40
  ];
  boardMode: typeof gpio.MODE_RPI;
};

const config: GpioConfig = {
  validPins: [
    3, 5, 7, 8, 10, 11, 12, 13, 15, 16, 18, 19, 21, 22, 23, 24, 26, 29, 31, 32,
    33, 35, 36, 37, 38, 40,
  ] as const,
  boardMode: gpio.MODE_RPI,
};

function logArgs(func: string, ...args: any) {
  console.log({
    time: new Date().toLocaleTimeString(),
    func,
    args: JSON.stringify(args),
  });
}

if (process.env.NODE_ENV === "development") {
  console.warn("rpi-gpio running in dev mode");

  const channelState = new Map<number, boolean>();

  gpio.promise.destroy = async (...args) => logArgs("destroy", args);

  gpio.promise.setup = async (c, state, ...args) => {
    channelState.set(c, state === "high");
    logArgs("setup", c, state, args);
    return true;
  };
  gpio.setMode = (...args) => logArgs("setMode", args);

  gpio.promise.read = async (c, ...args) => {
    logArgs("read", c, ...args);
    return !!channelState.get(c);
  };

  gpio.promise.write = async (c, bool, ...args) => {
    channelState.set(c, bool);
    logArgs("write", c, bool, args);
  };
}

process.on("exit", async (code) => {
  await gpio.promise.destroy();
});

export { gpio, config as gpioConfig };
