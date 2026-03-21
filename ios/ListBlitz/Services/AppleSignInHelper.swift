import AuthenticationServices
import SwiftUI

@MainActor
@Observable
final class AppleSignInHelper: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    var isSigningIn = false
    var error: Error?

    private var continuation: CheckedContinuation<(identityToken: String, authorizationCode: String, email: String?), Error>?

    func signIn() async throws -> PlatformAuthResult {
        isSigningIn = true
        defer { isSigningIn = false }

        let result = try await performAppleSignIn()

        return PlatformAuthResult(
            platform: "", // caller sets the platform
            authMethod: .apple,
            cookies: nil,
            appleIdToken: result.identityToken,
            appleAuthCode: result.authorizationCode,
            username: result.email,
            password: nil
        )
    }

    func signIn(forPlatform platform: String) async throws -> PlatformAuthResult {
        var result = try await signIn()
        return PlatformAuthResult(
            platform: platform,
            authMethod: .apple,
            cookies: nil,
            appleIdToken: result.appleIdToken,
            appleAuthCode: result.appleAuthCode,
            username: result.username,
            password: nil
        )
    }

    private func performAppleSignIn() async throws -> (identityToken: String, authorizationCode: String, email: String?) {
        try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation

            let provider = ASAuthorizationAppleIDProvider()
            let request = provider.createRequest()
            request.requestedScopes = [.email, .fullName]

            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    // MARK: - ASAuthorizationControllerDelegate

    nonisolated func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        Task { @MainActor in
            guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential else {
                continuation?.resume(throwing: PlatformAuthError.noAppleToken)
                continuation = nil
                return
            }

            guard let identityTokenData = appleIDCredential.identityToken,
                  let identityToken = String(data: identityTokenData, encoding: .utf8),
                  let authCodeData = appleIDCredential.authorizationCode,
                  let authCode = String(data: authCodeData, encoding: .utf8) else {
                continuation?.resume(throwing: PlatformAuthError.noAppleToken)
                continuation = nil
                return
            }

            let email = appleIDCredential.email
            continuation?.resume(returning: (identityToken, authCode, email))
            continuation = nil
        }
    }

    nonisolated func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        Task { @MainActor in
            continuation?.resume(throwing: error)
            continuation = nil
        }
    }

    // MARK: - ASAuthorizationControllerPresentationContextProviding

    nonisolated func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        ASPresentationAnchor()
    }
}
