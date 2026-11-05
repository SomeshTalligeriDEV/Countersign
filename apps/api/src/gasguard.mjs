/** Durable conservative reservations. Unknown broadcast outcomes remain charged. */
export class GasGuard {
  constructor(db, config) {
    this.db = db;
    this.config = config;
    if (!/^0x[0-9a-fA-F]{40}$/.test(config.mandateAddress) || /^0x0{40}$/i.test(config.mandateAddress)) throw new Error('invalid_mandate_address');
    for (const key of ['dailyWei', 'mandateDailyWei', 'maxFeePerGas']) {
      if (typeof config[key] !== 'bigint' || config[key] <= 0n) throw new Error(`invalid_${key}`);
    }
  }
  reserve({ id, mandateId, to, functionName, gas, maxFeePerGas, simulationSucceeded }, now = Math.floor(Date.now() / 1000)) {
    const c = this.config;
    let reason;
    if (c.paused) reason = 'relayer_unavailable';
    else if (typeof to !== 'string' || to.toLowerCase() !== c.mandateAddress.toLowerCase() || functionName !== 'pay') reason = 'not_allowlisted_call';
    else if (simulationSucceeded !== true) reason = 'would_revert';
    else if (typeof gas !== 'bigint' || gas <= 0n || typeof maxFeePerGas !== 'bigint' || maxFeePerGas <= 0n || maxFeePerGas > c.maxFeePerGas) reason = 'gas_price_or_limit';
    if (reason) return this.reject(mandateId, reason, now);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (this.db.prepare('SELECT id FROM gas_reservations WHERE id=?').get(id)) throw new Error('duplicate_intent');
      const rows = this.db.prepare("SELECT mandate_id, at, cost FROM gas_reservations WHERE at>? AND status!='released'").all(now - 86400);
      const cost = gas * maxFeePerGas;
      const total = rows.reduce((sum, row) => sum + BigInt(row.cost), 0n);
      const own = rows.filter(row => row.mandate_id === mandateId);
      if (own.filter(row => row.at > now - 3600).length >= 30 || own.reduce((sum,row) => sum + BigInt(row.cost), 0n) + cost > c.mandateDailyWei) throw new Error('budget');
      if (total + cost > c.dailyWei) throw new Error('relayer_unavailable');
      this.db.prepare("INSERT INTO gas_reservations(id,mandate_id,at,cost,status) VALUES(?,?,?,?,'reserved')").run(id,mandateId,now,cost.toString());
      this.db.prepare('INSERT INTO gasguard_log(mandate_id,decision,reason,at) VALUES(?,?,?,?)').run(mandateId,'allow','reserved',now);
      this.db.exec('COMMIT');
      return { id, reservedWei: cost };
    } catch (error) {
      this.db.exec('ROLLBACK');
      return this.reject(mandateId,error.message,now);
    }
  }
  reject(mandateId, reason, now) {
    this.db.prepare('INSERT INTO gasguard_log(mandate_id,decision,reason,at) VALUES(?,?,?,?)').run(mandateId,'deny',reason,now);
    throw new Error(`gasguard_rejected:${reason}`);
  }
}
