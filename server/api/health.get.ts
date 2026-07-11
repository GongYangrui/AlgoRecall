export default defineEventHandler((event) => sendRedirect(event, "/api/health/live", 307));
