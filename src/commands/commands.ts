/* Basic command handlers wired for Office ribbon commands.
 * This mirrors the Office Dev Kit templates but keeps logic minimal for now. // TODO: expand as needed on this file, in step 11 in TODOs
 */

/* global Office */
// Office is provided by the host runtime; keep as any here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Office: any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function onShowTaskpane(event: any): Promise<void> {
  // For now, this is a simple no-op handler with a log.
  console.log("onShowTaskpane invoked", event);

  // Always signal completion so the ribbon button can be re-used.
  event.completed();
}

(function () {
  if (typeof Office !== "undefined" && Office.actions && Office.actions.associate) {
    Office.actions.associate("showTaskpane", onShowTaskpane);
  }
})();

// Export for unit testing
export { onShowTaskpane };
