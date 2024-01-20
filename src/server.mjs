// Import required modules
import { createServer } from 'http';
import crypto from 'crypto';

// Constants
const PORT = 1337;
const WEBSOCKET_MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

// Create an HTTP server
const server = createServer((req, res) => {
  // Respond to HTTP requests with a simple 'Hello World'
  res.writeHead(200);
  res.end('Hello World');
}).listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Handle 'upgrade' event for WebSocket connections
server.on('upgrade', onSocketUpgrade);

/**
 * Function to handle WebSocket upgrade
 * @param {*} req
 * @param {*} socket
 */
function onSocketUpgrade(req, socket) {
  // Extract the WebSocket key from the request headers
  const { 'sec-websocket-key': webClientSocketKey } = req.headers;

  // Prepare and send the WebSocket handshake headers
  const headers = prepareHandshakeHeaders(webClientSocketKey);
  socket.write(headers);
}

/**
 * Function to prepare WebSocket handshake headers
 * @param { string } id
 * @returns { string } headers
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers
 */
function prepareHandshakeHeaders(id) {
  // Create the 'Sec-WebSocket-Accept' key for the handshake
  const acceptKey = createSocketAccept(id);

  // Prepare the headers for the WebSocket handshake
  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`,
    '',
  ]
    .map((line) => line.concat('\r\n'))
    .join('');

  return headers;
}

/**
 * Function to create the 'Sec-WebSocket-Accept' key
 * @param { string } id
 * @returns { string } shaum.digest
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-WebSocket-Accept#directives
 */
function createSocketAccept(id) {
  const shaum = crypto.createHash(`sha1`);
  shaum.update(`${id}${WEBSOCKET_MAGIC_STRING}`);
  return shaum.digest(`base64`);
}

// Handle uncaught exceptions and unhandled rejections
['uncaughtException', 'unhandledRejection'].forEach((event) => {
  process.on(event, (err) => {
    console.error(
      `Something went wrong: EVENT: ${event}, MSG: {${err.stack || err}}`
    );
  });
});
