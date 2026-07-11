export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, req, res, next) {
  let status = error.status || 500;
  let message = error.message || "Internal server error";

  if (error.name === "ZodError" && Array.isArray(error.issues)) {
    status = 400;
    message = error.issues
      .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
      .join("; ");
  } else if (error.code === 11000) {
    status = 409;
    const fields = Object.entries(error.keyValue || {})
      .map(([key, value]) => `${key} "${value}"`)
      .join(", ");
    message = fields
      ? `Already exists: ${fields}. Please use a different value.`
      : "A record with the same unique value already exists.";
  } else if (error.name === "CastError") {
    status = 400;
    message = `Invalid value for "${error.path}"`;
  } else if (error.name === "ValidationError" && error.errors) {
    status = 400;
    message = Object.values(error.errors)
      .map((entry) => entry.message)
      .join("; ");
  }

  const payload = { message };

  if (process.env.NODE_ENV !== "production") {
    payload.stack = error.stack;
  }

  res.status(status).json(payload);
}
