// Auto-generated room master — derived from pgMasterData price tiers
// Each PG gets rooms based on which price tiers they offer

import { PG_DATA } from './pgMasterData';

export type RoomStatus = 'LOCKED' | 'AVAILABLE' | 'APPROVED' | 'SOFT_LOCKED' | 'HARD_LOCKED' | 'OCCUPIED';
export type AvailType = 'NOW' | 'SOON' | 'OCCUPIED';

export interface Room {
  id: string;         // unique e.g. "pg1_rm1"
  pgId: number;
  num: string;        // e.g. "101"
  type: 'Single' | 'Double' | 'Triple';
  basePrice: number;
  floor: number;
}

export interface RoomState {
  roomId: string;
  status: RoomStatus;
  availType: AvailType;
  expectedRent: number;
  remarks: string;
  updatedAt?: string;
  // set by sales
  retailPrice?: number;
  approvedBy?: string;
  visitCustomer?: string;
  visitDate?: string;
  visitTime?: string;
  visitType?: 'Physical' | 'Virtual';
  visitPhone?: string;
}

// Generate rooms for a PG based on its price tiers
function generateRooms(pg: typeof PG_DATA[0]): Room[] {
  const rooms: Room[] = [];
  let counter = 1;

  const types = ([
    { type: 'Triple', price: pg.triplePrice },
    { type: 'Double', price: pg.doublePrice },
    { type: 'Single', price: pg.singlePrice },
  ] as const).filter(t => t.price && t.price > 5000);

  if (types.length === 0) {
    // Fallback if no prices
    rooms.push({
      id: `pg${pg.id}_rm1`,
      pgId: pg.id,
      num: '101',
      type: 'Double',
      basePrice: 10000,
      floor: 1,
    });
    return rooms;
  }

  // Determine how many rooms to generate total
  // If pg.availability is set, use it. Otherwise use the 1-2 default.
  const totalToGen = pg.availability && pg.availability > 0 
    ? pg.availability 
    : types.reduce((acc, t) => acc + (t.type === 'Double' ? 2 : 1), 0);

  // Distribute rooms across types
  // We'll cycle through the available types until we hit totalToGen
  for (let i = 0; i < totalToGen; i++) {
    const typeObj = types[i % types.length];
    const floor = Math.floor(i / types.length) + 1;
    const num = String(floor * 100 + (Math.floor(i / types.length) * types.length + (i % types.length) + 1)).padStart(3, '0');
    
    rooms.push({
      id: `pg${pg.id}_rm${counter}`,
      pgId: pg.id,
      num: String(100 + counter).padStart(3, '0'), // Simple numbering for now
      type: typeObj.type,
      basePrice: typeObj.price!,
      floor: Math.ceil(counter / 4), // 4 rooms per floor
    });
    counter++;
  }

  return rooms;
}

// Build the full room master from all PGs
export const ROOM_MASTER: Room[] = PG_DATA.flatMap(pg => generateRooms(pg));

// Get rooms for a specific PG
export function getRoomsForPG(pgId: number): Room[] {
  return ROOM_MASTER.filter(r => r.pgId === pgId);
}

// Default room state — all rooms LIVE by default as requested
export function defaultRoomState(room: Room): RoomState {
  return {
    roomId: room.id,
    status: 'APPROVED',
    availType: 'NOW',
    expectedRent: room.basePrice,
    retailPrice: room.basePrice,
    remarks: '',
  };
}
