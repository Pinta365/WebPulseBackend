const loggerMode = Deno.env.get("LOGGER_MODE");
const mode = Deno.env.get("MODE") || "production";
const port = Number(Deno.env.get("PORT")) || 8000;
const baseURL = Deno.env.get("BACKEND_URL") || "https://localhost:" + port;
const allowedProjects = JSON.parse(Deno.env.get("ALLOWED_PROJECTS") || "[]");
const serveOptions = mode === "production"
    ? {
        // production
        port: port,
    }
    : {
        // development
        port: port,
        cert: Deno.readTextFileSync("./keys/cert.pem"),
        key: Deno.readTextFileSync("./keys/key.pem"),
    };

export const config = {
    loggerMode,
    mode,
    port,
    baseURL,
    allowedProjects,
    serveOptions
}