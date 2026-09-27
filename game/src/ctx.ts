import { createContext, useContext, type Dispatch } from 'react';
import type { GameState, Msg } from './state';

export const Ctx = createContext<{ s: GameState; d: Dispatch<Msg> } | null>(null);

export function useGame() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useGame 必须在 Ctx 内使用');
  return v;
}
