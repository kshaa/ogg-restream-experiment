# OGG re-streaming test

## Motivation
This is a prototype for [dip-testbed](https://github.com/kshaa/dip-testbed-dist).  

## Objective
Figure out how hard it is to capture an OGG video stream and pipe it around over HTTP connections to a browser.

## Results
- A web-cam video stream is captured with VLC using an OGG codec and exported to an HTTP socket, hardcoded as `http://localhost:8081/webcam.ogg` [1]
- Prototype libraries are installed using `npm install`
- Prototype server is started using `node index.js`
- The server connects to the hardcoded VLC OGG HTTP socket on `http://localhost:8081/webcam.ogg` and broadcasts listeners about incoming chunks
- When end-users connect to the server, the OGG chunk broadcasts are listened for and forwarded over the connection
- _Note: Because this prototype uses HTTP 1.1, we must inform the client about not accepting stream "scrubbing" using `Accept-Ranges: none` [2]_  
- _Note: Because this prototype uses HTTP 1.1, we must respond w/ `Content-Type: application/ogg` on the initial request and w/ the actual stream content on the second request which contains `Range: bytes=0-` [3]_  

[1]: [kshaa: How to stream webcam as OGG over HTTP using VLC](https://gist.github.com/kshaa/3c0b8de502ad84b26e3eb8452d90b755)  
[2]: [Mozilla: How to stream OGG media over HTTP 1.1](https://developer.mozilla.org/en-US/docs/Web/HTTP/Configuring_servers_for_Ogg_media)  
[3]: [RFC-2616: Header Field Definitions, sec. "Range"](https://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.35)  
  