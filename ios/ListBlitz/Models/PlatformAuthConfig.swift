import Foundation

// MARK: - Auth Method

enum AuthMethod: String, CaseIterable, Sendable, Equatable {
    case webLogin = "web_login"
    case google = "google"
    case apple = "apple"
    case facebook = "facebook"
    case credentials = "credentials"
    case apiKey = "api_key"

    var displayName: String {
        switch self {
        case .webLogin: "Sign in via Browser"
        case .google: "Continue with Google"
        case .apple: "Sign in with Apple"
        case .facebook: "Continue with Facebook"
        case .credentials: "Email & Password"
        case .apiKey: "Enter API Key"
        }
    }

    var icon: String {
        switch self {
        case .webLogin: "safari.fill"
        case .google: "globe"
        case .apple: "apple.logo"
        case .facebook: "person.crop.square.fill"
        case .credentials: "envelope.fill"
        case .apiKey: "key.fill"
        }
    }
}

// MARK: - Platform Auth Config

struct PlatformAuthConfig: Sendable {
    let platform: String
    let displayName: String
    let loginURL: URL
    let supportedMethods: [AuthMethod]
    let sessionCookieNames: [String]
    let callbackScheme: String

    var hasGoogle: Bool { supportedMethods.contains(.google) }
    var hasApple: Bool { supportedMethods.contains(.apple) }
    var hasFacebook: Bool { supportedMethods.contains(.facebook) }
    var hasCredentials: Bool { supportedMethods.contains(.credentials) }
    var hasAPIKey: Bool { supportedMethods.contains(.apiKey) }
}

// MARK: - All Platform Configs

enum PlatformAuthConfigs {
    static let all: [PlatformAuthConfig] = [
        PlatformAuthConfig(
            platform: "depop",
            displayName: "Depop",
            loginURL: URL(string: "https://www.depop.com/login/")!,
            supportedMethods: [.webLogin, .google, .apple, .facebook, .credentials],
            sessionCookieNames: ["_depop_session"],
            callbackScheme: "listblitz-auth"
        ),
        PlatformAuthConfig(
            platform: "grailed",
            displayName: "Grailed",
            loginURL: URL(string: "https://www.grailed.com/users/sign_in")!,
            supportedMethods: [.webLogin, .google, .apple, .credentials],
            sessionCookieNames: ["_grailed_session"],
            callbackScheme: "listblitz-auth"
        ),
        PlatformAuthConfig(
            platform: "poshmark",
            displayName: "Poshmark",
            loginURL: URL(string: "https://poshmark.com/login")!,
            supportedMethods: [.webLogin, .google, .apple, .facebook, .credentials],
            sessionCookieNames: ["_poshmark_session"],
            callbackScheme: "listblitz-auth"
        ),
        PlatformAuthConfig(
            platform: "mercari",
            displayName: "Mercari",
            loginURL: URL(string: "https://www.mercari.com/login/")!,
            supportedMethods: [.webLogin, .google, .apple, .facebook, .credentials],
            sessionCookieNames: ["_mercari_session"],
            callbackScheme: "listblitz-auth"
        ),
        PlatformAuthConfig(
            platform: "ebay",
            displayName: "eBay",
            loginURL: URL(string: "https://signin.ebay.com/ws/eBayISAPI.dll?SignIn")!,
            supportedMethods: [.webLogin, .google, .apple, .credentials, .apiKey],
            sessionCookieNames: ["ebay_session"],
            callbackScheme: "listblitz-auth"
        ),
        PlatformAuthConfig(
            platform: "vinted",
            displayName: "Vinted",
            loginURL: URL(string: "https://www.vinted.com/member/login")!,
            supportedMethods: [.webLogin, .google, .apple, .facebook, .credentials, .apiKey],
            sessionCookieNames: ["_vinted_session"],
            callbackScheme: "listblitz-auth"
        ),
        PlatformAuthConfig(
            platform: "facebook",
            displayName: "Facebook Marketplace",
            loginURL: URL(string: "https://www.facebook.com/login/")!,
            supportedMethods: [.webLogin, .facebook],
            sessionCookieNames: ["c_user", "xs"],
            callbackScheme: "listblitz-auth"
        ),
        PlatformAuthConfig(
            platform: "vestiaire",
            displayName: "Vestiaire Collective",
            loginURL: URL(string: "https://www.vestiairecollective.com/authentication/")!,
            supportedMethods: [.webLogin, .google, .apple, .facebook, .credentials],
            sessionCookieNames: ["_vc_session"],
            callbackScheme: "listblitz-auth"
        ),
    ]

    static func config(for platform: String) -> PlatformAuthConfig? {
        all.first { $0.platform == platform.lowercased() }
    }
}

// MARK: - Auth Result

struct PlatformAuthResult: Sendable {
    let platform: String
    let authMethod: AuthMethod
    let cookies: [String: String]?
    let appleIdToken: String?
    let appleAuthCode: String?
    let username: String?
    let password: String?
}

// MARK: - Connect Request

struct PlatformConnectRequest: Encodable {
    let platform: String
    let authMethod: String
    var username: String?
    var password: String?
    var sessionData: String?
    var appleIdToken: String?
    var appleAuthCode: String?

    static func fromResult(_ result: PlatformAuthResult) -> PlatformConnectRequest {
        var req = PlatformConnectRequest(
            platform: result.platform,
            authMethod: result.authMethod.rawValue
        )
        switch result.authMethod {
        case .credentials:
            req.username = result.username
            req.password = result.password
        case .apiKey:
            req.username = ""
            req.password = result.password
        case .apple:
            req.appleIdToken = result.appleIdToken
            req.appleAuthCode = result.appleAuthCode
        case .webLogin, .google, .facebook:
            if let cookies = result.cookies {
                req.sessionData = try? String(
                    data: JSONSerialization.data(withJSONObject: cookies),
                    encoding: .utf8
                )
            }
        }
        return req
    }
}
