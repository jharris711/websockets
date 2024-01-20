# WebSocket Tutorial
This repository contains a simple WebSocket server and a corresponding WebSocket client to help you understand the fundamentals of WebSocket communication. The server is implemented in Node.js using the http module, and the client is a basic HTML file with JavaScript.

## Server
The server (`server.mjs`) creates an HTTP server that responds to regular HTTP requests with a 'Hello World' message. Additionally, it handles WebSocket upgrade events, enabling communication over WebSocket protocol. Key features include:

- WebSocket handshake handling
- Message encoding and decoding
- Broadcasting messages to connected clients

### Usage

To start the server, run:

```bash
Copy code
npm install
npm run start
```

The server will be accessible at [http://localhost:1337](http://localhost:1337).

## Client
The client (`index.html`) is a simple HTML file with embedded JavaScript. It establishes a WebSocket connection to the server and sends and receives messages.

### Usage
- Open the index.html file in a web browser.
- Open the browser's developer console to view WebSocket-related logs.

## WebSocket Communication
The WebSocket communication follows the WebSocket protocol specifications. Key concepts covered include:

- WebSocket handshake headers
- Message framing
- Masking and unmasking messages

## Important Files
- `server.mjs`: Node.js server implementation
- `index.html`: WebSocket client HTML file

## Dependencies
- Node.js (for running the server)
- npm (Node Package Manager)

Feel free to explore and modify the code to deepen your understanding of WebSocket communication. If you encounter any issues or have questions, please refer to the [WebSocket API documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) and the associated [WebSocket protocol specifications](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers).
