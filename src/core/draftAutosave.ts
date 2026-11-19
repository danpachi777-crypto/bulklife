// A library mutation must cancel a pending debounce and wait for an in-flight
// write. Waiting for promises alone does not cover a timer that has not fired.
export function draftAutosave<T>(
  write: (value: T) => Promise<void>,
  onError: (error: unknown) => void,
  delay = 300,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let tail = Promise.resolve();
  const cancelPending = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return {
    schedule(value: T) {
      cancelPending();
      timer = setTimeout(() => {
        timer = null;
        tail = tail.then(() => write(value)).catch(onError);
      }, delay);
    },
    cancelPending,
    drain: () => tail,
    takeOver() {
      cancelPending();
      return tail;
    },
  };
}
