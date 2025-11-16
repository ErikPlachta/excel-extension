/* Basic command handlers wired for Office ribbon commands.
 * This mirrors the Office Dev Kit templates but keeps logic minimal for now.
 */

/* global Office */
declare const Office: any;

async function onShowTaskpane(event: any) {
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
