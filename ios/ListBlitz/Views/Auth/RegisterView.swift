import SwiftUI

struct RegisterView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var username = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @FocusState private var focusedField: Field?

    enum Field: Hashable { case email, username, password, confirm }

    var body: some View {
        NavigationStack {
            ZStack {
                // Background mesh
                ZStack {
                    Theme.backgroundPrimary.ignoresSafeArea()

                    Circle()
                        .fill(Theme.accent.opacity(0.07))
                        .frame(width: 350, height: 350)
                        .blur(radius: 90)
                        .offset(x: 100, y: -150)

                    Circle()
                        .fill(Theme.iosPurple.opacity(0.05))
                        .frame(width: 300, height: 300)
                        .blur(radius: 80)
                        .offset(x: -80, y: 200)
                }
                .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 24) {
                        // Header
                        VStack(spacing: 10) {
                            Image(systemName: "bolt.fill")
                                .font(.system(size: 40, weight: .bold))
                                .foregroundStyle(Theme.accent)
                                .symbolEffect(.breathe)

                            Text("Create Account")
                                .font(.system(size: 30, weight: .bold, design: .rounded))
                                .foregroundStyle(.white)

                            Text("Start selling across every platform")
                                .font(.subheadline)
                                .foregroundStyle(Theme.textTertiary)
                        }
                        .padding(.top, 24)

                        // Form fields
                        VStack(spacing: 14) {
                            frostedField(icon: "envelope.fill", placeholder: "Email", text: $email, keyboard: .emailAddress, content: .emailAddress)
                                .focused($focusedField, equals: .email)
                                .submitLabel(.next)
                                .onSubmit { focusedField = .username }

                            frostedField(icon: "person.fill", placeholder: "Username", text: $username, content: .username)
                                .focused($focusedField, equals: .username)
                                .submitLabel(.next)
                                .onSubmit { focusedField = .password }

                            frostedSecureField(icon: "lock.fill", placeholder: "Password", text: $password)
                                .focused($focusedField, equals: .password)
                                .submitLabel(.next)
                                .onSubmit { focusedField = .confirm }

                            frostedSecureField(icon: "lock.shield.fill", placeholder: "Confirm Password", text: $confirmPassword)
                                .focused($focusedField, equals: .confirm)
                                .submitLabel(.go)
                                .onSubmit { register() }
                        }

                        if let errorMessage {
                            Text(errorMessage)
                                .font(.caption)
                                .foregroundStyle(Theme.error)
                                .transition(.move(edge: .top).combined(with: .opacity))
                        }

                        // Create Account Button
                        Button(action: register) {
                            Group {
                                if isLoading {
                                    ProgressView().tint(.black)
                                } else {
                                    Text("Create Account")
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
                    }
                    .padding(.horizontal, 32)
                    .padding(.bottom, 40)
                }
                .scrollDismissesKeyboard(.interactively)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Theme.textSecondary)
                }
            }
        }
        .animation(.smooth, value: errorMessage)
    }

    // MARK: - Frosted Fields

    private func frostedField(icon: String, placeholder: String, text: Binding<String>, keyboard: UIKeyboardType = .default, content: UITextContentType? = nil) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(Theme.textTertiary)
                .frame(width: 20)

            TextField(placeholder, text: text)
                .keyboardType(keyboard)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .textContentType(content)
                .foregroundStyle(Theme.textPrimary)
        }
        .padding(16)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous)
                .stroke(.white.opacity(0.08), lineWidth: 0.5)
        )
    }

    private func frostedSecureField(icon: String, placeholder: String, text: Binding<String>) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(Theme.textTertiary)
                .frame(width: 20)

            SecureField(placeholder, text: text)
                .textContentType(.newPassword)
                .foregroundStyle(Theme.textPrimary)
        }
        .padding(16)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous)
                .stroke(.white.opacity(0.08), lineWidth: 0.5)
        )
    }

    private var canSubmit: Bool {
        !email.isEmpty && !username.isEmpty && !password.isEmpty && password == confirmPassword && password.count >= 6
    }

    private func register() {
        guard canSubmit else {
            if password != confirmPassword {
                errorMessage = "Passwords don't match"
            } else if password.count < 6 {
                errorMessage = "Password must be at least 6 characters"
            }
            return
        }
        focusedField = nil
        isLoading = true
        errorMessage = nil
        HapticEngine.medium()

        Task {
            do {
                try await appState.register(email: email, username: username, password: password)
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
                HapticEngine.error()
            }
            isLoading = false
        }
    }
}
