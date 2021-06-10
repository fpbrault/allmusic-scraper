const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');
const fs = require('fs');
const readline = require('readline');

const chalk = require('chalk');
var log = require('loglevel');
const prefix = require('loglevel-plugin-prefix');

const colors = {
    TRACE: chalk.magenta,
    DEBUG: chalk.cyan,
    INFO: chalk.blue,
    WARN: chalk.yellow,
    ERROR: chalk.red,
};

prefix.reg(log);
log.enableAll();

prefix.apply(log, {
    format(level, name, timestamp) {
        return `${chalk.gray(`[${timestamp}]`)} ${colors[level.toUpperCase()](level)} ${chalk.green(`${name}:`)}`;
    },
});

prefix.apply(log.getLogger('critical'), {
    format(level, name, timestamp) {
        return chalk.red.bold(`[${timestamp}] ${level} ${name}:`);
    },
});

log.setLevel("INFO")

console.log("====== ALLMUSIC-SCRAPER ======")


// Read lines from txt file and add them to the urlList array.
var rd = readline.createInterface({
    input: fs.createReadStream('urllist.txt')
});

const urlList = []

rd.on('line', function (line) {
    urlList.push({ url: line })
});

log.debug(urlList)

// Base URL of the pages
const baseUrl = "https://www.allmusic.com/album/"

// Initialize and configure the workbook and worksheet
const workbook = new ExcelJS.Workbook();
workbook.addWorksheet('My Sheet');
const worksheet = workbook.getWorksheet('My Sheet');

// Configure the columns
worksheet.columns = [
    { header: 'PublishedDate', key: 'PublishedDate', width: 15 },
    { header: 'AMG ID', key: 'AlbumId', width: 15 },
    { header: 'Artist', key: 'Artist', width: 20 },
    { header: 'Album', key: 'Album', width: 20 },
    { header: 'Genre', key: 'Genre', width: 30 },
    { header: 'Styles', key: 'Styles', width: 50 }
];

var errorCount = 0;
var errorUrls = [];


(async () => {

    const pageTimeout = 0;

    const userAgent = 'Mozilla/5.0 (compatible; Googlebot/2.1)';
    const browserOptions = {
        headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process']
    };
    const browser = await puppeteer.launch(browserOptions);
    const page = await browser.newPage();
    const pageOptions = {
        timeout: pageTimeout,
        waitUntil: 'domcontentloaded'
    };

    await page.setViewport({ width: 1024, height: 1280 });
    await page.setUserAgent(userAgent);

    log.info("Albums to retrieve: " + urlList.length)
    const agents = ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36", "Mozilla/5.0 (iPad; CPU OS 13_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/79.0.3945.73 Mobile/15E148 Safari/604.1"]
    // Loop through list of albums and retrieve the metadata for each.
    for (let i = 0; i < urlList.length; i++) {
        log.info("Retrieving metadata for " + urlList[i].url + " | " + (i + 1) + "/" + urlList.length)

        try {
            const randomAgent = agents[Math.floor(Math.random() * agents.length)];
            await page.setUserAgent(randomAgent)
            await page.goto(baseUrl + urlList[i].url, pageOptions);

            const STYLES_SELECTOR = '.styles';
            const JSON_SELECTOR = 'script[type="application/ld+json"]';

            const json = await page.$(JSON_SELECTOR);
            const jsondata = await json.evaluate(element => element.innerText);


            const styles = await page.$(STYLES_SELECTOR);
            const styledata = await styles.evaluate(element => element.innerText);

            const metadata = JSON.parse(jsondata)


            log.debug(metadata);

            // Add a new row
            worksheet.addRow(
                {
                    Artist: metadata.byArtist[0].name,
                    AlbumId: urlList[i].url,
                    PublishedDate: new Date(metadata.datePublished),
                    Album: metadata.name,
                    Genre: metadata.genre.join(','),
                    Styles: styledata.substring(7).split('\n').join(', ')
                }
            );
            await page.waitForTimeout(600);
        } catch (e) {
            log.error(urlList[i].url + ' | main program error:' + e);
            errorCount++
            errorUrls.push(urlList[i].url)
        }
    }
    await workbook.xlsx.writeFile("./album-info.xlsx");
    await page.close();
    await browser.close();

    log.info("Scraping completed.")
    if (errorCount > 0) {
        log.warn(errorCount + " album(s) could not be retrieved:")
        log.warn(errorUrls.join(','))
    }
})();

