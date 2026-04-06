function respondJsonError(response, error = null, options = {}) {
  const { statusCode = 500, extra = {} } = options;
  const message =
    typeof error?.message === "string" && error.message.trim().length > 0
      ? error.message
      : "Internal Server Error";

  return response.status(statusCode).json({
    ...extra,
    error: message,
  });
}

module.exports = { respondJsonError };
