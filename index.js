// Libraries
const express = require('express')
const http = require('http')
const uuid = require('uuid');

// Hardcoded constants
const port = 3000
const source_url = 'http://localhost:8081/webcam.ogg'
const drain_respect = false
const source_sleep_ms = 3000

// Source stream listener callbacks
const source_listeners = {}

// Stream sourcing & internal broadcasting
setTimeout(function () {
  console.log("Starting to listen to webcam source")
  http.get(source_url, function(res) {
    console.log("Webcam source connection established")
    res.on('data', function(chunk) {
      console.log(`Webcam data chunk received of size ${chunk.length}`)
      const is_end = false
      for (const [id, listener] of Object.entries(source_listeners)) {
        console.log(`Webcam data chunk forwarded to ${id}`)
        listener(is_end, chunk)
      }
    });
    res.on('end', function() {
      console.log(`Webcam data stream end received`)
      const is_end = true
      const chunk = null
      for (const [id, listener] of Object.entries(source_listeners)) {
        console.log(`Webcam data stream end forwarded to ${id}`)
        listener(is_end, chunk)
      }
    });
  });
}, source_sleep_ms)

// Re-stream app
const app = express()

// Re-stream path
app.get('/webcam.ogg', (req, res) => {
  // Log request body & headers
  console.log(`BODY:`, req.body)
  console.log(`HEADERS`, req.headers)

  // Listener ID
  const id = uuid.v4();

  // Send OGG content type headers
  console.log(`Listener ${id} connected, sending ogg headers`)
  // res.useChunkedEncodingByDefault = false;
  res.removeHeader('Date');
  res.removeHeader('X-Powered-By');

  const isRanged = !!req.headers.range
  if (!isRanged) {
    res.writeHead(200, {
      "Content-Type": "application/ogg",
      "Cache-Control": "no-cache",
      "Connection": "close",
      "Accept-Ranges": "none",
      "X-Stream-Id": id
    });
    res.end()
    return;
  }

  res.writeHead(200, {
    "Content-Type": "application/ogg",
    "Cache-Control": "no-cache",
    "Connection": "close",
    "Accept-Ranges": "none",
    "X-Stream-Id": id
  });

  // Define flow control variables for connection
  let is_caught_up = false
  let waiting_drain = false
  const buffered = []

  // React to drain events
  if (drain_respect) {
    res.on("drain", function () {
      waiting_drain = false
      console.log(`Drain event received for ${id}, continuing sends`)
      forwarder(false, null)
    })
  }

  // Define source stream data forwarding function
  function forwarder(is_end, chunk) {
    if (is_end) {
      console.log(`Ending connection ${id}`)
      // Redact listener
      delete source_listeners[id]
      // End connection
      res.end()
    }

    // Add chunk to writable client buffer if a chunk is received from broadcast
    if (chunk !== null) buffered.push(chunk)

    // Get a sendable chunk
    let sendable = null
    if (buffered.length > 0 && !waiting_drain)
    sendable = buffered.shift();
    if (sendable === null) return;

    const oggsIndex = sendable.indexOf("OggS")
    if (oggsIndex !== -1 && !is_caught_up) {
      is_caught_up = true;
      const oldLength = sendable.length
      sendable = sendable.slice(oggsIndex)
      const newLength = sendable.length
      console.log(`Found oggs at: ${oggsIndex}, slicing from size ${oldLength} to ${newLength}`)
    }
    
    // Forward stream data over listener connection
    console.log(`Forwarding chunk to connection ${id}`)
    const is_drained = res.write(chunk)
    if (drain_respect) {
      if (!is_drained) {
        console.log(`A lot of data has been sent to ${id}, waiting for drain event`)
        waiting_drain = true
      } else {
        if (buffered.length > 0) {
          console.log(`Connection needs no draining, will send previously buffered data to ${id} again`)
          forwarder(false, null)  
        } else {
          console.log(`Connection ${id} needs no draining and no buffer flushing`)
        }
      }
    }
  }

  // Attach forwarding function to source stream listeners
  console.log(`Listener ${id} attached as webcam stream listener`)
  source_listeners[id] = forwarder
})

// Enabled re-stream listener
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

