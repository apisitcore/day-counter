export const Logs = {
  log: (...args: any) => log("log", args),
  load: (...args: any) => log("load", args),
};

const getDateTime = () => {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
};

const log = (type: string, ...args: any) => {
  return console.log(`${getDateTime()} [${type}] ${args}`);
};
