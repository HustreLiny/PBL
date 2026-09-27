import { Component, type ReactNode } from 'react';
import { reducer, SAVE_KEY, type GameState } from '../state';

function readSave(): GameState | null {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null');
  } catch {
    return null;
  }
}

function clearSave() {
  localStorage.removeItem(SAVE_KEY);
  location.reload();
}

function restartChapter(saved: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(reducer(saved, { t: 'restartChapter' })));
  } catch {
    localStorage.removeItem(SAVE_KEY);
  }
  location.reload();
}

/** 画面出错时不白屏：可以重新载入、回到本章开头，或清除存档从头开始 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const saved = readSave();
    return (
      <div className="crash pixel-border">
        <h2 className="pixel">出了点问题</h2>
        <p>游戏遇到错误，画面没法继续显示。可以先重新载入；还不行的话，回到本章开头，或者清除存档从头开始。</p>
        <pre className="crash-msg">{error.message}</pre>
        <div className="row">
          <button onClick={() => location.reload()}>重新载入</button>
          {saved?.entry && <button onClick={() => restartChapter(saved)}>回到本章开头</button>}
          <button className="primary" onClick={clearSave}>
            清除存档，从头开始
          </button>
        </div>
      </div>
    );
  }
}
