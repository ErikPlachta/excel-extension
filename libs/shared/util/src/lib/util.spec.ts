import { truncateToken } from "./util";

describe("util", () => {
  describe("truncateToken", () => {
    it("should return null for null input", () => {
      expect(truncateToken(null)).toBeNull();
    });

    it("should return null for undefined input", () => {
      expect(truncateToken(undefined)).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(truncateToken("")).toBeNull();
    });

    it("should truncate token longer than default length", () => {
      const result = truncateToken("abcdefghijklmnop");
      expect(result).toBe("abcdefghij…");
    });

    it("should not truncate token shorter than default length", () => {
      const result = truncateToken("abcde");
      expect(result).toBe("abcde");
    });

    it("should not truncate token equal to default length", () => {
      const result = truncateToken("abcdefghij");
      expect(result).toBe("abcdefghij");
    });

    it("should use custom length when provided", () => {
      const result = truncateToken("abcdefghijklmnop", 5);
      expect(result).toBe("abcde…");
    });

    it("should handle token exactly matching custom length", () => {
      const result = truncateToken("abcde", 5);
      expect(result).toBe("abcde");
    });

    it("should truncate long JWT-like token", () => {
      const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ";
      const result = truncateToken(jwt);
      expect(result).toBe("eyJhbGciOi…");
    });

    it("should add ellipsis only when truncating", () => {
      const shortToken = "abc";
      const longToken = "abcdefghijklmnop";

      expect(truncateToken(shortToken)).toBe("abc");
      expect(truncateToken(longToken)).toContain("…");
    });
  });
});
