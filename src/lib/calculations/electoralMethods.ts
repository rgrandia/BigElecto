export type ElectoralMethod = 'dhondt' | 'saintelague' | 'hare' | 'droop' | 'imperiali' | 'huntington' | 'danish' | 'adams';

export interface PartyResult {
  partyId: string;
  partyName: string;
  color: string;
  votes: number;
  seats: number;
  quotients?: number[]; // Per mostrar el càlcul pas a pas
}

export interface ConstituencyResult {
  name: string;
  totalSeats: number;
  totalVotes: number;
  parties: PartyResult[];
  distribution: { partyId: string; quotient: number; seatNumber: number }[]; // Ordre d'assignació
}

// Funcions divisor per mètode
const getDivisor = (method: ElectoralMethod, seats: number): number => {
  switch (method) {
    case 'dhondt': return seats + 1;
    case 'saintelague': return 2 * seats + 1;
    case 'imperiali': return seats + 2;
    case 'huntington': return Math.sqrt(seats * (seats + 1));
    case 'danish': return 3 * seats + 1;
    case 'adams': return seats === 0 ? Infinity : seats; // Especial: primer escó automàtic
    default: return seats + 1;
  }
};

// Mètode D'Hondt i variants divisor
export const calculateDivisorMethod = (
  votes: { partyId: string; partyName: string; color: string; votes: number }[],
  seats: number,
  method: ElectoralMethod,
  threshold: number = 0
): ConstituencyResult => {
  const totalVotes = votes.reduce((sum, v) => sum + v.votes, 0);
  const thresholdVotes = (threshold / 100) * totalVotes;
  
  // Filtrar partits sota el llindar
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
  
  // Assignar escóns
  for (let seat = 1; seat <= seats; seat++) {
    let maxQuotient = -1;
    let winnerIndex = -1;
    
    parties.forEach((party, index) => {
      const divisor = getDivisor(method, party.seats);
      let quotient: number;
      
      if (divisor === Infinity) {
        quotient = party.votes; // Cas Adams primer escó
      } else {
        quotient = party.votes / divisor;
      }
      
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

// Mètode Hare (quota simple)
export const calculateHare = (
  votes: { partyId: string; partyName: string; color: string; votes: number }[],
  seats: number,
  threshold: number = 0
): ConstituencyResult => {
  const totalVotes = votes.reduce((sum, v) => sum + v.votes, 0);
  const thresholdVotes = (threshold / 100) * totalVotes;
  const validParties = votes.filter(v => v.votes >= thresholdVotes);
  
  const quota = totalVotes / seats;
  
  const parties: PartyResult[] = validParties.map(v => {
    const exactSeats = v.votes / quota;
    return {
      partyId: v.partyId,
      partyName: v.partyName,
      color: v.color,
      votes: v.votes,
      seats: Math.floor(exactSeats),
      quotients: [exactSeats]
    };
  });
  
  // Assignar residus
  const assignedSeats = parties.reduce((sum, p) => sum + p.seats, 0);
  const remainingSeats = seats - assignedSeats;
  
  if (remainingSeats > 0) {
    const remainders = parties.map((p, i) => ({
      index: i,
      remainder: (p.votes / quota) - p.seats
    })).sort((a, b) => b.remainder - a.remainder);
    
    for (let i = 0; i < remainingSeats; i++) {
      if (remainders[i]) {
        parties[remainders[i].index].seats++;
      }
    }
  }
  
  return {
    name: '',
    totalSeats: seats,
    totalVotes,
    parties: parties.sort((a, b) => b.seats - a.seats),
    distribution: []
  };
};

// Mètode Droop (quota majoritària)
export const calculateDroop = (
  votes: { partyId: string; partyName: string; color: string; votes: number }[],
  seats: number,
  threshold: number = 0
): ConstituencyResult => {
  const totalVotes = votes.reduce((sum, v) => sum + v.votes, 0);
  const thresholdVotes = (threshold / 100) * totalVotes;
  const validParties = votes.filter(v => v.votes >= thresholdVotes);
  
  const quota = Math.floor(totalVotes / (seats + 1)) + 1; // Quota Droop
  
  const parties: PartyResult[] = validParties.map(v => {
    const exactSeats = v.votes / quota;
    return {
      partyId: v.partyId,
      partyName: v.partyName,
      color: v.color,
      votes: v.votes,
      seats: Math.floor(exactSeats),
      quotients: [exactSeats]
    };
  });
  
  // Assignar residus igual que Hare
  const assignedSeats = parties.reduce((sum, p) => sum + p.seats, 0);
  const remainingSeats = seats - assignedSeats;
  
  if (remainingSeats > 0) {
    const remainders = parties.map((p, i) => ({
      index: i,
      remainder: (p.votes / quota) - p.seats
    })).sort((a, b) => b.remainder - a.remainder);
    
    for (let i = 0; i < remainingSeats; i++) {
      if (remainders[i]) {
        parties[remainders[i].index].seats++;
      }
    }
  }
  
  return {
    name: '',
    totalSeats: seats,
    totalVotes,
    parties: parties.sort((a, b) => b.seats - a.seats),
    distribution: []
  };
};

// Funció principal que tria el mètode
export const calculateElection = (
  votes: { partyId: string; partyName: string; color: string; votes: number }[],
  seats: number,
  method: ElectoralMethod,
  threshold: number = 0
): ConstituencyResult => {
  switch (method) {
    case 'hare':
      return calculateHare(votes, seats, threshold);
    case 'droop':
      return calculateDroop(votes, seats, threshold);
    default:
      return calculateDivisorMethod(votes, seats, method, threshold);
  }
};
