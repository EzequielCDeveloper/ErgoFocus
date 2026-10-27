/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Servidor ligero de retransmisión local (CORS + SSE)
 * Conecta la app móvil (ej: localhost:8081) y el smartwatch (ej: localhost:8082) en el navegador.
 */

import http from 'node:http';

const PORT = 9099;
const clients = new Set();
let latestState = null;

const server = http.createServer((req, res) => {
  // CORS universal para permitir peticiones entre cualquier puerto de localhost
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Canal de eventos en tiempo real (Server-Sent Events)
  if (req.method === 'GET' && req.url === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    res.write('retry: 2000\n\n');
    clients.add(res);

    // Si ya hay un estado guardado, enviárselo inmediatamente al nuevo cliente
    if (latestState) {
      res.write(`data: ${JSON.stringify({ type: 'STATE_UPDATE', payload: latestState })}\n\n`);
    }

    req.on('close', () => {
      clients.delete(res);
    });
    return;
  }

  // Recepción de estado desde la app móvil
  if (req.method === 'POST' && req.url === '/state') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        latestState = payload;
        const sseMessage = `data: ${JSON.stringify({ type: 'STATE_UPDATE', payload })}\n\n`;
        for (const client of clients) {
          client.write(sseMessage);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, clients: clients.size }));
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Recepción de comandos desde el smartwatch
  if (req.method === 'POST' && req.url === '/command') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const command = JSON.parse(body);
        const sseMessage = `data: ${JSON.stringify({ type: 'COMMAND', command })}\n\n`;
        for (const client of clients) {
          client.write(sseMessage);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, clients: clients.size }));
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, clients: clients.size }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n🌉 [ErgoFocus Sync Relay] Escuchando en http://localhost:${PORT}`);
  console.log(`   Permite comunicación fluida entre Móvil y Smartwatch en navegadores web.`);
});
