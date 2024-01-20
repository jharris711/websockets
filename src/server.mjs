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
const OPCODE_TEXT = 0x01; // 1 bit in binary
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

function sendMessage(msg, socket) {
  const data = prepareMessage(msg);
  socket.write(data);
}

function prepareMessage(message) {
  const msg = Buffer.from(message);
  const messageSize = msg.length;

  let dataFrameBuffer;

  // 0x80 === 128 in binary
  // '0x' + Math.abs(128).toString(16) == 0x80
  const firstByte = 0x80 | OPCODE_TEXT; // single frame + text

  if (messageSize <= SEVEN_BITS_INTEGER_MARKER) {
    const bytes = [firstByte];
    dataFrameBuffer = Buffer.from(bytes.concat(messageSize));
  } else {
    throw new Error('Message too long. Length not supported');
  }

  const totalLength = dataFrameBuffer.byteLength + messageSize;
  const dataFrameResponse = concat([dataFrameBuffer, msg], totalLength);
  return dataFrameResponse;
}

function concat(bufferList, totalLength) {
  const target = Buffer.allocUnsafe(totalLength);
  let offset = 0;
  for (const buffer of bufferList) {
    target.set(buffer, offset);
    offset += buffer.length;
  }

  return target;
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

  const msg = JSON.stringify({
    message: data,
    at: new Date.toISOString(),
  });

  sendMessage(msg, socket);
}

function unmask(encodedBuffer, maskKey) {
  const finalBuffer = Buffer.from(encodedBuffer);

  // Because the mask key has only 4 bytes,
  // index % 4 === 0, 1, 2, 3 = index bits needed to decode the message
  // Explanation: In WebSocket communication, the
  // payload of a message is XORed (exclusive OR)
  // with a mask key to secure the data. The mask key
  // is a 4-byte value, and each byte of the payload
  // is XORed with a corresponding byte of the mask key.
  // The above comment is indicating that when decoding the
  // message, you need to consider the index of the byte
  // in the payload modulo 4, as each byte is XORed with
  // the corresponding byte of the 4-byte mask key.

  // XOR ^
  // returns 1 if both bits are different
  // returns 0 if both bits are equal
  // Explanation: The XOR (^) operator is used in
  // bitwise operations. It returns 1 if the corresponding
  // bits of the two operands are different and 0 if they
  // are the same.

  // (71).toString(2).padStart(8, "0") -> '01000111'
  // (53).toString(2).padStart(8, "0") -> '00110101'
  //                                      '01110010'
  // Explanation: This shows the binary representation
  // of the decimal numbers 71 and 53. The `.toString(2)`
  // method converts the numbers to binary, and
  // `.padStart(8, "0")` ensures that the binary representation
  // has 8 bits, left-padding with zeros if needed. The result
  // is the binary representation of each byte of the mask key.

  // (71 ^ 53).toString(2).padStart(8, "0") -> '01110010'
  // Explanation: This line demonstrates the XOR operation
  // between the binary representations of the two numbers
  // (71 and 53). The result is the binary representation of
  // the XORed value.

  // String.fromCharCode(parseInt('01110010', 2)) -> 'r'
  // Explanation: Finally, this line converts the binary
  // representation ('01110010') back to a decimal number
  // using `parseInt` with base 2. Then, `String.fromCharCode`
  // converts the decimal number to the corresponding ASCII
  // character. In this example, it results in the character 'r'.

  const fillWithEightZeros = (t) => t.padStart(8, '0');
  const toBinary = (t) => fillWithEightZeros(t.toString(2));
  const fromBinaryToDecimal = (t) => parseInt(toBinary(t), 2);
  const getCharFromBinary = (t) => String.fromCharCode(fromBinaryToDecimal(t));

  for (let i = 0; i < encodedBuffer.length; i++) {
    finalBuffer[i] = encodedBuffer[i] ^ maskKey[i % MASK_KEY_BYTES_LENGTH];
    const logger = {
      unmaskingCalc: `${toBinary(encodedBuffer[i])} ^ ${toBinary(
        maskKey[i % MASK_KEY_BYTES_LENGTH]
      )} = ${toBinary(finalBuffer[i])}`,
      decoded: getCharFromBinary(finalBuffer[i]),
    };
    console.log(logger);
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
