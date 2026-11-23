import type { Seat } from "../types/Cinema";

export function createSeats(): Seat[] {
  const seats: Seat[] = [];

  for (let row = 1; row <= 4; row += 1) {
    for (let number = 1; number <= 8; number += 1) {
      seats.push({
        id: `${row}-${number}`,
        row,
        number,
        position: {
          x: (number - 4.5) * 1.5,
          y: (row - 1) * 0.18,
          z: -3 + row * 2.2,
        },
        status: "available",
      });
    }
  }
  return seats;
}

export const SEATS = createSeats();

export function findSeatById(seats: Seat[], seatId: string): Seat | undefined {
  return seats.find((seat) => seat.id === seatId);
}
