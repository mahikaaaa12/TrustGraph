require("dotenv").config();
const mongoose = require("mongoose");

(async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log("✅ Connected");
    console.log("Host:", conn.connection.host);
    console.log("DB:", conn.connection.name);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();