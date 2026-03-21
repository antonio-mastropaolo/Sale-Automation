import Foundation

struct User: Codable, Identifiable, Sendable {
    let id: String
    let email: String
    let username: String
    let role: String?
    let onboarded: Bool?
    let createdAt: String?

    var isAdmin: Bool {
        role == "admin" || username == "antonio"
    }

    var displayName: String {
        username.isEmpty ? email : username
    }

    var initials: String {
        let parts = displayName.split(separator: " ")
        if parts.count >= 2 {
            return "\(parts[0].prefix(1))\(parts[1].prefix(1))".uppercased()
        }
        return String(displayName.prefix(2)).uppercased()
    }
}

struct AuthResponse: Codable {
    let user: User
    let token: String?
}

struct LoginRequest: Codable {
    let email: String
    let password: String
}

struct RegisterRequest: Codable {
    let email: String
    let username: String
    let password: String
}
