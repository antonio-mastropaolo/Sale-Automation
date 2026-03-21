import SwiftUI
import PhotosUI

struct CreateListingView: View {
    var onCreated: (() async -> Void)? = nil

    @Environment(\.dismiss) private var dismiss
    @State private var request = CreateListingRequest()
    @State private var selectedPhotos: [PhotosPickerItem] = []
    @State private var imageData: [Data] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    private let api = APIClient.shared
    private let conditions = ["New with Tags", "New without Tags", "Like New", "Good", "Fair", "Poor"]
    private let platforms = ["depop", "grailed", "poshmark", "mercari", "ebay", "vinted", "facebook", "vestiaire"]

    var body: some View {
        NavigationStack {
            Form {
                // Photos
                Section("Photos") {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 10) {
                            ForEach(imageData.indices, id: \.self) { index in
                                if let uiImage = UIImage(data: imageData[index]) {
                                    Image(uiImage: uiImage)
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                        .frame(width: 80, height: 80)
                                        .clipShape(RoundedRectangle(cornerRadius: 8))
                                        .overlay(alignment: .topTrailing) {
                                            Button {
                                                imageData.remove(at: index)
                                            } label: {
                                                Image(systemName: "xmark.circle.fill")
                                                    .font(.caption)
                                                    .foregroundStyle(.white)
                                                    .background(Circle().fill(.black.opacity(0.5)))
                                            }
                                            .offset(x: 4, y: -4)
                                        }
                                }
                            }

                            PhotosPicker(selection: $selectedPhotos, maxSelectionCount: 10, matching: .images) {
                                VStack(spacing: 4) {
                                    Image(systemName: "plus.circle.fill")
                                        .font(.title2)
                                    Text("Add")
                                        .font(.caption2)
                                }
                                .foregroundStyle(Theme.accent)
                                .frame(width: 80, height: 80)
                                .background(Theme.accent.opacity(0.1))
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                            }
                        }
                        .padding(.vertical, 4)
                    }
                    .listRowBackground(Theme.backgroundCard)
                }

                // Basic Info
                Section("Item Details") {
                    TextField("Title", text: $request.title)
                        .listRowBackground(Theme.backgroundCard)
                    TextField("Brand", text: $request.brand)
                        .listRowBackground(Theme.backgroundCard)
                    TextField("Category", text: $request.category)
                        .listRowBackground(Theme.backgroundCard)
                    TextField("Size", text: $request.size)
                        .listRowBackground(Theme.backgroundCard)

                    Picker("Condition", selection: $request.condition) {
                        ForEach(conditions, id: \.self) { condition in
                            Text(condition).tag(condition)
                        }
                    }
                    .listRowBackground(Theme.backgroundCard)
                }

                // Pricing
                Section("Pricing") {
                    HStack {
                        Text("$")
                            .foregroundStyle(Theme.textTertiary)
                        TextField("Listing Price", value: $request.price, format: .number)
                            .keyboardType(.decimalPad)
                    }
                    .listRowBackground(Theme.backgroundCard)

                    HStack {
                        Text("$")
                            .foregroundStyle(Theme.textTertiary)
                        TextField("Cost Price", value: $request.costPrice, format: .number)
                            .keyboardType(.decimalPad)
                    }
                    .listRowBackground(Theme.backgroundCard)

                    if request.price > 0 && request.costPrice > 0 {
                        HStack {
                            Text("Profit")
                                .foregroundStyle(Theme.textTertiary)
                            Spacer()
                            let profit = request.price - request.costPrice
                            Text("$\(String(format: "%.0f", profit))")
                                .foregroundStyle(profit >= 0 ? Theme.success : Theme.error)
                                .fontWeight(.bold)
                        }
                        .listRowBackground(Theme.backgroundCard)
                    }
                }

                // Description
                Section("Description") {
                    TextEditor(text: $request.description)
                        .frame(minHeight: 100)
                        .listRowBackground(Theme.backgroundCard)
                }

                // Platforms
                Section("Platforms") {
                    ForEach(platforms, id: \.self) { platform in
                        Toggle(isOn: Binding(
                            get: { request.platforms.contains(platform) },
                            set: { isOn in
                                if isOn {
                                    request.platforms.append(platform)
                                } else {
                                    request.platforms.removeAll { $0 == platform }
                                }
                            }
                        )) {
                            HStack(spacing: 8) {
                                PlatformIcon(platform: platform, size: 24)
                                Text(platform.capitalized)
                            }
                        }
                        .tint(Theme.accent)
                        .listRowBackground(Theme.backgroundCard)
                    }
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(Theme.error)
                            .listRowBackground(Theme.backgroundCard)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.backgroundPrimary)
            .navigationTitle("New Listing")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Theme.textSecondary)
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        HapticEngine.medium()
                        createListing()
                    } label: {
                        if isLoading {
                            ProgressView().controlSize(.small)
                        } else {
                            Text("Create")
                                .fontWeight(.bold)
                        }
                    }
                    .disabled(request.title.isEmpty || isLoading)
                    .foregroundStyle(Theme.accent)
                }
            }
            .onChange(of: selectedPhotos) { _, newValue in
                loadPhotos(from: newValue)
            }
        }
    }

    private func loadPhotos(from items: [PhotosPickerItem]) {
        Task {
            var newData: [Data] = []
            for item in items {
                if let data = try? await item.loadTransferable(type: Data.self) {
                    newData.append(data)
                }
            }
            imageData = newData
        }
    }

    private func createListing() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                if let firstImage = imageData.first {
                    var fields: [String: String] = [
                        "title": request.title,
                        "description": request.description,
                        "brand": request.brand,
                        "category": request.category,
                        "size": request.size,
                        "condition": request.condition,
                        "price": String(request.price),
                        "costPrice": String(request.costPrice)
                    ]
                    if !request.platforms.isEmpty {
                        fields["platforms"] = request.platforms.joined(separator: ",")
                    }

                    let _: Listing = try await api.upload(
                        "/api/listings",
                        imageData: firstImage,
                        fileName: "photo.jpg",
                        fields: fields
                    )
                } else {
                    let _: Listing = try await api.post("/api/listings", body: request)
                }

                HapticEngine.success()
                await onCreated?()
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
                HapticEngine.error()
            }
            isLoading = false
        }
    }
}
