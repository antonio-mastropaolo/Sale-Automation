import SwiftUI

struct StatusBadge: View {
    let status: String

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(color)
                .frame(width: 6, height: 6)

            Text(status.capitalized)
                .font(.caption2.bold())
                .foregroundStyle(color)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(color.opacity(0.12))
        .clipShape(Capsule())
    }

    private var color: Color {
        Theme.statusColor(status)
    }
}

#Preview {
    HStack {
        StatusBadge(status: "draft")
        StatusBadge(status: "active")
        StatusBadge(status: "sold")
    }
    .padding()
    .background(Theme.backgroundPrimary)
}
