import SwiftUI
import PhotosUI

struct SmartListView: View {
    var onCreated: (() async -> Void)? = nil

    @Environment(\.dismiss) private var dismiss
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var imageData: Data?
    @State private var previewImage: UIImage?
    @State private var isAnalyzing = false
    @State private var result: SmartListResult?
    @State private var errorMessage: String?
    @State private var showCamera = false

    private let api = APIClient.shared

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.backgroundPrimary.ignoresSafeArea()

                if let result {
                    resultView(result)
                } else if isAnalyzing {
                    analyzingView
                } else {
                    captureView
                }
            }
            .navigationTitle("Smart List")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Theme.textSecondary)
                }
            }
        }
    }

    // MARK: - Capture View

    private var captureView: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "camera.viewfinder")
                .font(.system(size: 64))
                .foregroundStyle(Theme.accent)
                .symbolEffect(.pulse, options: .repeating.speed(0.5))

            VStack(spacing: 8) {
                Text("AI-Powered Listing")
                    .font(.title2.bold())
                    .foregroundStyle(Theme.textPrimary)

                Text("Take a photo or choose from library.\nAI will generate title, description, pricing & more.")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textTertiary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }

            Spacer()

            VStack(spacing: 12) {
                PhotosPicker(selection: $selectedPhoto, matching: .images) {
                    HStack {
                        Image(systemName: "photo.on.rectangle")
                        Text("Choose from Library")
                    }
                    .font(.subheadline.bold())
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(Theme.accentGradient)
                    .foregroundStyle(.black)
                    .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
                }

                Button {
                    HapticEngine.light()
                    showCamera = true
                } label: {
                    HStack {
                        Image(systemName: "camera.fill")
                        Text("Take Photo")
                    }
                    .font(.subheadline.bold())
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(Color.clear)
                    .foregroundStyle(Theme.accent)
                    .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous)
                            .stroke(Theme.accent.opacity(0.4), lineWidth: 1.5)
                    )
                }
            }
            .padding(.horizontal, 32)
            .padding(.bottom, 40)

            if let errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(Theme.error)
            }
        }
        .onChange(of: selectedPhoto) { _, newValue in
            loadAndAnalyze(photo: newValue)
        }
        .fullScreenCover(isPresented: $showCamera) {
            CameraView { data in
                imageData = data
                previewImage = UIImage(data: data)
                analyzeImage(data)
            }
        }
    }

    // MARK: - Analyzing View

    private var analyzingView: some View {
        VStack(spacing: 24) {
            if let previewImage {
                Image(uiImage: previewImage)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(maxHeight: 280)
                    .clipShape(RoundedRectangle(cornerRadius: Theme.radiusLarge, style: .continuous))
                    .padding(.horizontal, 32)
            }

            VStack(spacing: 12) {
                ProgressView()
                    .controlSize(.large)
                    .tint(Theme.accent)

                Text("AI is analyzing your item...")
                    .font(.headline)
                    .foregroundStyle(Theme.textPrimary)

                Text("Generating title, description, pricing, and category")
                    .font(.caption)
                    .foregroundStyle(Theme.textTertiary)
            }
        }
    }

    // MARK: - Result View

    private func resultView(_ result: SmartListResult) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if let previewImage {
                    Image(uiImage: previewImage)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(maxHeight: 200)
                        .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
                        .frame(maxWidth: .infinity)
                }

                VStack(alignment: .leading, spacing: 6) {
                    Label("AI Generated", systemImage: "sparkles")
                        .font(.caption.bold())
                        .foregroundStyle(Theme.accent)

                    Text(result.title ?? "Untitled")
                        .font(.title3.bold())
                        .foregroundStyle(Theme.textPrimary)
                }

                // Details Grid
                LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: 8) {
                    DetailChip(label: "Brand", value: result.brand ?? "--")
                    DetailChip(label: "Category", value: result.category ?? "--")
                    DetailChip(label: "Size", value: result.size ?? "--")
                    DetailChip(label: "Condition", value: result.condition ?? "--")
                    DetailChip(label: "Price", value: "$\(String(format: "%.0f", result.price ?? 0))")
                    DetailChip(label: "Color", value: result.color ?? "--")
                }

                if let desc = result.description, !desc.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Description")
                            .font(.caption.bold())
                            .foregroundStyle(Theme.textTertiary)
                        Text(desc)
                            .font(.subheadline)
                            .foregroundStyle(Theme.textSecondary)
                    }
                    .cardStyle()
                }

                if let tags = result.hashtags, !tags.isEmpty {
                    FlowLayout(spacing: 4) {
                        ForEach(tags, id: \.self) { tag in
                            Text("#\(tag)")
                                .font(.caption2)
                                .foregroundStyle(Theme.accent)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Theme.accent.opacity(0.1))
                                .clipShape(Capsule())
                        }
                    }
                }

                // Create Listing Button
                Button {
                    HapticEngine.medium()
                    createFromResult(result)
                } label: {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                        Text("Create Listing")
                    }
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(Theme.accentGradient)
                    .foregroundStyle(.black)
                    .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
                }
                .padding(.top, 8)

                // Try Again
                Button {
                    HapticEngine.light()
                    self.result = nil
                    self.imageData = nil
                    self.previewImage = nil
                    self.selectedPhoto = nil
                } label: {
                    Text("Try Another Photo")
                        .font(.subheadline)
                        .foregroundStyle(Theme.textSecondary)
                        .frame(maxWidth: .infinity)
                }
            }
            .padding()
        }
    }

    // MARK: - Actions

    private func loadAndAnalyze(photo: PhotosPickerItem?) {
        guard let photo else { return }
        Task {
            if let data = try? await photo.loadTransferable(type: Data.self) {
                imageData = data
                previewImage = UIImage(data: data)
                analyzeImage(data)
            }
        }
    }

    private func analyzeImage(_ data: Data) {
        isAnalyzing = true
        errorMessage = nil

        Task {
            do {
                let smartResult: SmartListResult = try await api.upload(
                    "/api/ai/smart-list",
                    imageData: data,
                    fileName: "smart-list.jpg"
                )
                result = smartResult
                HapticEngine.success()
            } catch {
                errorMessage = error.localizedDescription
                HapticEngine.error()
            }
            isAnalyzing = false
        }
    }

    private func createFromResult(_ result: SmartListResult) {
        Task {
            do {
                var fields: [String: String] = [:]
                if let t = result.title { fields["title"] = t }
                if let d = result.description { fields["description"] = d }
                if let b = result.brand { fields["brand"] = b }
                if let c = result.category { fields["category"] = c }
                if let s = result.size { fields["size"] = s }
                if let cond = result.condition { fields["condition"] = cond }
                if let p = result.price { fields["price"] = String(p) }

                if let data = imageData {
                    let _: Listing = try await api.upload(
                        "/api/listings",
                        imageData: data,
                        fileName: "smart-list.jpg",
                        fields: fields
                    )
                }
                HapticEngine.success()
                await onCreated?()
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
                HapticEngine.error()
            }
        }
    }
}

// MARK: - Smart List Result

struct SmartListResult: Codable {
    let title: String?
    let description: String?
    let brand: String?
    let category: String?
    let size: String?
    let condition: String?
    let price: Double?
    let color: String?
    let hashtags: [String]?
}

// MARK: - Detail Chip

struct DetailChip: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.system(size: 10))
                .foregroundStyle(Theme.textTertiary)
            Text(value)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(Theme.textPrimary)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(Theme.backgroundCard)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

// MARK: - Camera View

struct CameraView: UIViewControllerRepresentable {
    let onCapture: (Data) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onCapture: onCapture, dismiss: dismiss)
    }

    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let onCapture: (Data) -> Void
        let dismiss: DismissAction

        init(onCapture: @escaping (Data) -> Void, dismiss: DismissAction) {
            self.onCapture = onCapture
            self.dismiss = dismiss
        }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage,
               let data = image.jpegData(compressionQuality: 0.8) {
                onCapture(data)
            }
            dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            dismiss()
        }
    }
}
