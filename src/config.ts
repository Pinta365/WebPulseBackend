const loggerMode = Deno.env.get("LOGGER_MODE");
const serverMode = Deno.env.get("SERVER_MODE");
const serverPort = Number(Deno.env.get("SERVER_PORT"));
const trackerURL = Deno.env.get("TRACKER_URL");
const serveHttpsString = Deno.env.get("SERVE_HTTPS");
const runMigrationsString = Deno.env.get("RUN_MIGRATIONS");
const MongoUri = Deno.env.get("MONGO_URI");
const MongoDb = Deno.env.get("MONGO_DB");

// Export the config along with some default values.
export const config = {
    loggerMode: loggerMode || "console",
    serverMode: serverMode || "production",
    serverPort: serverPort || 8000,
    trackerURL: trackerURL || "https://localhost:8000",
    serveHttps: serveHttpsString?.toLowerCase() === "true" ? true : false,
    runMigrations: runMigrationsString?.toLowerCase() === "true" ? true : false,
    MongoUri: MongoUri,
    // Overridable so tests can target a throwaway database instead of the real
    // one. Defaults to the production name, so nothing changes unless it is set.
    MongoDb: MongoDb || "WebPulse",
};
