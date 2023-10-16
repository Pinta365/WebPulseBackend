---
title: "Installation"
nav_order: 2
---

## Installation

_HTTPS is required for the backend to work._

For local development, you will need to set up Deno and checkout the WebPulse Analytics project from GitHub. Follow these steps to get started:

1. **Deno Setup**:
   - If you haven't already, install Deno by following the official Deno installation guide [here](https://docs.deno.com/runtime/manual/getting_started/installation).
   - Make sure Deno is correctly installed by running `deno --version` in your terminal.

2. **Project Checkout**:
   - Clone the WebPulse Analytics backend project repository from GitHub. Use the following command to clone the repository to your local machine:

     ```bash
     git clone https://github.com/pinta365/webpulsebackend.git
     ```

   - Navigate to the project directory:

     ```bash
     cd webpulsebackend
     ```

3. **TLS Certificate Setup**:
   - For local development, you will need a valid TLS certificate and a private key for your server. Copy the files `cert.pem` and `key.pem` into the `./keys` folder in the project directory. These files will be used for HTTPS communication.

   - Set the environment variable `MODE` to "development" to instruct the server to use these certificates:

     ```bash
     export MODE=development
     ```

   - Certificates can be created with OpenSSL. If you don't have these certificates, you can generate self-signed certificates or obtain valid certificates for production use.

4. **Environment Variables**:
   - Some more environment variables are required for the project. Copy the provided `.env.example` file to `.env` and inspect it to understand the required variables. Make any necessary changes to match your local setup.

5. **Start the WebPulse Analytics Backend**:
   - Run the following command to start the WebPulse Analytics backend. The `-A` flag allows all permissions for Deno, and `mod.ts` is the entry point of the project:

     ```bash
     deno run -A mod.ts
     ```

   - The backend will start, and you will be able to access it locally via HTTPS.

By following these steps, you'll have the WebPulse Analytics backend set up on your local machine, allowing you to develop and test your project effectively. Make sure to refer to the project's documentation for more specific details and usage instructions.
