import { getHttpsServerOptions } from "office-addin-dev-certs";

async function main() {
  try {
    const options = await getHttpsServerOptions();
    // These properties are typically Buffers or strings; log notice for user.
    console.log("Development HTTPS certificates have been installed or reused.");
    if (options.certPath) {
      console.log("Cert path:", options.certPath);
    }
    if (options.keyPath) {
      console.log("Key path:", options.keyPath);
    }
    console.log("Use these paths with 'ng serve --ssl --ssl-cert <cert> --ssl-key <key>'.");
  } catch (err) {
    console.error("Failed to install development certificates:", err);
    process.exitCode = 1;
  }
}

main();
