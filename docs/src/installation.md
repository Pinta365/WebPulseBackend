---
title: "Installation"
nav_order: 2
---

## Installation

### Backend

_HTTPS is required for the backend to work._

For local development you will need a valid TLS certificate and a private key for your server. Copy the files cert.pem
and key.pem into the ./keys-folder, set the environment variable MODE to "development" and it will pass them as cert and
key options properties for the Deno.Serve. Certificates can be created with OpenSSL.

Some more environment variables are required. Copy .env.example to .env and check it out.