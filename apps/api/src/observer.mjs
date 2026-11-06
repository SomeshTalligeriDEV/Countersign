const encode = value => JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v);
const supported = new Set(['PaymentExecuted', 'PaymentRefunded', 'Revoked']);

// RPC adapter supplies strictly decoded logs for the configured Mandate only.
// A deep reorg stops processing; recovery must reconcile already delivered webhooks.
export class ChainObserver {
  constructor({ db, chain, name, startBlock, clock = () => Math.floor(Date.now()/1000) }) {
    if (!name || BigInt(startBlock) < 0n) throw new Error('invalid_observer_config');
    Object.assign(this, { db, chain, name, startBlock: BigInt(startBlock), clock });
    this.running = false;
  }
  async tick() {
    if (this.running) throw new Error('observer_busy');
    this.running = true;
    try {
      if (await this.chain.chainId() !== 1874) throw new Error('wrong_chain');
      const cursor = this.db.prepare('SELECT * FROM observer_cursor WHERE name=?').get(this.name);
      if (cursor && (await this.chain.block(BigInt(cursor.block))).hash !== cursor.block_hash) throw new Error('observer_reorg');
      const head = await this.chain.blockNumber();
      // Three blocks after inclusion, conservatively stronger than counting inclusion.
      const safe = head - 3n;
      let block = cursor ? BigInt(cursor.block) + 1n : this.startBlock;
      let processed = 0;
      // Fast-forward over event-free spans with one ranged getLogs (block-by-block cannot keep up with ~1 block/s chains).
      // Safety: cursor hash re-checked before the jump; the jump target's hash is stored, so the next per-block
      // step still verifies parentHash continuity. Blocks containing events always take the per-block path below.
      if (this.chain.logsInRange && block <= safe) {
        const end = block + 999n < safe ? block + 999n : safe;
        const logs = await this.chain.logsInRange(block, end);
        const stop = logs.length ? logs.reduce((m, l) => (l.blockNumber < m ? l.blockNumber : m), end + 1n) - 1n : end;
        if (stop >= block) {
          const target = await this.chain.block(stop);
          if (cursor && (await this.chain.block(BigInt(cursor.block))).hash !== cursor.block_hash) throw new Error('observer_reorg');
          this.db.prepare('INSERT INTO observer_cursor VALUES (?,?,?) ON CONFLICT(name) DO UPDATE SET block=excluded.block,block_hash=excluded.block_hash').run(this.name, stop.toString(), target.hash);
          block = stop + 1n;
        }
      }
      for (; block <= safe && processed < 100; block++, processed++) {
        const before = await this.chain.block(block);
        const logs = await this.chain.paymentLogs(block);
        if ((await this.chain.block(block)).hash !== before.hash) throw new Error('observer_reorg');
        const previous = this.db.prepare('SELECT * FROM observer_cursor WHERE name=?').get(this.name);
        if (previous && before.parentHash !== previous.block_hash) throw new Error('observer_reorg');
        for (const log of logs) {
          if (log.removed || log.blockNumber !== block || log.blockHash !== before.hash || !supported.has(log.eventName)) throw new Error('invalid_observer_log');
        }
        this.db.exec('BEGIN IMMEDIATE');
        try {
          for (const log of [...logs].sort((a,b)=>a.logIndex-b.logIndex)) {
            const id = `${this.name}:${log.transactionHash}:${log.logIndex}`;
            const payload = encode({ event: log.eventName, ...log.args, observer: this.name, txHash: log.transactionHash, block: block.toString() });
            const inserted = this.db.prepare('INSERT OR IGNORE INTO chain_events VALUES (?,?,?,?,?,?,?)').run(id, block.toString(), before.hash, log.transactionHash, log.logIndex, log.eventName, payload);
            if (inserted.changes && log.eventName === 'PaymentExecuted') {
              const a=log.args;
              this.db.prepare('INSERT INTO confirmed_payments(observer,payment_id,mandate_id,merchant_id,payout,amount,status,tx_hash,payload) VALUES (?,?,?,?,?,?,?,?,?)').run(this.name,a.paymentId,a.mandateId,a.merchantId,a.payout,a.amount.toString(),'settled',log.transactionHash,payload);
              if(this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='approvals'").get()&&this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='relay_transactions'").get()){
               this.db.prepare(`UPDATE approvals SET state='settled' WHERE state='submitted'
                AND json_extract(intent_json,'$.mandateId')=? AND json_extract(intent_json,'$.merchantId')=?
                AND json_extract(intent_json,'$.orderId')=? AND CAST(json_extract(intent_json,'$.amount') AS TEXT)=?
                AND intent_digest IN (SELECT intent_id FROM relay_transactions WHERE tx_hash=?)`).run(a.mandateId,a.merchantId,a.orderId,a.amount.toString(),log.transactionHash);
              }
            }
            if (inserted.changes && log.eventName === 'PaymentRefunded') {
              const a=log.args;
              const payment=this.db.prepare('SELECT * FROM confirmed_payments WHERE observer=? AND payment_id=?').get(this.name,a.paymentId);
              if(!payment)throw new Error('refund_without_payment_backfill_required');
              const total=BigInt(a.totalRefunded);
              if(total>BigInt(payment.amount)||total!==BigInt(payment.refunded)+BigInt(a.amount))throw new Error('invalid_refund_accounting');
              this.db.prepare('UPDATE confirmed_payments SET refunded=?,status=? WHERE observer=? AND payment_id=?').run(total.toString(),total===BigInt(payment.amount)?'refunded':'partially_refunded',this.name,a.paymentId);
            }
            if (inserted.changes && log.eventName !== 'Revoked') {
              const type = log.eventName === 'PaymentExecuted' ? 'payment.succeeded' : 'payment.refunded';
              this.db.prepare('INSERT INTO outbox(id,event_id,payload,next_at) VALUES (?,?,?,?)').run(id,id,encode({type,data:JSON.parse(payload)}),this.clock());
            }
          }
          this.db.prepare('INSERT INTO observer_cursor VALUES (?,?,?) ON CONFLICT(name) DO UPDATE SET block=excluded.block,block_hash=excluded.block_hash').run(this.name,block.toString(),before.hash);
          this.db.exec('COMMIT');
        } catch (error) { this.db.exec('ROLLBACK'); throw error; }
      }
      const latest=this.db.prepare('SELECT block FROM observer_cursor WHERE name=?').get(this.name);
      return { processed, head:head.toString(), confirmedThrough:latest?.block??null, caughtUp:block>safe };
    } finally { this.running = false; }
  }
}
