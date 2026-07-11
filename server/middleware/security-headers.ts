export default defineEventHandler((event) => {
  setHeader(event, "X-Content-Type-Options", "nosniff");
  setHeader(event, "Referrer-Policy", "strict-origin-when-cross-origin");
  setHeader(event, "Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  setHeader(event, "X-Frame-Options", "DENY");

  if (process.env.NODE_ENV === "production") {
    setHeader(event, "Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
});
