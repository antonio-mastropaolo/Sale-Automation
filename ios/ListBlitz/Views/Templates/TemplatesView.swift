import SwiftUI

struct TemplatesView: View {
    @State private var templates: [ListingTemplate] = []
    @State private var isLoading = true
    @State private var error: Error?
    @State private var showCreateSheet = false
    @State private var selectedTemplate: ListingTemplate?

    private let api = APIClient.shared

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    LoadingView(message: "Loading templates...")
                } else if let error {
                    ErrorView(error: error) { await loadTemplates() }
                } else if templates.isEmpty {
                    EmptyStateView(
                        icon: "doc.on.doc",
                        title: "No Templates",
                        message: "Create templates to speed up listing creation",
                        actionTitle: "Create Template"
                    ) {
                        HapticEngine.light()
                        showCreateSheet = true
                    }
                } else {
                    templateList
                }
            }
            .background(Theme.backgroundPrimary)
            .navigationTitle("Templates")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        HapticEngine.light()
                        showCreateSheet = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title3)
                            .foregroundStyle(Theme.accent)
                    }
                }
            }
            .refreshable { await loadTemplates() }
            .task { await loadTemplates() }
            .sheet(isPresented: $showCreateSheet) {
                CreateTemplateSheet { await loadTemplates() }
            }
            .navigationDestination(for: ListingTemplate.self) { template in
                CreateListingFromTemplateView(template: template)
            }
        }
    }

    // MARK: - Template List

    private var templateList: some View {
        ScrollView {
            LazyVStack(spacing: 10) {
                ForEach(templates) { template in
                    TemplateCard(template: template)
                        .contextMenu {
                            Button(role: .destructive) {
                                Task { await deleteTemplate(template) }
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 32)
        }
    }

    // MARK: - Data

    private func loadTemplates() async {
        isLoading = templates.isEmpty
        do {
            templates = try await api.get("/api/templates")
            error = nil
        } catch {
            self.error = error
        }
        isLoading = false
    }

    private func deleteTemplate(_ template: ListingTemplate) async {
        do {
            try await api.delete("/api/templates/\(template.id)")
            HapticEngine.success()
            withAnimation(.smooth) {
                templates.removeAll { $0.id == template.id }
            }
        } catch {
            HapticEngine.error()
        }
    }
}

// MARK: - Template Card

private struct TemplateCard: View {
    let template: ListingTemplate

    var body: some View {
        NavigationLink(value: template) {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Image(systemName: "doc.text.fill")
                        .font(.title3)
                        .foregroundStyle(Theme.iosPurple)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(template.name)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Theme.textPrimary)
                            .lineLimit(1)

                        HStack(spacing: 6) {
                            if let category = template.category, !category.isEmpty {
                                Text(category)
                                    .font(.caption)
                                    .foregroundStyle(Theme.textTertiary)
                            }
                            if let brand = template.brand, !brand.isEmpty {
                                if template.category != nil {
                                    Text("·")
                                        .foregroundStyle(Theme.textTertiary)
                                }
                                Text(brand)
                                    .font(.caption)
                                    .foregroundStyle(Theme.textTertiary)
                            }
                        }
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Theme.textTertiary)
                }

                if let tags = template.tags, !tags.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(tags, id: \.self) { tag in
                                Text(tag)
                                    .font(.system(size: 10, weight: .medium))
                                    .foregroundStyle(Theme.accent)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 3)
                                    .background(Theme.accent.opacity(0.12))
                                    .clipShape(Capsule())
                            }
                        }
                    }
                }

                if let condition = template.condition {
                    HStack(spacing: 6) {
                        Text("Condition:")
                            .font(.caption)
                            .foregroundStyle(Theme.textTertiary)
                        Text(condition)
                            .font(.caption.weight(.medium))
                            .foregroundStyle(Theme.textSecondary)
                    }
                }

                HStack {
                    Spacer()
                    Text("Use Template")
                        .font(.caption.bold())
                        .foregroundStyle(Theme.accent)
                }
            }
            .cardStyle()
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Create Template Sheet

private struct CreateTemplateSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var category = ""
    @State private var brand = ""
    @State private var condition = "Good"
    @State private var templateDescription = ""
    @State private var tagsText = ""
    @State private var isSaving = false

    private let api = APIClient.shared
    let onSave: () async -> Void

    private let conditions = ["New", "Like New", "Good", "Fair", "Poor"]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    fieldGroup("Name") {
                        TextField("Template name", text: $name)
                            .textFieldStyle(.plain)
                            .foregroundStyle(Theme.textPrimary)
                    }

                    fieldGroup("Category") {
                        TextField("e.g. Jackets, Sneakers", text: $category)
                            .textFieldStyle(.plain)
                            .foregroundStyle(Theme.textPrimary)
                    }

                    fieldGroup("Brand") {
                        TextField("e.g. Nike, Carhartt", text: $brand)
                            .textFieldStyle(.plain)
                            .foregroundStyle(Theme.textPrimary)
                    }

                    fieldGroup("Condition") {
                        Picker("Condition", selection: $condition) {
                            ForEach(conditions, id: \.self) { c in
                                Text(c).tag(c)
                            }
                        }
                        .pickerStyle(.segmented)
                    }

                    fieldGroup("Description") {
                        TextField("Default description...", text: $templateDescription, axis: .vertical)
                            .textFieldStyle(.plain)
                            .foregroundStyle(Theme.textPrimary)
                            .lineLimit(3...6)
                    }

                    fieldGroup("Tags (comma-separated)") {
                        TextField("vintage, streetwear, 90s", text: $tagsText)
                            .textFieldStyle(.plain)
                            .foregroundStyle(Theme.textPrimary)
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 32)
            }
            .background(Theme.backgroundPrimary)
            .navigationTitle("New Template")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Theme.textSecondary)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await saveTemplate() }
                    } label: {
                        if isSaving {
                            ProgressView()
                                .controlSize(.small)
                                .tint(Theme.accent)
                        } else {
                            Text("Save")
                                .bold()
                                .foregroundStyle(name.isEmpty ? Theme.textTertiary : Theme.accent)
                        }
                    }
                    .disabled(name.isEmpty || isSaving)
                }
            }
        }
    }

    @ViewBuilder
    private func fieldGroup(_ label: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.caption.bold())
                .foregroundStyle(Theme.textTertiary)
            content()
                .padding(12)
                .background(Theme.backgroundCard)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMedium, style: .continuous))
        }
    }

    private func saveTemplate() async {
        isSaving = true
        let tags = tagsText.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }

        let body = CreateTemplateBody(
            name: name,
            category: category.isEmpty ? nil : category,
            brand: brand.isEmpty ? nil : brand,
            condition: condition,
            description: templateDescription.isEmpty ? nil : templateDescription,
            tags: tags.isEmpty ? nil : tags
        )

        do {
            let _: ListingTemplate = try await api.post("/api/templates", body: body)
            HapticEngine.success()
            await onSave()
            dismiss()
        } catch {
            HapticEngine.error()
            isSaving = false
        }
    }
}

private struct CreateTemplateBody: Encodable {
    let name: String
    let category: String?
    let brand: String?
    let condition: String?
    let description: String?
    let tags: [String]?
}

// MARK: - Create Listing From Template

private struct CreateListingFromTemplateView: View {
    let template: ListingTemplate

    var body: some View {
        CreateListingView()
    }
}

// MARK: - Model

struct ListingTemplate: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    var category: String?
    var brand: String?
    var condition: String?
    var description: String?
    var tags: [String]?

    static func == (lhs: ListingTemplate, rhs: ListingTemplate) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

#Preview {
    TemplatesView()
}
