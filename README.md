# WebPulse: Web Analytics with Deno

Host on your own server or Deno Deploy.

**WORK IN PROGRESS**

Check out the developer documentation at [developer.webpulseanalytics.com](https://developer.webpulseanalytics.com)

## Installation

### Backend

_HTTPS is required for the backend to work._

For local development you will need a valid TLS certificate and a private key for your server. Copy the files cert.pem
and key.pem into the ./keys-folder, set the environment variable MODE to "development" and it will pass them as cert and
key options properties for the Deno.Serve. Certificates can be created with OpenSSL.

Some more environment variables are required. Copy .env.example to .env and check it out.

### Client example

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script async src="https://track.pinta.land/client.js?trackId=local.tests" type="module"></script>
    <title></title>
</head>
<body>
   Page content
</body>
</html>
```
