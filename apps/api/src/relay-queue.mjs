/** One process owns a relayer key. Keep simulation and broadcast in the same queue. */
export class RelayQueue {
  #tail = Promise.resolve();
  #pending = 0;
  constructor(maxPending = 100) {
    if (!Number.isSafeInteger(maxPending) || maxPending < 1) throw new Error('invalid_queue_limit');
    this.maxPending = maxPending;
  }
  run(operation) {
    if (this.#pending >= this.maxPending) return Promise.reject(new Error('relayer_busy'));
    this.#pending++;
    const result = this.#tail.then(operation);
    this.#tail = result.then(() => {}, () => {}).finally(() => { this.#pending--; });
    return result;
  }
}
