import SwiftUI

struct LoginView: View {
    @Environment(AppState.self) private var appState
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showRegister = false
    @FocusState private var focusedField: Field?

    enum Field { case email, password }

    var body: some View {
        ZStack {
            // Background gradient mesh
            backgroundMesh

            ScrollView {
                VStack(spacing: 32) {
                    Spacer(minLength: 80)

                    // Logo
                    VStack(spacing: 16) {
                        Image(systemName: "bolt.fill")
                            .font(.system(size: 56, weight: .bold))
                            .foregroundStyle(Theme.accent)
                            .symbolEffect(.breathe)

                        Text("ListBlitz")
                            .font(.system(size: 44, weight: .black, design: .rounded))
                            .foregroundStyle(.white)

                        Text("List once, sell everywhere")
                            .font(.subheadline)
                            .foregroundStyle(Theme.textTertiary)
                    }
                    .padding(.bottom, 24)

                    // Form
                    VStack(spacing: 16) {
                        // Email field
                        HStack(spacing: 12) {
                            Image(systemName: "envelope.fill")
                                .font(.body)
                                .foregroundStyle(Theme.textTertiary)
                                .frame(width: 20)

                            TextField("Email", text: $email)
                                .keyboardType(.emailAddress)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .textContentType(.emailAddress)
                                .foregroundStyle(Theme.textPrimary)
                        }
                        .padding(16)
                        .background(.ultraThinMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous)
                                .stroke(.white.opacity(0.08), lineWidth: 0.5)
                        )
                        .focused($focusedField, equals: .email)
                        .submitLabel(.next)
                        .onSubmit { focusedField = .password }

                        // Password field
                        HStack(spacing: 12) {
                            Image(systemName: "lock.fill")
                                .font(.body)
                                .foregroundStyle(Theme.textTertiary)
                                .frame(width: 20)

                            SecureField("Password", text: $password)
                                .textContentType(.password)
                                .foregroundStyle(Theme.textPrimary)
                        }
                        .padding(16)
                        .background(.ultraThinMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous)
                                .stroke(.white.opacity(0.08), lineWidth: 0.5)
                        )
                        .focused($focusedField, equals: .password)
                        .submitLabel(.go)
                        .onSubmit { login() }
                    }

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundStyle(Theme.error)
                            .transition(.move(edge: .top).combined(with: .opacity))
                    }

                    // Sign In Button
                    Button(action: login) {
                        Group {
                            if isLoading {
                                ProgressView()
                                    .tint(.black)
                            } else {
                                Text("Sign In")
                                    .font(.headline)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 54)
                        .background(
                            canSubmit
                                ? AnyShapeStyle(Theme.accentGradient)
                                : AnyShapeStyle(Theme.accent.opacity(0.25))
                        )
                        .foregroundStyle(canSubmit ? .black : .white.opacity(0.4))
                        .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
                    }
                    .disabled(!canSubmit || isLoading)

                    // Register Link
                    Button {
                        HapticEngine.light()
                        showRegister = true
                    } label: {
                        HStack(spacing: 4) {
                            Text("Don't have an account?")
                                .foregroundStyle(Theme.textTertiary)
                            Text("Sign Up")
                                .foregroundStyle(Theme.accent)
                                .fontWeight(.semibold)
                        }
                        .font(.subheadline)
                    }

                    Spacer(minLength: 40)
                }
                .padding(.horizontal, 32)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .sheet(isPresented: $showRegister) {
            RegisterView()
        }
        .animation(.smooth, value: errorMessage)
    }

    // MARK: - Background Mesh

    private var backgroundMesh: some View {
        ZStack {
            Theme.backgroundPrimary.ignoresSafeArea()

            Circle()
                .fill(Theme.accent.opacity(0.08))
                .frame(width: 400, height: 400)
                .blur(radius: 100)
                .offset(x: -100, y: -200)

            Circle()
                .fill(Theme.iosPurple.opacity(0.06))
                .frame(width: 350, height: 350)
                .blur(radius: 90)
                .offset(x: 120, y: 100)

            Circle()
                .fill(Theme.iosBlue.opacity(0.05))
                .frame(width: 300, height: 300)
                .blur(radius: 80)
                .offset(x: -80, y: 300)
        }
        .ignoresSafeArea()
    }

    private var canSubmit: Bool {
        !email.isEmpty && !password.isEmpty
    }

    private func login() {
        guard canSubmit else { return }
        focusedField = nil
        isLoading = true
        errorMessage = nil
        HapticEngine.medium()

        Task {
            do {
                try await appState.login(email: email, password: password)
            } catch {
                errorMessage = error.localizedDescription
                HapticEngine.error()
            }
            isLoading = false
        }
    }
}
