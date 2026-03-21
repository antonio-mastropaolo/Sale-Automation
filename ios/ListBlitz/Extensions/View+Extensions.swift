import SwiftUI

// MARK: - Conditional Modifier

extension View {
    @ViewBuilder
    func `if`<Content: View>(_ condition: Bool, transform: (Self) -> Content) -> some View {
        if condition {
            transform(self)
        } else {
            self
        }
    }

    func shimmer(when loading: Bool) -> some View {
        redacted(reason: loading ? .placeholder : [])
            .shimmering(active: loading)
    }
}

// MARK: - Shimmer Effect

struct Shimmer: ViewModifier {
    let active: Bool
    @State private var phase: CGFloat = 0

    func body(content: Content) -> some View {
        if active {
            content
                .overlay(
                    GeometryReader { geo in
                        LinearGradient(
                            gradient: Gradient(colors: [
                                .clear,
                                .white.opacity(0.1),
                                .clear
                            ]),
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                        .frame(width: geo.size.width * 2)
                        .offset(x: phase * geo.size.width * 2 - geo.size.width)
                    }
                )
                .clipped()
                .onAppear {
                    withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                        phase = 1
                    }
                }
        } else {
            content
        }
    }
}

extension View {
    func shimmering(active: Bool = true) -> some View {
        modifier(Shimmer(active: active))
    }
}

// MARK: - Pull to Refresh Style

struct ListBlitzRefreshStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .scrollContentBackground(.hidden)
            .background(Theme.backgroundPrimary)
    }
}

extension View {
    func listBlitzStyle() -> some View {
        modifier(ListBlitzRefreshStyle())
    }
}
