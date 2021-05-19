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
    console.log(line);
});

console.log(urlList)

const baseUrl = "https://www.allmusic.com/album/"

/* const urlList = [
    {
        url: 'el-camino-mw0002243314'
    },
    { url: 'brothers-mw0001983497' },
    { url: 'copycat-killer-mw0003506759' },
    { url: 'blood-mw0003476086' }
] */


//const vgmUrl = 'https://www.allmusic.com/album/el-camino-mw0002243314';

const workbook = new ExcelJS.Workbook();
workbook.addWorksheet('My Sheet');
const worksheet = workbook.getWorksheet('My Sheet');

worksheet.columns = [
    { header: 'PublishedDate', key: 'PublishedDate', width: 15},
    { header: 'Artist', key: 'Artist', width: 20 },
    { header: 'Album', key: 'Album', width: 20 },
    { header: 'Genre', key: 'Genre' , width: 50},
    { header: 'Styles', key: 'Styles', width: 50 }
];
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    for (let i = 0; i < urlList.length; i++) {

        await page.goto(baseUrl + urlList[i].url);

        await page.waitForTimeout(500);

        const STYLES_SELECTOR = '.styles';
        const JSON_SELECTOR = 'script[type="application/ld+json"]';

        const json = await page.$(JSON_SELECTOR);
        const jsondata = await json.evaluate(element => element.innerText);


        const styles = await page.$(STYLES_SELECTOR);
        const styledata = await styles.evaluate(element => element.innerText);

        const metadata = JSON.parse(jsondata)

        console.log(metadata);
        console.log(styledata);


        worksheet.addRow(
            {
                Artist: metadata.byArtist[0].name,
                PublishedDate: new Date(metadata.datePublished),
                Album: metadata.name,
                Genre: metadata.genre.join(','),
                Styles: styledata.substring(7).split('\n').join(', ')
            }
        );
        await page.waitForTimeout(500);
    }
    await workbook.xlsx.writeFile("test.xlsx");
    await browser.close();
})();

