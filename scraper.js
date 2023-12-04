const puppeteer = require("puppeteer");
const moment = require("moment");
const fs = require("fs").promises;

const scraper = async () => {
  try {
    var browser = await puppeteer.launch();
    console.log("Browser created.");
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on("request", request => {
      const resourceType = request.resourceType();
      if (["image", "font", "stylesheet"].includes(resourceType))
        request.abort();
      else request.continue();
    });
    console.log("Page created.");

    const url =
      "https://www.welcometothejungle.com/en/jobs?refinementList%5Boffices.country_code%5D%5B%5D=FR&refinementList%5Bcontract_type%5D%5B%5D=FULL_TIME&refinementList%5Bcontract_type%5D%5B%5D=INTERNSHIP&refinementList%5Bcontract_type%5D%5B%5D=FREELANCE&query=javascript%20developer&page=1&aroundQuery=France";
    await page.goto(url, { waitUntil: "networkidle2" });

    const totalJobCount = await page.$eval(
      "div[data-testid='jobs-search-results-count']",
      el => {
        return Number(el.textContent);
      }
    );
    console.log(totalJobCount);
    console.log("Total jobs found: %d", totalJobCount);

    const limitDate = moment().subtract(1, "days").toDate();

    const jobList = await page.$$eval(
      "li.ais-Hits-list-item",
      (arr, limitDate) => {
        return arr
          .map(el => {
            const title = el.querySelector("h4").textContent.trim();
            const uri = el.querySelector("a").href;
            const tags = [...el.querySelectorAll(".cJTvEr")].map(tag =>
              tag.textContent.trim()
            );
            const createdAt = el.querySelector("time")?.dateTime;
            return {
              title,
              uri,
              tags,
              createdAt,
            };
          })
          .filter(el => new Date(el.createdAt) > new Date(limitDate));
      },
      limitDate
    );
    console.log("# of recent jobs: ", jobList.length);
    for (let job of jobList) {
      await page.goto(job.uri, { waitUntil: "domcontentloaded" });
      const data = await page.evaluate(() => {
        const companyData = document.querySelector("div.dPVkkc");
        const company = {
          uri: companyData.querySelector("a").href,
          name: companyData.querySelector("h4")?.textContent?.trim() || "",
        };
        const metas = [
          ...document.querySelectorAll(
            "div[data-testid='job-header-metas'] div"
          ),
        ].map(el => el.textContent.trim());
        const isRemote = metas.some(el => el.toLowerCase().includes("remote"));
        return { company, metas, isRemote };
      });

      job = Object.assign(job, data);
    }
    console.log("Job list", jobList);
    await fs.writeFile(
      `./jobs-${Date.now()}.json`,
      JSON.stringify(jobList, null, 2)
    );
  } catch (error) {
    console.error(error);
  } finally {
    await browser.close();
  }
};

module.exports = scraper;
