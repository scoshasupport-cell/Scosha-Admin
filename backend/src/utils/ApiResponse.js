class ApiResponse {
  constructor(statusCode, data = null, message = 'Success', meta = null) {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
    this.meta = meta;
  }

  send(res) {
    const payload = {
      success: this.success,
      message: this.message,
    };

    if (this.data !== undefined && this.data !== null) {
      payload.data = this.data;
    }

    if (this.meta) {
      payload.meta = this.meta;
    }

    return res.status(this.statusCode).json(payload);
  }

  static success(res, data = null, message = 'Success', statusCode = 200, meta = null) {
    return new ApiResponse(statusCode, data, message, meta).send(res);
  }

  static created(res, data = null, message = 'Created successfully') {
    return new ApiResponse(201, data, message).send(res);
  }

  static noContent(res) {
    return res.status(204).send();
  }

  static error(res, message = 'Error', statusCode = 400, errors = null) {
    const payload = {
      success: false,
      message,
    };
    if (errors) payload.errors = errors;
    return res.status(statusCode).json(payload);
  }
}

module.exports = { ApiResponse };
