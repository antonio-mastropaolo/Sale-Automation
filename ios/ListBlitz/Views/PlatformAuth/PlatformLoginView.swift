import SwiftUI
import AuthenticationServices

struct PlatformLoginView: View {
    let config: PlatformAuthConfig
    var onConnected: ((ConnectedPlatform) -> Void)? = nil

    @Environment(\.dismiss) private var dismiss
    @State private var isLoading = false
    @State private var loadingMethod: AuthMethod?
    @State private var errorMessage: String?
    @State private var showCredentials = false
    @State private var showAPIKey = false
    @State private var isConnected = false

    @State private var webAuth = WebAuthSession()
    @State private var appleAuth = AppleSignInHelper()
    private let authService = PlatformAuthService.shared

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.backgroundPrimary.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 24) {
                        // Platform Header
                        VStack(spacing: 12) {
                            PlatformIcon(platform: config.platform, size: 72)

                            Text(config.displayName)
                                .font(.title2.bold())
                                .foregroundStyle(Theme.textPrimary)

                            Text("Choose how you sign in to \(config.displayName)")
                                .font(.subheadline)
                                .foregroundStyle(Theme.textTertiary)
                        }
                        .padding(.top, 32)

                        // Auth Method Buttons
                        VStack(spacing: 10) {
                            // Google
                            if config.hasGoogle {
                                authButton(
                                    method: .google,
                                    label: "Continue with Google",
                                    icon: "globe",
                                    bgColor: .white,
                                    fgColor: .black
                                )
                            }

                            // Apple Sign-In
                            if config.hasApple {
                                SignInWithAppleButton(.signIn) { request in
                                    request.requestedScopes = [.email, .fullName]
                                } onCompletion: { result in
                                    handleAppleSignIn(result)
                                }
                                .signInWithAppleButtonStyle(.white)
                                .frame(height: 50)
                                .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
                            }

                            // Facebook
                            if config.hasFacebook {
                                authButton(
                                    method: .facebook,
                                    label: "Continue with Facebook",
                                    icon: "person.crop.square.fill",
                                    bgColor: Color(hex: "1877F2"),
                                    fgColor: .white
                                )
                            }

                            // Divider
                            HStack {
                                Rectangle().fill(Theme.textTertiary.opacity(0.3)).frame(height: 0.5)
                                Text("or")
                                    .font(.caption)
                                    .foregroundStyle(Theme.textTertiary)
                                Rectangle().fill(Theme.textTertiary.opacity(0.3)).frame(height: 0.5)
                            }
                            .padding(.vertical, 4)

                            // Web Login
                            authButton(
                                method: .webLogin,
                                label: "Sign in via Browser",
                                icon: "safari.fill",
                                bgColor: Theme.backgroundCard,
                                fgColor: Theme.accent
                            )

                            // Email & Password
                            if config.hasCredentials {
                                Button {
                                    HapticEngine.light()
                                    showCredentials = true
                                } label: {
                                    HStack(spacing: 8) {
                                        Image(systemName: "envelope.fill")
                                        Text("Email & Password")
                                    }
                                    .font(.subheadline.bold())
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 50)
                                    .foregroundStyle(Theme.textSecondary)
                                    .background(Theme.backgroundCard)
                                    .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous)
                                            .stroke(Theme.textTertiary.opacity(0.3), lineWidth: 0.5)
                                    )
                                }
                            }

                            // API Key
                            if config.hasAPIKey {
                                Button {
                                    HapticEngine.light()
                                    showAPIKey = true
                                } label: {
                                    HStack(spacing: 8) {
                                        Image(systemName: "key.fill")
                                        Text("Enter API Key")
                                    }
                                    .font(.subheadline.bold())
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 50)
                                    .foregroundStyle(Theme.textSecondary)
                                    .background(Theme.backgroundCard)
                                    .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous)
                                            .stroke(Theme.textTertiary.opacity(0.3), lineWidth: 0.5)
                                    )
                                }
                            }
                        }
                        .padding(.horizontal, 24)

                        // Error
                        if let errorMessage {
                            Text(errorMessage)
                                .font(.caption)
                                .foregroundStyle(Theme.error)
                                .transition(.move(edge: .top).combined(with: .opacity))
                        }

                        // Success
                        if isConnected {
                            HStack(spacing: 8) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(Theme.success)
                                Text("Connected!")
                                    .font(.subheadline.bold())
                                    .foregroundStyle(Theme.success)
                            }
                            .transition(.scale.combined(with: .opacity))
                        }
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Theme.textSecondary)
                }
            }
            .sheet(isPresented: $showCredentials) {
                PlatformCredentialView(platform: config.platform, displayName: config.displayName) { connected in
                    isConnected = true
                    onConnected?(connected)
                    HapticEngine.success()
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1) { dismiss() }
                }
            }
            .sheet(isPresented: $showAPIKey) {
                PlatformAPIKeyView(platform: config.platform, displayName: config.displayName) { connected in
                    isConnected = true
                    onConnected?(connected)
                    HapticEngine.success()
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1) { dismiss() }
                }
            }
            .animation(.smooth, value: errorMessage)
            .animation(.spring, value: isConnected)
        }
    }

    // MARK: - Auth Button

    private func authButton(method: AuthMethod, label: String, icon: String, bgColor: Color, fgColor: Color) -> some View {
        Button {
            HapticEngine.medium()
            authenticate(method: method)
        } label: {
            HStack(spacing: 8) {
                if loadingMethod == method {
                    ProgressView().tint(fgColor).controlSize(.small)
                } else {
                    Image(systemName: icon)
                }
                Text(label)
            }
            .font(.subheadline.bold())
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .foregroundStyle(fgColor)
            .background(bgColor)
            .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
        }
        .disabled(isLoading)
    }

    // MARK: - Auth Actions

    private func authenticate(method: AuthMethod) {
        isLoading = true
        loadingMethod = method
        errorMessage = nil

        Task {
            do {
                let authResult = try await webAuth.authenticate(config: config, method: method)
                let connected = try await authService.connect(result: authResult)
                isConnected = true
                onConnected?(connected)
                HapticEngine.success()
                DispatchQueue.main.asyncAfter(deadline: .now() + 1) { dismiss() }
            } catch let error as PlatformAuthError where error == .cancelled {
                // User cancelled, don't show error
            } catch {
                errorMessage = error.localizedDescription
                HapticEngine.error()
            }
            isLoading = false
            loadingMethod = nil
        }
    }

    private func handleAppleSignIn(_ result: Result<ASAuthorization, Error>) {
        isLoading = true
        loadingMethod = .apple
        errorMessage = nil

        Task {
            do {
                guard case .success(let authorization) = result,
                      let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                      let tokenData = credential.identityToken,
                      let token = String(data: tokenData, encoding: .utf8),
                      let codeData = credential.authorizationCode,
                      let code = String(data: codeData, encoding: .utf8) else {
                    throw PlatformAuthError.noAppleToken
                }

                let authResult = PlatformAuthResult(
                    platform: config.platform,
                    authMethod: .apple,
                    cookies: nil,
                    appleIdToken: token,
                    appleAuthCode: code,
                    username: credential.email,
                    password: nil
                )
                let connected = try await authService.connect(result: authResult)
                isConnected = true
                onConnected?(connected)
                HapticEngine.success()
                DispatchQueue.main.asyncAfter(deadline: .now() + 1) { dismiss() }
            } catch {
                errorMessage = error.localizedDescription
                HapticEngine.error()
            }
            isLoading = false
            loadingMethod = nil
        }
    }
}

// MARK: - Credential Entry

struct PlatformCredentialView: View {
    let platform: String
    let displayName: String
    var onConnected: ((ConnectedPlatform) -> Void)? = nil

    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    private let authService = PlatformAuthService.shared

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.backgroundPrimary.ignoresSafeArea()

                VStack(spacing: 24) {
                    PlatformIcon(platform: platform, size: 48)

                    Text("Sign in to \(displayName)")
                        .font(.headline)
                        .foregroundStyle(Theme.textPrimary)

                    VStack(spacing: 14) {
                        HStack(spacing: 12) {
                            Image(systemName: "envelope.fill")
                                .foregroundStyle(Theme.textTertiary)
                                .frame(width: 20)
                            TextField("Email or Username", text: $email)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .foregroundStyle(Theme.textPrimary)
                        }
                        .padding(16)
                        .background(.ultraThinMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium))
                        .overlay(RoundedRectangle(cornerRadius: Theme.radiusMedium).stroke(.white.opacity(0.08), lineWidth: 0.5))

                        HStack(spacing: 12) {
                            Image(systemName: "lock.fill")
                                .foregroundStyle(Theme.textTertiary)
                                .frame(width: 20)
                            SecureField("Password", text: $password)
                                .foregroundStyle(Theme.textPrimary)
                        }
                        .padding(16)
                        .background(.ultraThinMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium))
                        .overlay(RoundedRectangle(cornerRadius: Theme.radiusMedium).stroke(.white.opacity(0.08), lineWidth: 0.5))
                    }
                    .padding(.horizontal, 24)

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundStyle(Theme.error)
                    }

                    Button {
                        HapticEngine.medium()
                        connect()
                    } label: {
                        Group {
                            if isLoading {
                                ProgressView().tint(.black)
                            } else {
                                Text("Save & Connect")
                                    .font(.headline)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(!email.isEmpty && !password.isEmpty ? AnyShapeStyle(Theme.accentGradient) : AnyShapeStyle(Theme.accent.opacity(0.3)))
                        .foregroundStyle(.black)
                        .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium))
                    }
                    .disabled(email.isEmpty || password.isEmpty || isLoading)
                    .padding(.horizontal, 24)

                    Spacer()
                }
                .padding(.top, 32)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Theme.textSecondary)
                }
            }
        }
    }

    private func connect() {
        isLoading = true
        errorMessage = nil
        Task {
            do {
                let connected = try await authService.connectWithCredentials(
                    platform: platform, username: email, password: password
                )
                onConnected?(connected)
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
                HapticEngine.error()
            }
            isLoading = false
        }
    }
}

// MARK: - API Key Entry

struct PlatformAPIKeyView: View {
    let platform: String
    let displayName: String
    var onConnected: ((ConnectedPlatform) -> Void)? = nil

    @Environment(\.dismiss) private var dismiss
    @State private var apiKey = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    private let authService = PlatformAuthService.shared

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.backgroundPrimary.ignoresSafeArea()

                VStack(spacing: 24) {
                    PlatformIcon(platform: platform, size: 48)

                    Text("\(displayName) API Key")
                        .font(.headline)
                        .foregroundStyle(Theme.textPrimary)

                    Text("Enter your API access key or token")
                        .font(.caption)
                        .foregroundStyle(Theme.textTertiary)

                    HStack(spacing: 12) {
                        Image(systemName: "key.fill")
                            .foregroundStyle(Theme.textTertiary)
                            .frame(width: 20)
                        SecureField("API Key or Token", text: $apiKey)
                            .foregroundStyle(Theme.textPrimary)
                    }
                    .padding(16)
                    .background(.ultraThinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium))
                    .overlay(RoundedRectangle(cornerRadius: Theme.radiusMedium).stroke(.white.opacity(0.08), lineWidth: 0.5))
                    .padding(.horizontal, 24)

                    if let errorMessage {
                        Text(errorMessage).font(.caption).foregroundStyle(Theme.error)
                    }

                    Button {
                        HapticEngine.medium()
                        connect()
                    } label: {
                        Group {
                            if isLoading { ProgressView().tint(.black) }
                            else { Text("Save & Connect").font(.headline) }
                        }
                        .frame(maxWidth: .infinity).frame(height: 50)
                        .background(!apiKey.isEmpty ? AnyShapeStyle(Theme.accentGradient) : AnyShapeStyle(Theme.accent.opacity(0.3)))
                        .foregroundStyle(.black)
                        .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium))
                    }
                    .disabled(apiKey.isEmpty || isLoading)
                    .padding(.horizontal, 24)

                    Spacer()
                }
                .padding(.top, 32)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }.foregroundStyle(Theme.textSecondary)
                }
            }
        }
    }

    private func connect() {
        isLoading = true
        errorMessage = nil
        Task {
            do {
                let connected = try await authService.connectWithAPIKey(platform: platform, apiKey: apiKey)
                onConnected?(connected)
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
                HapticEngine.error()
            }
            isLoading = false
        }
    }
}
