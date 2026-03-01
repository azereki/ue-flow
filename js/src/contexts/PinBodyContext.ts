import { createContext } from 'react';

/** Whether pin bodies should be visible (zoom >= 0.15). Single subscription in SingleGraphView. */
export const PinBodyContext = createContext(true);
