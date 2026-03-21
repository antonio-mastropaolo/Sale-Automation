import Foundation

actor PlatformAuthService {
    static let shared = PlatformAuthService()
    private let api = APIClient.shared

    func connect(result: PlatformAuthResult) async throws -> ConnectedPlatform {
        let request = PlatformConnectRequest.fromResult(result)
        let response: ConnectedPlatform = try await api.post("/api/platforms/connect", body: request)
        return response
    }

    func connectWithCredentials(platform: String, username: String, password: String) async throws -> ConnectedPlatform {
        let result = PlatformAuthResult(
            platform: platform,
            authMethod: .credentials,
            cookies: nil,
            appleIdToken: nil,
            appleAuthCode: nil,
            username: username,
            password: password
        )
        return try await connect(result: result)
    }

    func connectWithAPIKey(platform: String, apiKey: String) async throws -> ConnectedPlatform {
        let result = PlatformAuthResult(
            platform: platform,
            authMethod: .apiKey,
            cookies: nil,
            appleIdToken: nil,
            appleAuthCode: nil,
            username: "",
            password: apiKey
        )
        return try await connect(result: result)
    }

    func getConnectedPlatforms() async throws -> [ConnectedPlatform] {
        try await api.get("/api/platforms/connect")
    }

    func disconnect(platform: String) async throws {
        try await api.delete("/api/platforms/connect?platform=\(platform)")
    }

    func testConnection(platform: String) async throws -> Bool {
        struct TestResult: Codable { let success: Bool }
        let result: TestResult = try await api.post("/api/platforms/test", body: ["platform": platform])
        return result.success
    }
}
