# Focus

Let's make a plan for building a more stable and professional design within the logic within <src> folder - an Angular SPA Excel Add-In Extension. I've created a new branch, `feat/finalize-concept` for us to working this rebuild.

## Context: Data Driven

At it's core, the code is meant to be data-driven and modular. The shared logic <app-config.default.ts> and <app-config.ts>, are designed to work with core logic <config.services.ts> to make this possible but it's still rough draft.

Application name, navigational elements, user roles, quries, and even styles should be fully data driven. There should be defaults that always exist (like nav should always have login/logout, sso home, and settings), which should be defined in the <app-config.default.ts>, but on user authentication the content will cache and then adjust content accordingly.

## Context: API Logic, Query Logic

For Query and API logic section, we'll be refactoring logic related to <query-api-mock.service.ts>.

### Query Logic

A query should represent a workbook level request (querying data) through whatever solutions exist. It's related to the queries and queries-old features directly. Shouldn't be executing queries through APIs, just coordinating the request and getting information for UI, etc. `QueryDefinition` should represent a query that can be executed against a data source (API endpoint). It should contain details like query name, description, parameters required, and metadata about the expected results (columns, data types, etc.) that will be used by the UI to display results properly and also work with `WorkbookService` and/or `ExcelService` to insert data into Excel accordingly.

### API logic

An API should represent a server endpoint that can be called to get data. It should be defined within a config file that exposes the available endpoints, their required parameters, available column details (name, data-type, isKey, isForeignKey, isRelatedTo, alias(s), description(s)), and API call details (url, method, headers, body template, auth requirements, etc.) We'll need to create a new type definition for this, `ApiDefinition`, and then refactor existing query logic to use this new type. (The `QueryDefinition` is meant to be used by the `Query` feature only, not for defining API endpoints.)

## Excel Logic and Workbook Logic

Both of these features need to be more clearly defined and separated. There is some overlap currently that makes it confusing to understand what logic belongs where.
There are also issues related to performance and resource limits when working with large datasets in Excel. Please refer to the official Microsoft documentation for best practices and guidelines on handling large datasets within Excel Add-Ins.

### Excel Logic

The Excel logic should be handled within `ExcelService`. This service should provide methods for interacting with the Excel host application, such as inserting data into worksheets, formatting cells, managing tables, and handling events. It should abstract away the complexities of the Office.js API and provide a clean interface for other parts of the application to use. We'll need to add more features here, and make sure it's not overlapping with Workbook logic. There should be safeguards limiting access to this service. Should be safeguards related to editing the workbook, so that failed operations don't leave the workbook in a bad state (some examples for context: if an API call fails, workbook should remain unchanged. If adding new columns fails, workbook should remain unchanged. Logic exists to revert changes, even for extremely large datasets.). When operations can not have safegurds, clear error messages should be shown to the user and telemetry events logged. User should be able to override safeguards by UI popup confirmation when appropriate, with options (like "force add columns even if data loss may occur", "Create Copy of Sheet"), etc.

#### Issue to Solve with Large Queries

When a very large dataset is returned from a query, we are hitting Excel's request payload size limit, resulting in errors like the below. This is happening with the query with id `large-dataset` in the mock service. We need to implement logic to handle large datasets more gracefully, such as batching data insertion, using pagination, or providing user feedback when datasets exceed certain thresholds.

```error.txt
[Error] [excel] – "upsertQueryTable" (2)
"The request payload size has exceeded the limit. Please refer to the documentation: \"https://docs.microsoft.com/office/dev/add-ins/concepts/resource-limits-and-performance-optimization#excel-add-ins\"."{hostStatus: {isExcel: true, isOnline: true}, authSummary: {isAuthenticated: true, displayName: "Mock User", roles: ["admin"]}, raw: RequestPayloadSizeLimitExceeded: The request payload size has exceeded the limit. Please refer to th…}Object
logToConsole (main.js:1019)
logEvent (main.js:1000)
normalizeError (main.js:974)
rejected (chunk-XWLXMCJQ.js:47)
onInvoke (chunk-BF7FI6KT.js:7675)
run (zone**js.js:103)
(anonymous function) (zone**js.js:2016)
onInvokeTask (chunk-BF7FI6KT.js:7462)
onInvokeTask (chunk-BF7FI6KT.js:7664)
runTask (zone**js.js:141)
drainMicroTaskQueue (zone**js.js:520)
invokeTask (zone**js.js:440)
invokeTask (zone**js.js:938)
globalCallback (zone**js.js:959)
[Error] [query] – "query.run.failed" (2)
"The request payload size has exceeded the limit. Please refer to the documentation: \"https://docs.microsoft.com/office/dev/add-ins/concepts/resource-limits-and-performance-optimization#excel-add-ins\"."{hostStatus: {isExcel: true, isOnline: true}, authSummary: {isAuthenticated: true, displayName: "Mock User", roles: ["admin"]}, queryId: "large-dataset", mode: "unique"}Object
logToConsole (main.js:1019)
logEvent (main.js:1000)
(anonymous function) (main.js:4211)
fulfilled (chunk-XWLXMCJQ.js:40)
onInvoke (chunk-BF7FI6KT.js:7675)
run (zone**js.js:103)
(anonymous function) (zone**js.js:2016)
onInvokeTask (chunk-BF7FI6KT.js:7462)
onInvokeTask (chunk-BF7FI6KT.js:7664)
runTask (zone**js.js:141)
drainMicroTaskQueue (zone**js.js:520)
invokeTask (zone**js.js:440)
invokeTask (zone**js.js:938)
globalCallback (zone**js.js:959)
```

### Workbook Logic

The Workbook logic should be handled within `WorkbookService`. This service should manage workbook-level operations, such as loading and saving workbook settings, managing named ranges, handling workbook events, and coordinating with `ExcelService` to perform actions within the workbook. It should also handle any workbook-specific state that needs to be maintained across sessions. There should be safeguards limiting access to this service. Should be safeguards related to editing the workbook, so that failed operations don't leave the workbook in a bad state (some examples for context: if an API call fails, workbook should remain unchanged. If adding new columns fails, workbook should remain unchanged. Logic exists to revert changes, even for extremely large datasets.). When operations can not have safegurds, clear error messages should be shown to the user and telemetry events logged. User should be able to override safeguards by UI popup confirmation when appropriate, with options (like "force add columns even if data loss may occur", "Create Copy of Sheet").

### References

I've included a handful of reference's well need to review and then add to documentation as we refactor these features.

- [Application-specific API model](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/application-specific-api-model)
  - This document provides guidance on how to design and implement an application-specific API model for Office Add-Ins, including best practices for handling data and interactions with the host application.
- [Support for task pane and content add-ins](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/support-for-task-pane-and-content-add-ins)
  - This document outlines the support and capabilities of task pane and content add-ins in Office applications, including Excel. It provides information on how to develop and deploy these types of add-ins effectively.
  - You should only use Common APIs for scenarios that aren't supported by application-specific APIs. To learn when to use Common APIs instead of application-specific APIs, see [Excel Add-ins reference overview](https://learn.microsoft.com/en-us/office/dev/add-ins/reference/overview/excel-add-ins-reference-overview).
- [Excel Add-ins reference overview](https://learn.microsoft.com/en-us/office/dev/add-ins/reference/overview/excel-add-ins-reference-overview)
  - This overview provides a comprehensive guide to the Excel Add-Ins reference, including information on the available APIs, objects, and methods that can be used to interact with Excel from an add-in.
- [Excel Add-ins API Reference](https://learn.microsoft.com/en-us/javascript/api/excel?view=excel-js-preview)
  - This is the official API reference for Excel Add-Ins, providing detailed information on the available classes, methods, properties, and events that can be used to interact with Excel from an add-in.
- [Resource limits and performance optimization for Office Add-ins](https://docs.microsoft.com/office/dev/add-ins/concepts/resource-limits-and-performance-optimization#excel-add-ins\).
  - This document provides guidelines on how to optimize performance and handle resource limits when working with large datasets in Excel Add-Ins.
  - It has a section [Untrack unneeded proxy objects](https://learn.microsoft.com/en-us/office/dev/add-ins/concepts/resource-limits-and-performance-optimization#untrack-unneeded-proxy-objects), which can help mitigate memory issues when dealing with large datasets.
