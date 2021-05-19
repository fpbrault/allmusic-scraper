const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');
const fs = require('fs');
const readline = require('readline');

var rd = readline.createInterface({
    input: fs.createReadStream('urllist.txt'),
    output: process.stdout,
    console: false
});

const urlList = []

rd.on('line', function(line) {
    urlList.push({url: line})
    //console.log(line);
});

const baseUrl = "https://www.allmusic.com/album/"

const workbook = new ExcelJS.Workbook();
workbook.addWorksheet('My Sheet');
const worksheet = workbook.getWorksheet('My Sheet');

worksheet.columns = [
    { header: 'PublishedDate', key: 'PublishedDate', width: 15},
    { header: 'AMG ID', key: 'AlbumId', width: 15},
    { header: 'Artist', key: 'Artist', width: 20 },
    { header: 'Album', key: 'Album', width: 20 },
    { header: 'Genre', key: 'Genre' , width: 30},
    { header: 'Styles', key: 'Styles', width: 50 }
];


(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    for (let i = 0; i < urlList.length; i++) {

        await page.goto(baseUrl + urlList[i].url);

        const STYLES_SELECTOR = '.styles';
        const JSON_SELECTOR = 'script[type="application/ld+json"]';

        const json = await page.$(JSON_SELECTOR);
        const jsondata = await json.evaluate(element => element.innerText);


        const styles = await page.$(STYLES_SELECTOR);
        const styledata = await styles.evaluate(element => element.innerText);

        const metadata = JSON.parse(jsondata)

        console.log(metadata);

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
        await page.waitForTimeout(250);
    }
    await workbook.xlsx.writeFile("./album-info.xlsx");
    await browser.close();
})();

