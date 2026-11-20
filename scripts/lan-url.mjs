import os from "node:os";
for (const [name, list] of Object.entries(os.networkInterfaces()))
  for (const item of list ?? [])
    if (
      item.family === "IPv4" &&
      !item.internal &&
      !item.address.startsWith("169.254.")
    )
      console.log(`${name}: http://${item.address}:5178/`);
console.log(
  "Connect the phone to the same Wi-Fi, then open the Wi-Fi address above. Keep this PC and dev:lan running.",
);
