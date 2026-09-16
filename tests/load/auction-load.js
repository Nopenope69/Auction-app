import ws from 'k6/ws';
import http from 'http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '15s', target: 20 },  // Ramp up
    { duration: '30s', target: 50 },  // Peak load
    { duration: '15s', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<150', 'p(99)<300'],
    'ws_connecting': ['p(95)<200'],
    'checks': ['rate>0.98'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3001';
const WS_BASE_URL = BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');

export default function () {
  // 1. HTTP health probe verification
  const readyRes = http.get(`${BASE_URL}/readyz`);
  check(readyRes, {
    'readyz status is 200': (r) => r.status === 200,
  });

  const roomId = 'load_test_room';
  const url = `${WS_BASE_URL}/?room=${roomId}&role=spectator`;

  // 2. WebSocket spectator connection
  const res = ws.connect(url, {}, function (socket) {
    socket.on('open', () => {
      // Send reaction
      socket.send(JSON.stringify({ type: 'REACTION', emoji: '👏' }));
    });

    socket.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        check(msg, {
          'received valid message': (m) => m.type === 'SYNC' || m.type === 'REACTION' || m.type === 'ERROR',
        });
      } catch (e) {
        // non-json
      }
    });

    socket.on('close', () => {});

    // Hold connection open for 10 seconds while receiving updates
    socket.setTimeout(() => {
      socket.close();
    }, 10000);
  });

  check(res, { 'WS connection successfully established': (r) => r && r.status === 101 });
  sleep(1);
}
