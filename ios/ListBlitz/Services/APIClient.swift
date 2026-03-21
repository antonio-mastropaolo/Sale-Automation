import Foundation

actor APIClient {
    static let shared = APIClient()

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    // MARK: - Configuration
    // Change this to your ListBlitz server URL
    #if DEBUG
    private let baseURL = "http://localhost:3000"
    #else
    private let baseURL = "https://your-listblitz-domain.vercel.app"
    #endif

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 120
        config.urlCache = URLCache(
            memoryCapacity: 50 * 1024 * 1024,  // 50 MB
            diskCapacity: 200 * 1024 * 1024     // 200 MB
        )
        config.requestCachePolicy = .returnCacheDataElseLoad
        config.httpAdditionalHeaders = [
            "Accept": "application/json",
            "Content-Type": "application/json"
        ]
        self.session = URLSession(configuration: config)

        self.decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601

        self.encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
    }

    // MARK: - Public API

    func get<T: Decodable>(_ path: String, query: [String: String]? = nil, skipCache: Bool = false) async throws -> T {
        let request = try buildRequest(path: path, method: "GET", query: query, skipCache: skipCache)
        return try await execute(request)
    }

    func post<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        var request = try buildRequest(path: path, method: "POST")
        request.httpBody = try encoder.encode(body)
        return try await execute(request)
    }

    func post<T: Decodable>(_ path: String) async throws -> T {
        let request = try buildRequest(path: path, method: "POST")
        return try await execute(request)
    }

    func postRaw<B: Encodable>(_ path: String, body: B) async throws {
        var request = try buildRequest(path: path, method: "POST")
        request.httpBody = try encoder.encode(body)
        let (_, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw APIError.serverError(statusCode: (response as? HTTPURLResponse)?.statusCode ?? 500)
        }
    }

    func patch<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        var request = try buildRequest(path: path, method: "PATCH")
        request.httpBody = try encoder.encode(body)
        return try await execute(request)
    }

    func delete(_ path: String) async throws {
        let request = try buildRequest(path: path, method: "DELETE")
        let (_, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw APIError.serverError(statusCode: (response as? HTTPURLResponse)?.statusCode ?? 500)
        }
    }

    func upload<T: Decodable>(_ path: String, imageData: Data, fileName: String, fields: [String: String] = [:]) async throws -> T {
        let boundary = UUID().uuidString
        var request = try buildRequest(path: path, method: "POST")
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        for (key, value) in fields {
            body.appendString("--\(boundary)\r\n")
            body.appendString("Content-Disposition: form-data; name=\"\(key)\"\r\n\r\n")
            body.appendString("\(value)\r\n")
        }
        body.appendString("--\(boundary)\r\n")
        body.appendString("Content-Disposition: form-data; name=\"image\"; filename=\"\(fileName)\"\r\n")
        body.appendString("Content-Type: image/jpeg\r\n\r\n")
        body.append(imageData)
        body.appendString("\r\n--\(boundary)--\r\n")

        request.httpBody = body
        return try await execute(request)
    }

    // MARK: - Private

    private func buildRequest(path: String, method: String, query: [String: String]? = nil, skipCache: Bool = false) throws -> URLRequest {
        var components = URLComponents(string: baseURL + path)!
        if let query {
            components.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        }

        guard let url = components.url else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method

        if skipCache || method != "GET" {
            request.cachePolicy = .reloadIgnoringLocalCacheData
        }

        if let token = KeychainHelper.get(key: "session_token") {
            request.setValue("session_token=\(token)", forHTTPHeaderField: "Cookie")
        }

        return request
    }

    private func execute<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await session.data(for: request)

        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        // Extract and store session token from response cookies
        if let url = http.url,
           let headerFields = http.allHeaderFields as? [String: String] {
            let cookies = HTTPCookie.cookies(withResponseHeaderFields: headerFields, for: url)
            if let sessionCookie = cookies.first(where: { $0.name == "session_token" }) {
                KeychainHelper.save(key: "session_token", value: sessionCookie.value)
            }
        }

        switch http.statusCode {
        case 200...299:
            return try decoder.decode(T.self, from: data)
        case 401:
            if let errorResp = try? decoder.decode(APIErrorResponse.self, from: data),
               let msg = errorResp.error ?? errorResp.message {
                throw APIError.validation(msg)
            }
            throw APIError.unauthorized
        case 404:
            throw APIError.notFound
        case 422:
            if let errorResp = try? decoder.decode(APIErrorResponse.self, from: data) {
                throw APIError.validation(errorResp.error ?? "Validation error")
            }
            throw APIError.validation("Invalid request")
        default:
            if let errorResp = try? decoder.decode(APIErrorResponse.self, from: data) {
                throw APIError.server(errorResp.error ?? "Server error")
            }
            throw APIError.serverError(statusCode: http.statusCode)
        }
    }
}

// MARK: - Error Types

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case unauthorized
    case notFound
    case validation(String)
    case server(String)
    case serverError(statusCode: Int)
    case noData
    case decodingError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL: "Invalid URL"
        case .invalidResponse: "Invalid server response"
        case .unauthorized: "Session expired. Please log in again."
        case .notFound: "Resource not found"
        case .validation(let msg): msg
        case .server(let msg): msg
        case .serverError(let code): "Server error (\(code))"
        case .noData: "No data received"
        case .decodingError(let err): "Data error: \(err.localizedDescription)"
        }
    }
}

struct APIErrorResponse: Codable {
    let error: String?
    let message: String?
}

// MARK: - Data Extension

extension Data {
    mutating func appendString(_ string: String) {
        if let data = string.data(using: .utf8) {
            append(data)
        }
    }
}
