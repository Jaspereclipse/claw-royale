export type InputAction =
  | { readonly type: 'move'; readonly dx: number; readonly dy: number }
  | { readonly type: 'ability'; readonly slot: 1 | 2 | 3 | 4 }
  | { readonly type: 'inventory' }
  | { readonly type: 'confirm' }
  | { readonly type: 'quit' }
  | { readonly type: 'none' };

function decodeInput(chunk: string): InputAction {
  if (chunk === '\u0003' || chunk.toLowerCase() === 'q') {
    return { type: 'quit' };
  }

  if (chunk === '\r' || chunk === '\n') {
    return { type: 'confirm' };
  }

  if (chunk === '\u001b[A' || chunk.toLowerCase() === 'w') {
    return { type: 'move', dx: 0, dy: -1 };
  }

  if (chunk === '\u001b[B' || chunk.toLowerCase() === 's') {
    return { type: 'move', dx: 0, dy: 1 };
  }

  if (chunk === '\u001b[C' || chunk.toLowerCase() === 'd') {
    return { type: 'move', dx: 1, dy: 0 };
  }

  if (chunk === '\u001b[D' || chunk.toLowerCase() === 'a') {
    return { type: 'move', dx: -1, dy: 0 };
  }

  if (chunk === '1') return { type: 'ability', slot: 1 };
  if (chunk === '2') return { type: 'ability', slot: 2 };
  if (chunk === '3') return { type: 'ability', slot: 3 };
  if (chunk === '4') return { type: 'ability', slot: 4 };

  if (chunk.toLowerCase() === 'i') {
    return { type: 'inventory' };
  }

  return { type: 'none' };
}

export function getInput(): Promise<InputAction> {
  const stdin = process.stdin;

  return new Promise((resolve) => {
    const cleanup = (): void => {
      stdin.removeListener('data', onData);
      if (stdin.isTTY) {
        stdin.setRawMode(false);
      }
      stdin.pause();
    };

    const onData = (buffer: Buffer): void => {
      cleanup();
      resolve(decodeInput(buffer.toString('utf8')));
    };

    stdin.resume();
    stdin.setEncoding('utf8');
    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }
    stdin.on('data', onData);
  });
}
