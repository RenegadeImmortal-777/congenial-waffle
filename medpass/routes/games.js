'use strict';
const { sendJson } = require('../lib/http');
const crypto = require('node:crypto');

const rooms = new Map();
const TTL = 30 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) if (now - room.lastActivity > TTL) rooms.delete(id);
}, 5 * 60 * 1000);

function code() { return crypto.randomBytes(3).toString('hex').toUpperCase(); }

function safeRoom(room, userId) {
  const idx = room.players.indexOf(userId);
  const base = { id: room.id, type: room.type, status: room.status, playerIndex: idx, playerNames: room.playerNames, playerCount: room.players.length };
  if (room.type === 'chess') {
    return { ...base, fen: room.fen, moves: room.moves, result: room.result };
  }
  const opId = room.players.find(p => p !== userId);
  const opBoard = opId ? (room.boards[opId] || null) : null;
  const opPct = opBoard && room.puzzle
    ? Math.round(opBoard.filter((v, i) => v !== 0 && room.puzzle[i] === 0).length / Math.max(1, room.puzzle.filter(v => v === 0).length) * 100)
    : 0;
  return { ...base, puzzle: room.puzzle, myBoard: room.boards[userId] || null, opponentProgress: opPct, finished: room.finished, times: room.times };
}

module.exports = {
  createRoom(req, res, body, session) {
    const { type } = body || {};
    if (!['chess', 'sudoku'].includes(type)) return sendJson(res, 400, { error: 'Invalid type.' });
    const id = code();
    const base = { id, type, players: [session.user.id], playerNames: [session.user.email?.split('@')[0] || 'P1'], status: 'waiting', lastActivity: Date.now() };
    rooms.set(id, type === 'chess'
      ? { ...base, fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: [], result: null }
      : { ...base, puzzle: null, boards: {}, finished: {}, times: {} });
    return sendJson(res, 201, { roomId: id, playerIndex: 0 });
  },

  joinRoom(req, res, id, body, session) {
    const room = rooms.get(id);
    if (!room) return sendJson(res, 404, { error: 'Room not found.' });
    if (room.players.includes(session.user.id)) {
      room.lastActivity = Date.now();
      return sendJson(res, 200, { roomId: id, playerIndex: room.players.indexOf(session.user.id), room: safeRoom(room, session.user.id) });
    }
    if (room.players.length >= 2) return sendJson(res, 409, { error: 'Room is full.' });
    room.players.push(session.user.id);
    room.playerNames.push(session.user.email?.split('@')[0] || 'P2');
    room.status = 'playing';
    if (room.type === 'sudoku' && body?.puzzle) {
      room.puzzle = body.puzzle;
      room.boards[session.user.id] = [...body.puzzle];
    }
    room.lastActivity = Date.now();
    return sendJson(res, 200, { roomId: id, playerIndex: 1, room: safeRoom(room, session.user.id) });
  },

  getRoom(req, res, id, session) {
    const room = rooms.get(id);
    if (!room) return sendJson(res, 404, { error: 'Room expired.' });
    room.lastActivity = Date.now();
    return sendJson(res, 200, { room: safeRoom(room, session.user.id) });
  },

  move(req, res, id, body, session) {
    const room = rooms.get(id);
    if (!room) return sendJson(res, 404, { error: 'Room not found.' });
    if (!room.players.includes(session.user.id)) return sendJson(res, 403, { error: 'Not in room.' });
    room.lastActivity = Date.now();
    if (room.type === 'chess') {
      const { fen, move, result } = body || {};
      if (fen) room.fen = fen;
      if (move) room.moves.push(move);
      if (result) { room.result = result; room.status = 'done'; }
    } else {
      const { board, finished, time } = body || {};
      if (board) room.boards[session.user.id] = board;
      if (finished) { room.finished[session.user.id] = true; room.times[session.user.id] = time || 0; if (Object.keys(room.finished).length >= room.players.length) room.status = 'done'; }
    }
    return sendJson(res, 200, { ok: true });
  },
};
