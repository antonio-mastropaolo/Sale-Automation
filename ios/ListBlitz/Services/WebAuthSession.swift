import AuthenticationServices
import SwiftUI

@MainActor
@Observable
final class WebAuthSession: NSObject, ASWebAuthenticationPresentationContextProviding {
    var isAuthenticating = false
    var error: Error?

    func authenticate(config: PlatformAuthConfig, method: AuthMethod) async throws -> PlatformAuthResult {
        isAuthenticating = true
        defer { isAuthenticating = false }

        let url: URL
        switch method {
        case .google:
            // Open platform login page — Google SSO is available there
            url = config.loginURL
        case .facebook:
            url = config.loginURL
        case .webLogin:
            url = config.loginURL
        default:
            throw PlatformAuthError.unsupportedMethod
        }

        let cookies = try await performWebAuth(url: url, callbackScheme: config.callbackScheme)

        // Extract relevant cookies for this platform
        var cookieDict: [String: String] = [:]
        for cookie in cookies {
            cookieDict[cookie.name] = cookie.value
        }

        return PlatformAuthResult(
            platform: config.platform,
            authMethod: method,
            cookies: cookieDict,
            appleIdToken: nil,
            appleAuthCode: nil,
            username: nil,
            password: nil
        )
    }

    private func performWebAuth(url: URL, callbackScheme: String) async throws -> [HTTPCookie] {
        try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: callbackScheme
            ) { callbackURL, error in
                if let error {
                    if (error as NSError).code == ASWebAuthenticationSessionError.canceledLogin.rawValue {
                        continuation.resume(throwing: PlatformAuthError.cancelled)
                    } else {
                        continuation.resume(throwing: error)
                    }
                    return
                }

                // Extract cookies from shared cookie storage
                let cookies = HTTPCookieStorage.shared.cookies ?? []
                continuation.resume(returning: cookies)
            }

            session.prefersEphemeralWebBrowserSession = false
            session.presentationContextProvider = self

            if !session.start() {
                continuation.resume(throwing: PlatformAuthError.failedToStart)
            }
        }
    }

    // MARK: - ASWebAuthenticationPresentationContextProviding

    nonisolated func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        ASPresentationAnchor()
    }
}

enum PlatformAuthError: LocalizedError {
    case unsupportedMethod
    case cancelled
    case failedToStart
    case noCookies
    case noAppleToken

    var errorDescription: String? {
        switch self {
        case .unsupportedMethod: "This authentication method is not supported"
        case .cancelled: "Authentication was cancelled"
        case .failedToStart: "Could not start authentication session"
        case .noCookies: "No session cookies were captured"
        case .noAppleToken: "Apple Sign-In did not return a valid token"
        }
    }
}
