import Testing
import Foundation
@testable import ListBlitz

@Suite("User Model")
struct UserModelTests {

    private var user: User {
        get throws {
            let response = try TestFixtures.decoder.decode(AuthResponse.self, from: TestFixtures.loginResponse)
            return response.user
        }
    }

    // MARK: - Display Name

    @Test func displayNameUsesUsername() throws {
        let u = try user
        #expect(u.displayName == "antonio")
    }

    @Test func displayNameFallsBackToEmail() {
        let u = User(id: "1", email: "test@test.com", username: "", role: nil, onboarded: nil, createdAt: nil)
        #expect(u.displayName == "test@test.com")
    }

    // MARK: - Initials

    @Test func initialsFromSingleWord() throws {
        let u = try user
        #expect(u.initials == "AN")
    }

    @Test func initialsFromTwoWords() {
        let u = User(id: "1", email: "", username: "John Doe", role: nil, onboarded: nil, createdAt: nil)
        #expect(u.initials == "JD")
    }

    @Test func initialsFromEmail() {
        let u = User(id: "1", email: "ab@test.com", username: "", role: nil, onboarded: nil, createdAt: nil)
        #expect(u.initials == "AB")
    }

    // MARK: - Admin

    @Test func adminByRole() throws {
        let u = try user
        #expect(u.isAdmin == true)
    }

    @Test func adminByUsername() {
        let u = User(id: "1", email: "", username: "antonio", role: "user", onboarded: nil, createdAt: nil)
        #expect(u.isAdmin == true)
    }

    @Test func nonAdmin() {
        let u = User(id: "1", email: "", username: "bob", role: "user", onboarded: nil, createdAt: nil)
        #expect(u.isAdmin == false)
    }

    // MARK: - Codable

    @Test func decodesAllFields() throws {
        let u = try user
        #expect(u.id == "7bc5b294-f3bd-4130-ae33-9e0d044ee3b5")
        #expect(u.email == "admin@listblitz.io")
        #expect(u.username == "antonio")
        #expect(u.role == "admin")
        #expect(u.onboarded == true)
    }

    @Test func optionalFieldsCanBeNil() {
        let json = """
        {"user":{"id":"1","email":"a@b.com","username":"test"}}
        """.data(using: .utf8)!
        let response = try? TestFixtures.decoder.decode(AuthResponse.self, from: json)
        #expect(response?.user.role == nil)
        #expect(response?.user.onboarded == nil)
        #expect(response?.user.createdAt == nil)
    }
}
