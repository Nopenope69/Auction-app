import ws from 'k6/ws';
import http from 'http';
import { check, sleep } from 'k6';

export const options = {
  vus: 20,
  duration: '30s',
  thresholds: {
    'checks': ['rate>0.95'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3001';
const WS_BASE_URL = BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');

export default function () {
  // Check health during chaos
  const liveRes = http.get(`${BASE_URL}/livez`);
  check(liveRes, { 'server alive under chaos': (r) => r.status === 200 });

  const roomId = 'chaos_room';
  const url = `${WS_BASE_URL}/?room=${roomId}&role=spectator`;

  // Rapid disconnects and malformed payloads
  ws.connect(url, {}, function (socket) {
    socket.on('open', () => {
      // 1. Bombard with malformed strings
      socket.send('{not valid json at all');
      // 2. Bombard with forbidden mutations
      socket.send(JSON.stringify({ type: 'PLACE_BID', amount: 'abc' }));
      socket.send(JSON.stringify({ type: 'START_TIMER' }));
      // 3. Flood reactions to trip rate limiter
      for (let i = 0; i < 15; i++) {
        socket.send(JSON.stringify({ type: 'REACTION', emoji: '🔥' }));
      }
      // Rapid close
      socket.close();
    });
  });

  sleep(0.5);
}
