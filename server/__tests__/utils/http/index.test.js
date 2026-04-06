/* eslint-env jest */

describe("HTTP utils", () => {
  test("respondJsonError returns a JSON payload with a useful message", () => {
    const { respondJsonError } = require("../../../utils/http/respondJsonError");
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const response = { status };

    respondJsonError(response, new Error("Disk is read-only"), {
      statusCode: 500,
      extra: { newValues: null },
    });

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      newValues: null,
      error: "Disk is read-only",
    });
  });

  test("respondJsonError falls back to Internal Server Error", () => {
    const { respondJsonError } = require("../../../utils/http/respondJsonError");
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const response = { status };

    respondJsonError(response, null);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: "Internal Server Error",
    });
  });
});
