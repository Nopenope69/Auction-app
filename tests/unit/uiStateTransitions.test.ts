import { describe, it, expect, vi } from 'vitest';

interface BiddingLogEntry {
  id: string;
  playerId: string;
  playerName: string;
  teamId?: string;
  teamName?: string;
  amount: number;
  type: 'bid' | 'rtm' | 'sold' | 'unsold';
}

/**
 * Pure state machine evaluator modeling BidderTerminal's idempotent win detector
 */
class BidderCelebrationDetector {
  private lastCelebratedLotId: string | null = null;

  constructor(private myTeamId: string) {}

  public processBiddingLog(log: BiddingLogEntry[]): { shouldCelebrate: boolean; lotId?: string; player?: string; amount?: number } {
    if (!log.length) return { shouldCelebrate: false };
    const lastEntry = log[log.length - 1];

    if ((lastEntry.type === 'sold' || lastEntry.type === 'rtm') && lastEntry.teamId === this.myTeamId) {
      if (this.lastCelebratedLotId !== lastEntry.id) {
        this.lastCelebratedLotId = lastEntry.id;
        return {
          shouldCelebrate: true,
          lotId: lastEntry.id,
          player: lastEntry.playerName,
          amount: lastEntry.amount,
        };
      }
    }
    return { shouldCelebrate: false };
  }

  public reset() {
    this.lastCelebratedLotId = null;
  }
}

/**
 * Pure state machine evaluator modeling BidderTerminal's outbid detector
 */
class OutbidDetector {
  private previousLeaderId: string | null = null;

  constructor(private myTeamId: string) {}

  public processHighestBidder(currentLeaderId: string | null, newBidAmount: number, newLeaderName: string): { wasOutbid: boolean; message?: string } {
    if (this.previousLeaderId === this.myTeamId && currentLeaderId && currentLeaderId !== this.myTeamId) {
      this.previousLeaderId = currentLeaderId;
      return {
        wasOutbid: true,
        message: `OUTBID: ${newLeaderName} bid ${newBidAmount}L`,
      };
    }
    this.previousLeaderId = currentLeaderId;
    return { wasOutbid: false };
  }
}

/**
 * Pure state machine evaluator modeling InlineConfirm state flow
 */
class InlineConfirmFlow {
  private state: 'idle' | 'confirming' = 'idle';

  public requestAction() {
    this.state = 'confirming';
  }

  public cancel() {
    this.state = 'idle';
  }

  public confirm(onConfirmed: () => void) {
    if (this.state === 'confirming') {
      this.state = 'idle';
      onConfirmed();
    }
  }

  public isConfirming() {
    return this.state === 'confirming';
  }
}

describe('UI State Transitions: Win Celebration Idempotency', () => {
  it('triggers celebration exactly once on server-authoritative LOT_SOLD for my team', () => {
    const detector = new BidderCelebrationDetector('team_csk');

    const log: BiddingLogEntry[] = [
      { id: 'bid_1', playerId: 'p1', playerName: 'Virat Kohli', teamId: 'team_csk', amount: 150, type: 'bid' },
      { id: 'sold_lot_1', playerId: 'p1', playerName: 'Virat Kohli', teamId: 'team_csk', amount: 150, type: 'sold' },
    ];

    const result1 = detector.processBiddingLog(log);
    expect(result1.shouldCelebrate).toBe(true);
    expect(result1.lotId).toBe('sold_lot_1');
    expect(result1.player).toBe('Virat Kohli');
    expect(result1.amount).toBe(150);

    // Reconnection or duplicate log event with same lotId MUST NOT trigger celebration again
    const result2 = detector.processBiddingLog(log);
    expect(result2.shouldCelebrate).toBe(false);
  });

  it('does NOT trigger celebration if sold to a rival team', () => {
    const detector = new BidderCelebrationDetector('team_csk');

    const log: BiddingLogEntry[] = [
      { id: 'bid_1', playerId: 'p1', playerName: 'Virat Kohli', teamId: 'team_mi', amount: 200, type: 'bid' },
      { id: 'sold_lot_1', playerId: 'p1', playerName: 'Virat Kohli', teamId: 'team_mi', amount: 200, type: 'sold' },
    ];

    const result = detector.processBiddingLog(log);
    expect(result.shouldCelebrate).toBe(false);
  });

  it('triggers celebration for a subsequent distinct lot sold to my team', () => {
    const detector = new BidderCelebrationDetector('team_csk');

    // Lot 1 sold to my team
    detector.processBiddingLog([
      { id: 'sold_lot_1', playerId: 'p1', playerName: 'Virat Kohli', teamId: 'team_csk', amount: 150, type: 'sold' },
    ]);

    // Lot 2 sold to my team
    const lot2Log: BiddingLogEntry[] = [
      { id: 'sold_lot_1', playerId: 'p1', playerName: 'Virat Kohli', teamId: 'team_csk', amount: 150, type: 'sold' },
      { id: 'sold_lot_2', playerId: 'p2', playerName: 'Jasprit Bumrah', teamId: 'team_csk', amount: 250, type: 'sold' },
    ];

    const result = detector.processBiddingLog(lot2Log);
    expect(result.shouldCelebrate).toBe(true);
    expect(result.lotId).toBe('sold_lot_2');
    expect(result.player).toBe('Jasprit Bumrah');
  });

  it('handles RTM retention win celebration', () => {
    const detector = new BidderCelebrationDetector('team_csk');

    const log: BiddingLogEntry[] = [
      { id: 'rtm_lot_3', playerId: 'p3', playerName: 'MS Dhoni', teamId: 'team_csk', amount: 180, type: 'rtm' },
    ];

    const result = detector.processBiddingLog(log);
    expect(result.shouldCelebrate).toBe(true);
    expect(result.lotId).toBe('rtm_lot_3');
  });
});

describe('UI State Transitions: Outbid Detection', () => {
  it('detects when user was previously leading and is outbid by a rival team', () => {
    const detector = new OutbidDetector('team_csk');

    // CSK places lead bid
    const leadResult = detector.processHighestBidder('team_csk', 100, 'Chennai Super Kings');
    expect(leadResult.wasOutbid).toBe(false);

    // MI outbids CSK
    const outbidResult = detector.processHighestBidder('team_mi', 110, 'Mumbai Indians');
    expect(outbidResult.wasOutbid).toBe(true);
    expect(outbidResult.message).toContain('Mumbai Indians');
    expect(outbidResult.message).toContain('110L');
  });

  it('does NOT trigger outbid when user was not the leader', () => {
    const detector = new OutbidDetector('team_csk');

    // MI leads
    detector.processHighestBidder('team_mi', 100, 'Mumbai Indians');

    // KKR outbids MI (CSK was not leading)
    const result = detector.processHighestBidder('team_kkr', 110, 'Kolkata Knight Riders');
    expect(result.wasOutbid).toBe(false);
  });
});

describe('UI State Transitions: Inline Confirmation Flow', () => {
  it('requires explicit confirmation before invoking callback and allows cancellation', () => {
    const flow = new InlineConfirmFlow();
    const mockDelete = vi.fn();

    expect(flow.isConfirming()).toBe(false);

    // User clicks delete -> transitions to confirming state
    flow.requestAction();
    expect(flow.isConfirming()).toBe(true);
    expect(mockDelete).not.toHaveBeenCalled();

    // User cancels -> resets to idle without calling delete
    flow.cancel();
    expect(flow.isConfirming()).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();

    // User requests action again and confirms
    flow.requestAction();
    flow.confirm(mockDelete);
    expect(flow.isConfirming()).toBe(false);
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });
});
