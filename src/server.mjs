// Import required modules
import { createServer } from 'http';
import crypto from 'crypto';

// Constants
const PORT = 1337;
const WEBSOCKET_MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const SEVEN_BITS_INTEGER_MARKER = 125;
const SIXTEEN_BITS_INTEGER_MARKER = 126;
const SIXTYFOUR_BITS_INTEGER_MARKER = 127;
const MASK_KEY_BYTES_LENGTH = 4;
const FIRST_BIT = 128; // parseInt('10000000', 2) -> 128

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
 * @param {net.Request} req
 * @param {net.Socket} socket - The WebSocket socket to handle.
 */
function onSocketUpgrade(req, socket) {
  // Extract the WebSocket key from the request headers
  const { 'sec-websocket-key': webClientSocketKey } = req.headers;

  console.log(`${webClientSocketKey} connected!`);

  // Prepare and send the WebSocket handshake headers
  const headers = prepareHandshakeHeaders(webClientSocketKey);
  socket.write(headers);
  socket.on('readable', () => onSocketReadable(socket));
}

/**
 * Handles the 'readable' event on a WebSocket socket.
 * Reads and processes incoming WebSocket messages.
 * @param {net.Socket} socket - The WebSocket socket to handle.
 * @throws {Error} Throws an error if the message length is not supported.
 */
function onSocketReadable(socket) {
  // consume optcode (first byte)
  // 1 -> 1 byte -> 8 bits
  socket.read(1);

  const [markerAndPayloadLength] = socket.read(1);

  // Because the first bit is always 1 for client-to-server messages,
  // we can subtract one bit (128 or '10000000' in binary) from this byte
  // to get rid of the MASK bit and get the actual payload length
  const lengthIndicatorInBits = markerAndPayloadLength - FIRST_BIT;

  let messageLength = 0;

  if (lengthIndicatorInBits <= SEVEN_BITS_INTEGER_MARKER) {
    messageLength = lengthIndicatorInBits;
  } else {
    throw new Error('Your message is too long. Message length not supported');
  }

  const maskKey = socket.read(MASK_KEY_BYTES_LENGTH);
  const encoded = socket.read(messageLength);
  const decoded = unmask(encoded, maskKey);
  const received = decoded.toString('utf8');

  const data = JSON.parse(received);
  console.log('Message Received:', data);
}

function unmask(encodedBuffer, maskKey) {
  const finalBuffer = Buffer.from(encodedBuffer);

  for (let i = 0; i < encodedBuffer.length; i++) {
    finalBuffer[i] = encodedBuffer[i] ^ maskKey[i % 4];
  }

  return finalBuffer;
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
