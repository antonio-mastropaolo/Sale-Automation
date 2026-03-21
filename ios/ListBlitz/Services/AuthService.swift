import Foundation

actor AuthService {
    static let shared = AuthService()
    private let api = APIClient.shared

    func login(email: String, password: String) async throws -> User {
        let response: AuthResponse = try await api.post("/api/auth/login", body: LoginRequest(email: email, password: password))
        if let token = response.token {
            KeychainHelper.save(key: "session_token", value: token)
        }
        return response.user
    }

    func register(email: String, username: String, password: String) async throws -> User {
        let response: AuthResponse = try await api.post("/api/auth/register", body: RegisterRequest(email: email, username: username, password: password))
        if let token = response.token {
            KeychainHelper.save(key: "session_token", value: token)
        }
        return response.user
    }

    func me() async throws -> User {
        let response: AuthResponse = try await api.get("/api/auth/me", skipCache: true)
        return response.user
    }

    func logout() async throws {
        try await api.postRaw("/api/auth/logout", body: EmptyBody())
    }
}

struct EmptyBody: Codable {}
