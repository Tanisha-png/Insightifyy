export type SyncPhase = 'phase1_manual' | 'phase2_plaid_placeholder';

export type AccountSnapshot = {
  asOfIso: string;
  liquidBalance: number;
  institutionName?: string;
  accountMask?: string;
};

export class PlaidSyncService {
  readonly phase: SyncPhase;

  constructor(phase: SyncPhase) {
    this.phase = phase;
  }

  async connect(): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (this.phase === 'phase1_manual') {
      return { ok: false, reason: 'Manual mode: no account sync enabled.' };
    }
    return { ok: false, reason: 'Plaid sync placeholder: integrate Plaid Link here.' };
  }

  async getLatestSnapshot(): Promise<AccountSnapshot | null> {
    return null;
  }
}

