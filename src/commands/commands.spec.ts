import { onShowTaskpane } from "./commands";

// We can't rely on a real Office runtime in unit tests, so we just
// verify that the handler calls event.completed() and does not throw.

describe("commands:onShowTaskpane", () => {
  it("should call event.completed without throwing", async () => {
    const completed = jasmine.createSpy("completed");
    const fakeEvent = { completed } as { completed: () => void };

    await onShowTaskpane(fakeEvent);

    expect(completed).toHaveBeenCalled();
  });
});
