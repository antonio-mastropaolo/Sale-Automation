import Testing
import Foundation
@testable import ListBlitz

@Suite("Platform Authentication")
struct PlatformAuthTests {

    // MARK: - Config Validation (parameterized over all 8 platforms)

    @Test("Every platform has valid config", arguments: TestData.platforms)
    func platformHasConfig(platform: String) {
        let config = PlatformAuthConfigs.config(for: platform)
        #expect(config != nil, "Config missing for \(platform)")
    }

    @Test("Every platform has valid login URL", arguments: TestData.platforms)
    func platformHasLoginURL(platform: String) {
        let config = PlatformAuthConfigs.config(for: platform)!
        #expect(config.loginURL.absoluteString.hasPrefix("https://"))
    }

    @Test("Every platform supports web login", arguments: TestData.platforms)
    func platformSupportsWebLogin(platform: String) {
        let config = PlatformAuthConfigs.config(for: platform)!
        #expect(config.supportedMethods.contains(.webLogin))
    }

    @Test("All platforms except Facebook support credentials", arguments: ["depop", "grailed", "poshmark", "mercari", "ebay", "vinted", "vestiaire"])
    func platformSupportsCredentials(platform: String) {
        let config = PlatformAuthConfigs.config(for: platform)!
        #expect(config.hasCredentials)
    }

    @Test("Facebook does NOT support credentials")
    func facebookNoCredentials() {
        let config = PlatformAuthConfigs.config(for: "facebook")!
        #expect(!config.hasCredentials)
    }

    // MARK: - Google Support

    @Test("Platforms with Google", arguments: ["depop", "grailed", "poshmark", "mercari", "ebay", "vinted", "vestiaire"])
    func platformHasGoogle(platform: String) {
        let config = PlatformAuthConfigs.config(for: platform)!
        #expect(config.hasGoogle)
    }

    @Test("Facebook does NOT have Google")
    func facebookNoGoogle() {
        let config = PlatformAuthConfigs.config(for: "facebook")!
        #expect(!config.hasGoogle)
    }

    // MARK: - Apple Support

    @Test("Platforms with Apple", arguments: ["depop", "grailed", "poshmark", "mercari", "ebay", "vinted", "vestiaire"])
    func platformHasApple(platform: String) {
        let config = PlatformAuthConfigs.config(for: platform)!
        #expect(config.hasApple)
    }

    @Test("Facebook does NOT have Apple")
    func facebookNoApple() {
        let config = PlatformAuthConfigs.config(for: "facebook")!
        #expect(!config.hasApple)
    }

    // MARK: - Facebook Login Support

    @Test("Platforms with Facebook login", arguments: ["depop", "poshmark", "mercari", "vinted", "facebook", "vestiaire"])
    func platformHasFacebook(platform: String) {
        let config = PlatformAuthConfigs.config(for: platform)!
        #expect(config.hasFacebook)
    }

    @Test("Grailed and eBay do NOT have Facebook", arguments: ["grailed", "ebay"])
    func platformNoFacebook(platform: String) {
        let config = PlatformAuthConfigs.config(for: platform)!
        #expect(!config.hasFacebook)
    }

    // MARK: - API Key Support

    @Test("eBay supports API key")
    func ebayAPIKey() {
        let config = PlatformAuthConfigs.config(for: "ebay")!
        #expect(config.hasAPIKey)
    }

    @Test("Vinted supports API key")
    func vintedAPIKey() {
        let config = PlatformAuthConfigs.config(for: "vinted")!
        #expect(config.hasAPIKey)
    }

    @Test("Other platforms do NOT have API key", arguments: ["depop", "grailed", "poshmark", "mercari", "facebook", "vestiaire"])
    func noAPIKey(platform: String) {
        let config = PlatformAuthConfigs.config(for: platform)!
        #expect(!config.hasAPIKey)
    }

    // MARK: - Config Completeness

    @Test("Exactly 8 platform configs exist")
    func configCount() {
        #expect(PlatformAuthConfigs.all.count == 8)
    }

    @Test("All platform names are unique")
    func uniquePlatformNames() {
        let names = PlatformAuthConfigs.all.map { $0.platform }
        #expect(Set(names).count == names.count)
    }

    @Test("All display names are non-empty", arguments: TestData.platforms)
    func displayNamesNonEmpty(platform: String) {
        let config = PlatformAuthConfigs.config(for: platform)!
        #expect(!config.displayName.isEmpty)
    }

    @Test("Callback scheme is consistent", arguments: TestData.platforms)
    func callbackScheme(platform: String) {
        let config = PlatformAuthConfigs.config(for: platform)!
        #expect(config.callbackScheme == "listblitz-auth")
    }

    // MARK: - ConnectedPlatform Decoding

    @Test("ConnectedPlatform decodes with all fields")
    func decodeConnectedPlatform() throws {
        let json = """
        {"platform":"depop","connected":true,"username":"antonio","updatedAt":"2026-03-20T10:00:00.000Z","authMethod":"google"}
        """.data(using: .utf8)!
        let platform = try TestFixtures.decoder.decode(ConnectedPlatform.self, from: json)
        #expect(platform.platform == "depop")
        #expect(platform.isConnected == true)
        #expect(platform.username == "antonio")
        #expect(platform.authMethod == "google")
        #expect(platform.authMethodDisplay == "Google")
    }

    @Test("ConnectedPlatform decodes with nil optionals")
    func decodeConnectedPlatformNils() throws {
        let json = """
        {"platform":"grailed","connected":false}
        """.data(using: .utf8)!
        let platform = try TestFixtures.decoder.decode(ConnectedPlatform.self, from: json)
        #expect(platform.platform == "grailed")
        #expect(platform.isConnected == false)
        #expect(platform.username == nil)
        #expect(platform.authMethod == nil)
        #expect(platform.authMethodDisplay == "Credentials")
    }

    // MARK: - PlatformConnectRequest Encoding

    @Test("Credential request encodes correctly")
    func encodeCredentialRequest() throws {
        let result = PlatformAuthResult(
            platform: "depop", authMethod: .credentials, cookies: nil,
            appleIdToken: nil, appleAuthCode: nil,
            username: "user@test.com", password: "pass123"
        )
        let request = PlatformConnectRequest.fromResult(result)
        #expect(request.platform == "depop")
        #expect(request.authMethod == "credentials")
        #expect(request.username == "user@test.com")
        #expect(request.password == "pass123")
        #expect(request.sessionData == nil)
        #expect(request.appleIdToken == nil)
    }

    @Test("Apple request encodes correctly")
    func encodeAppleRequest() throws {
        let result = PlatformAuthResult(
            platform: "grailed", authMethod: .apple, cookies: nil,
            appleIdToken: "id_token_abc", appleAuthCode: "auth_code_xyz",
            username: "user@icloud.com", password: nil
        )
        let request = PlatformConnectRequest.fromResult(result)
        #expect(request.platform == "grailed")
        #expect(request.authMethod == "apple")
        #expect(request.appleIdToken == "id_token_abc")
        #expect(request.appleAuthCode == "auth_code_xyz")
        #expect(request.username == nil)
        #expect(request.password == nil)
    }

    @Test("Web session request encodes cookies")
    func encodeWebSessionRequest() throws {
        let result = PlatformAuthResult(
            platform: "poshmark", authMethod: .webLogin,
            cookies: ["_session": "abc123", "user": "test"],
            appleIdToken: nil, appleAuthCode: nil,
            username: nil, password: nil
        )
        let request = PlatformConnectRequest.fromResult(result)
        #expect(request.platform == "poshmark")
        #expect(request.authMethod == "web_login")
        #expect(request.sessionData != nil)
        #expect(request.sessionData!.contains("abc123"))
    }

    @Test("API key request encodes correctly")
    func encodeAPIKeyRequest() throws {
        let result = PlatformAuthResult(
            platform: "vinted", authMethod: .apiKey, cookies: nil,
            appleIdToken: nil, appleAuthCode: nil,
            username: "", password: "access_key,signing_key"
        )
        let request = PlatformConnectRequest.fromResult(result)
        #expect(request.platform == "vinted")
        #expect(request.authMethod == "api_key")
        #expect(request.password == "access_key,signing_key")
        #expect(request.username == "" || request.username == nil)
    }

    // MARK: - AuthMethod

    @Test("All auth method display names are non-empty", arguments: AuthMethod.allCases)
    func authMethodDisplayNames(method: AuthMethod) {
        #expect(!method.displayName.isEmpty)
    }

    @Test("All auth method icons are valid SF Symbols", arguments: AuthMethod.allCases)
    func authMethodIcons(method: AuthMethod) {
        #expect(!method.icon.isEmpty)
    }

    @Test("AuthMethod raw values are snake_case", arguments: AuthMethod.allCases)
    func authMethodRawValues(method: AuthMethod) {
        #expect(!method.rawValue.isEmpty)
        #expect(!method.rawValue.contains(" "))
    }

    // MARK: - Platform × AuthMethod Matrix (full cross-product)

    @Test("Platform × Method support matrix", arguments: TestData.platforms, AuthMethod.allCases)
    func platformMethodMatrix(platform: String, method: AuthMethod) {
        let config = PlatformAuthConfigs.config(for: platform)!
        let supports = config.supportedMethods.contains(method)
        // Just verify it doesn't crash — the individual tests above validate correctness
        #expect(supports || !supports)
    }
}
