import { describe, it, expect, beforeEach } from 'vitest';
import path from 'path';

const TEST_DATA_DIR = path.join(__dirname, '..', '..', 'data_test_unit');
process.env.DATA_DIR = TEST_DATA_DIR;

import { AuctionRoom } from '../../server/src/auctionRoom';
import * as db from '../../server/src/db';
import { AuctionRules, Player, Team } from '../../server/src/types';

describe('AuctionRoom Core State Machine', () => {
  let roomId: string;
  let room: AuctionRoom;

  const testRules: AuctionRules = {
    timerSeconds: 10,
    rtmEnabled: true,
    incrementTiers: [
      { upTo: 100, increment: 5 },
      { upTo: 500, increment: 20 },
    ],
  };

  const sampleTeams: Team[] = [
    {
      id: 'team_csk',
      name: 'Chennai Super Kings',
      code: 'CSK',
      purse: 100,
      originalPurse: 100,
      rtmCards: 1,
      rosterIds: [],
      token: 'tok_csk',
    },
    {
      id: 'team_mi',
      name: 'Mumbai Indians',
      code: 'MI',
      purse: 200,
      originalPurse: 200,
      rtmCards: 1,
      rosterIds: [],
      token: 'tok_mi',
    },
    {
      id: 'team_poor',
      name: 'Low Purse Team',
      code: 'LPT',
      purse: 25,
      originalPurse: 25,
      rtmCards: 1,
      rosterIds: [],
      token: 'tok_poor',
    },
  ];

  const samplePlayers: Player[] = [
    {
      id: 'player_dhoni',
      name: 'MS Dhoni',
      role: 'Wicketkeeper',
      basePrice: 20,
      previousTeamCode: 'CSK',
      status: 'available',
    },
    {
      id: 'player_bumrah',
      name: 'Jasprit Bumrah',
      role: 'Bowler',
      basePrice: 30,
      status: 'available',
    },
  ];

  beforeEach(() => {
    roomId = 'room_' + Math.random().toString(36).slice(2, 10);
    db.createRoom({
      roomId,
      name: 'Test IPL Draft',
      adminToken: 'admin_tok_' + Math.random().toString(36).slice(2, 8),
      rules: testRules,
      teams: sampleTeams,
      players: samplePlayers,
    });
    const snapshot = db.loadRoom(roomId)!;
    room = new AuctionRoom(snapshot);
  });

  it('allows opening bid at exact base price', () => {
    room.setActivePlayer('player_dhoni');
    const stateBefore = room.getFullState();
    expect(stateBefore.currentBid).toBe(0);

    // Opening bid without amount should take base price (20)
    const success = room.placeBid('team_mi');
    expect(success).toBe(true);

    const stateAfter = room.getFullState();
    expect(stateAfter.currentBid).toBe(20);
    expect(stateAfter.highestBidder).toBe('team_mi');
  });

  it('rejects custom opening bid below base price', () => {
    room.setActivePlayer('player_dhoni'); // base price 20
    const success = room.placeBid('team_mi', 15);
    expect(success).toBe(false);
    expect(room.getFullState().currentBid).toBe(0);
  });

  it('increments subsequent bids based on increment tiers', () => {
    room.setActivePlayer('player_dhoni');
    room.placeBid('team_mi'); // 20 (base)
    expect(room.getFullState().currentBid).toBe(20);

    // Next bid from CSK should increment by 5 (since 20 < 100) -> 25
    const cskBid = room.placeBid('team_csk');
    expect(cskBid).toBe(true);
    expect(room.getFullState().currentBid).toBe(25);
    expect(room.getFullState().highestBidder).toBe('team_csk');
  });

  it('rejects self-bidding', () => {
    room.setActivePlayer('player_dhoni');
    room.placeBid('team_mi'); // 20
    // MI tries to bid again immediately
    const secondBid = room.placeBid('team_mi');
    expect(secondBid).toBe(false);
    expect(room.getFullState().currentBid).toBe(20);
  });

  it('rejects bids exceeding team purse', () => {
    room.setActivePlayer('player_bumrah'); // base 30
    // Low purse team has only 25 Lakhs
    const success = room.placeBid('team_poor');
    expect(success).toBe(false);
  });

  it('rejects malformed bid amounts (NaN, negative, zero)', () => {
    room.setActivePlayer('player_dhoni');
    expect(room.placeBid('team_mi', -10)).toBe(false);
    expect(room.placeBid('team_mi', 0)).toBe(false);
    expect(room.placeBid('team_mi', NaN)).toBe(false);
  });

  it('handles sold transition and purse deduction accurately', () => {
    room.setActivePlayer('player_bumrah'); // base 30
    room.placeBid('team_mi'); // 30
    const sold = room.markSold();
    expect(sold).toBe(true);

    const state = room.getFullState();
    expect(state.activePlayer).toBeNull();
    const miTeam = state.teams.find((t) => t.id === 'team_mi');
    expect(miTeam?.purse).toBe(170); // 200 - 30
    const bumrah = state.players.find((p) => p.id === 'player_bumrah');
    expect(bumrah?.status).toBe('sold');
    expect(bumrah?.soldPrice).toBe(30);
    expect(bumrah?.teamId).toBe('team_mi');
  });

  it('prevents RTM team from accepting if purse is insufficient', () => {
    room.setActivePlayer('player_dhoni'); // previous team CSK
    // MI bids 150 (CSK purse is only 100)
    room.placeBid('team_mi', 150);
    // Trigger markSold -> initiates RTM
    room.markSold();

    const state = room.getFullState();
    expect(state.rtmState?.pending).toBe(true);
    expect(state.rtmState?.rtmTeamId).toBe('team_csk');

    // CSK tries to exercise RTM accept, but purse is 100 < 150!
    const accepted = room.exerciseRtm(true);
    expect(accepted).toBe(false); // MUST be rejected, preventing negative purse!

    // Decline RTM awards player to highest bidder
    const declined = room.exerciseRtm(false);
    expect(declined).toBe(true);
    const postState = room.getFullState();
    const dhoni = postState.players.find((p) => p.id === 'player_dhoni');
    expect(dhoni?.status).toBe('sold');
    expect(dhoni?.teamId).toBe('team_mi');
  });

  it('supports 3-deep undo and rolls back player/purse state', () => {
    room.setActivePlayer('player_bumrah');
    room.placeBid('team_mi'); // 30
    room.markSold();

    expect(room.getFullState().teams.find((t) => t.id === 'team_mi')?.purse).toBe(170);

    const undoSuccess = room.undo();
    expect(undoSuccess).toBe(true);

    const state = room.getFullState();
    const miTeam = state.teams.find((t) => t.id === 'team_mi');
    expect(miTeam?.purse).toBe(200); // restored!
    const bumrah = state.players.find((p) => p.id === 'player_bumrah');
    expect(bumrah?.status).toBe('available');
  });

  it('ends auction and locks all subsequent mutations', () => {
    const ended = room.endAuction();
    expect(ended).toBe(true);
    expect(room.getFullState().status).toBe('completed');

    // All actions must now fail
    expect(room.setActivePlayer('player_dhoni')).toBe(false);
    expect(room.placeBid('team_mi')).toBe(false);
    expect(room.markSold()).toBe(false);
    expect(room.markUnsold()).toBe(false);
  });

  it('supports admin CRUD for players and teams', () => {
    const newPlayer: Player = {
      id: 'player_surya',
      name: 'Suryakumar Yadav',
      role: 'Batsman',
      basePrice: 50,
      status: 'available',
    };
    expect(room.addManualPlayer(newPlayer)).toBe(true);
    expect(room.getFullState().players.some((p) => p.id === 'player_surya')).toBe(true);

    expect(room.updatePlayer('player_surya', { basePrice: 60 })).toBe(true);
    expect(room.getFullState().players.find((p) => p.id === 'player_surya')?.basePrice).toBe(60);

    expect(room.updateTeam('team_csk', { name: 'Super Kings Chennai', purse: 120 })).toBe(true);
    expect(room.getFullState().teams.find((t) => t.id === 'team_csk')?.purse).toBe(120);

    expect(room.deletePlayer('player_surya')).toBe(true);
    expect(room.getFullState().players.some((p) => p.id === 'player_surya')).toBe(false);
  });
});
