export type ElectoralMethod = 'dhondt' | 'saintelague' | 'hare' | 'droop' | 'imperiali' | 'huntington' | 'danish' | 'adams';

export interface PartyResult {
  partyId: string;
  partyName: string;
  color: string;
  votes: number;
  seats: number;
  quotients?: number[];
}

export interface ConstituencyResult {
  name: string;
  totalSeats: number;
  totalVotes: number;
  parties: PartyResult[];
  distribution: { partyId: string; quotient: number; seatNumber: number }[];
}

const getDivisor = (method: ElectoralMethod, seats: number): number => {
  switch (method) {
    case 'dhondt': return seats + 1;
    case 'saintelague': return 2 * seats + 1;
    case 'imperiali': return seats + 2;
    case 'huntington': return Math.sqrt(seats * (seats + 1));
    case 'danish': return 3 * seats + 1;
    case 'adams': return seats === 0 ? Infinity : seats;
    default: return seats + 1;
  }
};

export const calculateDivisorMethod = (
  votes: { partyId: string; partyName: string; color: string; votes: number }[],
  seats: number,
  method: ElectoralMethod,
  threshold: number = 0
): ConstituencyResult => {
  const totalVotes = votes.reduce((sum, v) => sum + v.votes, 0);
  const thresholdVotes = (threshold / 100) * totalVotes;
  const validParties = votes.filter(v => v.votes >= thresholdVotes);
  
  const parties: PartyResult[] = validParties.map(v => ({
    partyId: v.partyId,
    partyName: v.partyName,
    color: v.color,
    votes: v.votes,
    seats: 0,
    quotients: []
  }));
  
  const distribution: { partyId: string; quotient: number; seatNumber: number }[] = [];
  
  for (let seat = 1; seat <= seats; seat++) {
    let maxQuotient = -1;
    let winnerIndex = -1;
    
    parties.forEach((party, index) => {
      const divisor = getDivisor(method, party.seats);
      const quotient = divisor === Infinity ? party.votes : party.votes / divisor;
      
      if (quotient > maxQuotient) {
        maxQuotient = quotient;
        winnerIndex = index;
      }
    });
    
    if (winnerIndex >= 0) {
      parties[winnerIndex].seats++;
      parties[winnerIndex].quotients?.push(maxQuotient);
      distribution.push({
        partyId: parties[winnerIndex].partyId,
        quotient: maxQuotient,
        seatNumber: seat
      });
    }
  }
  
  return {
    name: '',
    totalSeats: seats,
    totalVotes,
    parties: parties.sort((a, b) => b.seats - a.seats),
    distribution
  };
};

export const calculateElection = (
  votes: { partyId: string; partyName: string; color: string; votes: number }[],
  seats: number,
  method: ElectoralMethod,
  threshold: number = 0
): ConstituencyResult => {
  return calculateDivisorMethod(votes, seats, method, threshold);
};
