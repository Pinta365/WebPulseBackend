const loggerMode = Deno.env.get("LOGGER_MODE");
const serverMode = Deno.env.get("SERVER_MODE");
const serverPort = Number(Deno.env.get("SERVER_PORT"));
const trackerURL = Deno.env.get("TRACKER_URL");
const serveHttpsString = Deno.env.get("SERVE_HTTPS");
const allowedProjects = Deno.env.get("ALLOWED_PROJECTS");
const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS");
const commonHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST",
    "Access-Control-Allow-Headers": "Content-Type",
};

// Export the config along with some default values.
export const config = {
    loggerMode: loggerMode || "console",
    serverMode: serverMode || "production",
    serverPort: serverPort || 8000,
    trackerURL: trackerURL || "https://localhost:8000",
    allowedProjects: JSON.parse(allowedProjects || "[]"),
    allowedOrigins: JSON.parse(allowedOrigins || "[]"),
    serveHttps: serveHttpsString?.toLowerCase() === "true" ? true : false,
    commonHeaders,
};
