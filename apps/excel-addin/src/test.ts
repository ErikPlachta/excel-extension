// Test entry point for Angular + Karma
import "zone.js";
import "zone.js/testing";

import { getTestBed } from "@angular/core/testing";
import { BrowserTestingModule, platformBrowserTesting } from "@angular/platform-browser/testing";

// Initialize the Angular testing environment using the current Angular testing APIs.
getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
