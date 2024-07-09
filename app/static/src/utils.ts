import moment from "moment";

export function initializeSelectedTime(now: Date, round_direction="forward") {
    if (now == undefined) now = new Date();
    var minutes : number;
    if (round_direction == "forward") {
        minutes = Math.ceil(now.getMinutes() / 15) * 15;
    } else {
        minutes = Math.floor(now.getMinutes() / 15) * 15;
    }
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), minutes);
}

export function timeConvert(time: Date | string) {
    // if time is a string, convert to a date
    // if time is a date, keep as is
    if (time instanceof Date) {
        return time;
    }
    return new Date(time);
}

export function dateToWeekID(date: Date | string) {
  date = timeConvert(date);
  return moment(date).format("YYYY.W");
}

export function weekIDToDate(weekID: string) {
  return moment(weekID, "YYYY.W").toDate();
}

type ReactiveUpdateFunctionType<T> = (property: keyof T, value: T[keyof T]) => void;

export function createReactiveState<T extends object>(
  initialState: T, 
  updateFunction: ReactiveUpdateFunctionType<T>
): T {
  return new Proxy(initialState, {
    set(target: T, property: string | symbol, value: any): boolean {
      (target as any)[property] = value;
      updateFunction(property as keyof T, value);
      return true;
    }
  });
}

export function createReactiveArray<T>(
  initialArray: T[],
  updateFunction: (newArray: T[]) => void
): T[] {
  return new Proxy(initialArray, {
    set(target: T[], property: string | symbol, value: any): boolean {
      target[property as any] = value;
      updateFunction([...target]);
      return true;
    },
    get(target: T[], property: string | symbol): any {
      const value = target[property as any];
      if (property === 'push' || property === 'pop' || property === 'shift' || 
          property === 'unshift' || property === 'splice' || property === 'sort' || 
          property === 'reverse') {
        return function(...args: any[]) {
          const result = Array.prototype[property as any].apply(target, args);
          updateFunction([...target]);
          return result;
        };
      }
      return value;
    }
  });
}

export class DefaultMap<K, T> extends Map<K, T> {
  private defaultFactory: () => T;

  constructor(defaultFactory: () => T) {
    super();
    this.defaultFactory = defaultFactory;
  }

  get(key: K) {
    if (!this.has(key)) {
      this.set(key, this.defaultFactory());
    }
    return super.get(key);
  }
}