export class ApiError extends Error {
  constructor(message, response, status) {
    super(message);
    this.name = "ApiError";
    this.response = response;
    this.status = status;
    this.errors = response?.errors ?? [];
  }
}

export class ApiClient {
  constructor({ baseUrl = "/api", defaultHeaders = {}, credentials = "same-origin" } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.defaultHeaders = { ...defaultHeaders };
    this.credentials = credentials;
  }

  get(path, options = {}) {
    return this.request(path, { ...options, method: "GET" });
  }

  post(path, body = {}, options = {}) {
    return this.request(path, { ...options, method: "POST", body });
  }

  put(path, body = {}, options = {}) {
    return this.request(path, { ...options, method: "PUT", body });
  }

  patch(path, body = {}, options = {}) {
    return this.request(path, { ...options, method: "PATCH", body });
  }

  delete(path, options = {}) {
    return this.request(path, { ...options, method: "DELETE" });
  }

  async request(path, { method = "GET", body = null, headers = {}, signal = null } = {}) {
    const response = await fetch(this.url(path), {
      method,
      credentials: this.credentials,
      headers: this.headers(headers, body),
      body: this.body(body),
      signal,
    });

    const payload = await this.parseJson(response);

    if (!this.isStandardPayload(payload)) {
      throw new ApiError("Invalid API response contract.", payload, response.status);
    }

    if (!response.ok || payload.success === false) {
      throw new ApiError(payload.message || "Request failed", payload, response.status);
    }

    return payload;
  }

  url(path) {
    const normalizedPath = String(path).replace(/^\//, "");

    return `${this.baseUrl}/${normalizedPath}`;
  }

  headers(headers, body) {
    const nextHeaders = {
      Accept: "application/json",
      ...this.defaultHeaders,
      ...headers,
    };

    if (body !== null && !(body instanceof FormData) && !nextHeaders["Content-Type"]) {
      nextHeaders["Content-Type"] = "application/json";
    }

    return nextHeaders;
  }

  body(body) {
    if (body === null || body instanceof FormData) {
      return body;
    }

    return JSON.stringify(body);
  }

  async parseJson(response) {
    const text = await response.text();

    if (!text) {
      return {
        success: response.ok,
        message: response.ok ? "OK" : "Request failed",
        data: null,
        meta: {},
        errors: [],
      };
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      throw new ApiError("Response is not valid JSON.", { raw: text }, response.status);
    }
  }

  isStandardPayload(payload) {
    return payload
      && typeof payload === "object"
      && Object.prototype.hasOwnProperty.call(payload, "success")
      && Object.prototype.hasOwnProperty.call(payload, "message")
      && Object.prototype.hasOwnProperty.call(payload, "data")
      && Object.prototype.hasOwnProperty.call(payload, "meta")
      && Object.prototype.hasOwnProperty.call(payload, "errors");
  }
}

export const apiClient = new ApiClient();
