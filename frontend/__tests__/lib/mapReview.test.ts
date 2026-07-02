import { loadReviewItems } from "../../src/lib/map-review";
import { authApi } from "../../src/lib/authApi";

jest.mock("../../src/lib/authApi", () => ({
  authApi: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
  SessionExpiredError: class SessionExpiredError extends Error {
    constructor(message = "Session expired") {
      super(message);
      this.name = "SessionExpiredError";
    }
  },
  clearAuthSession: jest.fn(),
}));

describe("loadReviewItems", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    jest.clearAllMocks();
  });

  it("does not fallback to mock data when the backend cannot provide review items", async () => {
    (authApi.get as jest.Mock).mockRejectedValueOnce(new Error("backend unavailable"));

    const items = await loadReviewItems();

    expect(items).toEqual([]);
  });
});
