const scraper = require("./scraper");
const express = require("express");
const http = require("http");
const { CronJob } = require("cron");

const app = express();
const server = http.createServer(app);

function cron() {
  console.log("Cron launched");
  const job = new CronJob(
    "0 32 19 * * *",
    () => scraper(),
    null,
    true,
    "Europe/Paris"
  );

  job.start();
}

cron();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}.`));
