---
title: "Front-end Setup"
nav_order: 4
---

# Setting up the front-end for WebPulse

Learn how to set up an own instance of WebPulse Analytics front-end. The repo of the front end is
https://github.com/pinta365/webpulseanalytics.

## Getting started

1. Clone the WebPulse Analytics front-end repository:

```
git clone https://github.com/pinta365/webpulseanalytics
```

2. Navigate to the cloned directory:

```
cd webpulseanalytics
```

3. Install the dependencies:

```
deno install
```

4. Create a `.env` file in the root directory of the project. The contents of the file should be as follows:

```dotenv
# WebPulse Analytics Frontend .env Configuration

# JSON Web Token (JWT) secret for cookie encryption
JWT_SECRET=<your_jwt_secret_here>
JWT_COOKIE=webpulse_sess

# GitHub authentication
GITHUB_COOKIE_STATE_NAME=webpulse_auth_state
GITHUB_CLIENT_ID=<your_github_client_id>
GITHUB_CLIENT_SECRET=<your_github_client_secret>
GITHUB_CALLBACK_URL=http://localhost:8000/api/auth/github/callback

# Base URL for your website
WEBSITE_BASE_URL=http://localhost:8000

# Deno key-value (KV) database configuration
DENO_KV_LOCAL_DATABASE=./db/database
```

**Creating a new JWT Secret**

The `JWT_SECRET` is the foundation for generating the HMAC-SHA-256 cryptographic key used in JWT signing for cookie
encryption. It must be at least 32 characters. For development, any string works, but for a production environment, you
want something better.

To fully represent 32 bytes as a strong secret, you can use this snippet in the Deno REPL:

```ts
// Generate 32 bytes of random data
const randomBytes = new Uint8Array(32);
await crypto.getRandomValues(randomBytes);

// Create a hex encoded string from the data
Array.from(randomBytes, (byte) => ("0" + (byte & 0xFF).toString(16)).slice(-2)).join("");
```

> **Note** The resulting string will be 64 characters long - to create a strong secret, you convert 32 bytes of binary
> data into a 64-character long hex-encoded string. This conversion is necessary to ensure the secret can represent
> every permutation of 32 bytes of data.

**Creating a new GitHub OAuth application**

To get `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`, which are used for GitHub OAuth user authentication, follow these
steps:

1. **Login to GitHub:** Login to your GitHub account if you're not already logged in.

2. **Access Developer Settings:**
   - Click on your profile picture in the top right corner.
   - From the dropdown menu, select "Settings."

3. **Create a New OAuth Application:**
   - In the left sidebar, scroll down and select "Developer settings."
   - Under "OAuth Apps," click on "New OAuth App."

4. **Fill in OAuth Application Details:**
   - **Application Name:** Choose a name for your OAuth application. This is the name that users will see when
     authorizing your application.
   - **Homepage URL:** This should match your application's base URL.
   - **Application Description (Optional):** You can provide a brief description of your application.
   - **Authorization Callback URL:** Set this to the `GITHUB_CALLBACK_URL` from your `.env` file. In your case, it's
     likely `http://localhost:8000/api/auth/github/callback` for a local development environment.

5. **Access Your GitHub OAuth Application:**
   - Once you've filled in the details, click "Register application."

6. **Copy Your GitHub OAuth Application Values:**
   - After registering the application, you will be taken to the application details page.
   - Here, you can find your `Client ID` and `Client Secret`. These are the values you need for the `GITHUB_CLIENT_ID`
     and `GITHUB_CLIENT_SECRET` in your `.env` file.

## Start the server

To start the front-end server, run the following command:

```
deno task start
```

You will then be able to access the front-end at http://localhost:800
