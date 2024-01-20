import { createServer } from 'http';

const PORT = 1337;

// Create an HTTP server using the 'createServer' function
const server = createServer((req, res) => {
  // Set the HTTP response status code to 200 (OK)
  res.writeHead(200);

  // Send the response 'Hello World'
  res.end('Hello World');
}).listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Set up an event listener for the 'upgrade' event on the 'server'
server.on('upgrade', (req, socket, headers) => {
  // Log information related to the 'upgrade' event
  console.log({
    req, // The HTTP request object
    socket, // The net.Socket object associated with the connection
    headers, // The headers of the upgrade request
  });
});

[
  // Handle uncaught exceptions and unhandled rejections
  ('uncaughtException', 'unhandledRejection'),
].forEach((event) => {
  // Attach event listeners to the Node.js process
  process.on(event, (err) => {
    // Log an error message including the event type and the error stack or message
    console.error(
      `Something went wrong: EVENT: ${event}, MSG: {${err.stack || err}}`
    );
  });
});
