import Foundation

struct ConnectedPlatform: Codable, Identifiable, Sendable {
    let platform: String
    let connected: Bool?
    let username: String?
    let updatedAt: String?
    let authMethod: String?

    var id: String { platform }

    var isConnected: Bool { connected ?? false }

    var authMethodDisplay: String {
        guard let method = authMethod else { return "Credentials" }
        switch method {
        case "google": return "Google"
        case "apple": return "Apple"
        case "facebook": return "Facebook"
        case "web_session": return "Web Session"
        case "api_key": return "API Key"
        case "credentials": return "Email & Password"
        default: return method.capitalized
        }
    }
}
