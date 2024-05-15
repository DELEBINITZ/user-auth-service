class ApiResponse {
    constructor(statusCode, data, message = 'Success') {
        this.statusCode = statusCode;
        this.status = statusCode < 300;
        this.message = message;
        this.data = data;
    }
}

export {ApiResponse};
