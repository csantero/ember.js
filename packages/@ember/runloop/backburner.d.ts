declare module 'backburner' {
  export default class Backburner {
    join(...args: any[]): void;
    on(...args: any[]): void;
    scheduleOnce(...args: any[]): void;
    schedule(queueName: string, target: Object | null, method: Function | string): void;
  }
}
