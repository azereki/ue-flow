/** Shared React Flow store selectors. */

/** Extract current zoom level from the React Flow transform. */
export const zoomSelector = (s: { transform: [number, number, number] }) => s.transform[2];
