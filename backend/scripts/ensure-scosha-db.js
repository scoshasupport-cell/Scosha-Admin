const mysql = require("mysql2/promise");

const attempts = [
  { user: "root", password: process.env.MYSQL_ROOT_PASSWORD || "ScoshaRoot123!" },
  { user: "root", password: "root" },
  { user: "root", password: "" },
];

async function tryConnect( creds ) {
  const c = await mysql.createConnection({
    host: "127.0.0.1",
    user: creds.user,
    password: creds.password,
    multipleStatements: true,
  });
  return c;
}

async function main() {
  let c;
  for (const creds of attempts) {
    try {
      c = await tryConnect(creds);
      console.log("connected as", creds.user, "with tried password");
      break;
    } catch (e) {
      console.log("fail", creds.user, e.code || e.message);
    }
  }
  if (!c) {
    console.error("Could not connect as root");
    process.exit(1);
  }
  await c.query(
    "CREATE DATABASE IF NOT EXISTS scosha CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
  );
  await c.query("CREATE USER IF NOT EXISTS 'scosha'@'localhost' IDENTIFIED BY 'scosha123'");
  await c.query("CREATE USER IF NOT EXISTS 'scosha'@'%' IDENTIFIED BY 'scosha123'");
  await c.query("GRANT ALL PRIVILEGES ON scosha.* TO 'scosha'@'localhost'");
  await c.query("GRANT ALL PRIVILEGES ON scosha.* TO 'scosha'@'%'");
  await c.query("FLUSH PRIVILEGES");
  const [rows] = await c.query("SHOW DATABASES LIKE 'scosha'");
  console.log("ok", rows);
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
