/**
 * Ponziani Opening reference tree.
 *
 * The Ponziani starts with 1.e4 e5 2.Nf3 Nc6 3.c3.
 * This file defines the known variations as a move-sequence trie
 * so we can detect which line was played and where a game deviated.
 */

export interface PrepNode {
  /** SAN move that reaches this node */
  move: string;
  /** Human-readable variation name once this branch is identifiable */
  name?: string;
  /** ECO code, if known */
  eco?: string;
  children: PrepNode[];
}

/** Root of the Ponziani prep tree (moves are listed from ply 1). */
export const PONZIANI_TREE: PrepNode = {
  move: 'root',
  children: [
    {
      move: 'e4',
      children: [
        {
          move: 'e5',
          children: [
            {
              move: 'Nf3',
              children: [
                {
                  move: 'Nc6',
                  children: [
                    {
                      move: 'c3',
                      name: 'Ponziani Opening',
                      eco: 'C44',
                      children: [
                        // 3...Nf6 — main continuation
                        {
                          move: 'Nf6',
                          name: 'Ponziani: 3...Nf6',
                          children: [
                            {
                              move: 'd4',
                              name: 'Ponziani: 3...Nf6 4.d4',
                              children: [
                                {
                                  move: 'Nxe4',
                                  name: 'Ponziani: 3...Nf6 4.d4 Nxe4',
                                  children: [
                                    {
                                      move: 'd5',
                                      name: 'Ponziani: Leonhardt Variation',
                                      children: [
                                        { move: 'Ne7', name: 'Ponziani: Leonhardt 5...Ne7', children: [] },
                                        { move: 'Nb8', name: 'Ponziani: Leonhardt 5...Nb8', children: [] },
                                      ],
                                    },
                                  ],
                                },
                                {
                                  move: 'exd4',
                                  name: 'Ponziani: 3...Nf6 4.d4 exd4',
                                  children: [
                                    {
                                      move: 'e5',
                                      name: 'Ponziani: 4...exd4 5.e5',
                                      children: [
                                        { move: 'Nd5', name: 'Ponziani: 5.e5 Nd5', children: [] },
                                        { move: 'Ne4', name: 'Ponziani: 5.e5 Ne4', children: [] },
                                      ],
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                        // 3...d5 — Ponziani Counter-Gambit
                        {
                          move: 'd5',
                          name: 'Ponziani: Counter-Gambit',
                          children: [
                            {
                              move: 'Qa4',
                              name: 'Ponziani: Counter-Gambit 4.Qa4',
                              children: [
                                {
                                  move: 'Nf6',
                                  name: 'Ponziani: Vukovic Gambit',
                                  children: [
                                    { move: 'Nxe5', name: 'Ponziani: Vukovic 5.Nxe5', children: [] },
                                  ],
                                },
                                {
                                  move: 'Bd7',
                                  name: 'Ponziani: Counter-Gambit 4...Bd7',
                                  children: [
                                    { move: 'exd5', name: 'Ponziani: 4...Bd7 5.exd5', children: [] },
                                  ],
                                },
                                {
                                  move: 'f6',
                                  name: 'Ponziani: Counter-Gambit 4...f6',
                                  children: [],
                                },
                              ],
                            },
                          ],
                        },
                        // 3...d6 — Reversed Philidor setup
                        {
                          move: 'd6',
                          name: 'Ponziani: Reversed Philidor',
                          children: [
                            {
                              move: 'd4',
                              name: 'Ponziani: Reversed Philidor 4.d4',
                              children: [
                                { move: 'Nf6', name: 'Ponziani: Rev. Philidor 4...Nf6', children: [] },
                                { move: 'Bd7', name: 'Ponziani: Rev. Philidor 4...Bd7', children: [] },
                              ],
                            },
                          ],
                        },
                        // 3...f5 — Jaenisch Counter-Attack
                        {
                          move: 'f5',
                          name: 'Ponziani: Jaenisch Counter-Attack',
                          children: [
                            {
                              move: 'd4',
                              name: 'Ponziani: Jaenisch 4.d4',
                              children: [
                                { move: 'fxe4', name: 'Ponziani: Jaenisch 4...fxe4', children: [] },
                                { move: 'd6', name: 'Ponziani: Jaenisch 4...d6', children: [] },
                              ],
                            },
                          ],
                        },
                        // 3...Be7 — quiet/solid
                        {
                          move: 'Be7',
                          name: 'Ponziani: 3...Be7',
                          children: [
                            { move: 'd4', name: 'Ponziani: 3...Be7 4.d4', children: [] },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

/** Flat list of variation names for display / filtering. */
export const PONZIANI_VARIATIONS: string[] = [];

function collectNames(node: PrepNode): void {
  if (node.name) PONZIANI_VARIATIONS.push(node.name);
  for (const child of node.children) collectNames(child);
}
collectNames(PONZIANI_TREE);

/** The opening moves that define the Ponziani (first 5 half-moves). */
export const PONZIANI_SIGNATURE = ['e4', 'e5', 'Nf3', 'Nc6', 'c3'];
