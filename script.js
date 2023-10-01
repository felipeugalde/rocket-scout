const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: false });  // Set headless to false for debugging
  const page = await browser.newPage();
  
  console.log('Navigating to page...');
  await page.goto('https://nhlhutbuilder.com/player-stats.php');
  
  console.log('Opening league dropdown...');
  await page.click('#select2-league_id-container');
  await page.waitForSelector('.select2-search__field', { visible: true });
  await page.type('.select2-search__field', 'NHL');
  await page.keyboard.press('Enter');
  
  console.log('Opening card search dropdown...');
  await page.click('#select2-card_search-container');
  await page.waitForSelector('.select2-search__field', { visible: true });
  await page.type('.select2-search__field', 'Base');
  await page.keyboard.press('Enter');
  
  console.log('Waiting for table to update...');
  await page.waitForSelector('#players_table', { visible: true });
  
  let allData = [];
  
  console.log('Iterating through pages...');
  for (let i = 1; i <= 28; i++) {
    console.log(`Processing page ${i}...`);
    
    if (i === 1) {
      console.log('Extracting headers...');
      const headers = await page.evaluate(() => {
        const headerRow = document.querySelector('#players_table thead tr');
        if (!headerRow) return [];
        const headerColumns = headerRow.querySelectorAll('th');
        return Array.from(headerColumns, column => column.innerText);
      });
      if (headers.length > 0) {
        allData.push(headers);
      } else {
        console.error('Headers not found. Please check the table structure and update the selector accordingly.');
      }
    }
    
    console.log('Extracting data from current page...');
    const data = await page.evaluate(() => {
      const tableRows = document.querySelectorAll('#players_table tbody tr');
      return Array.from(tableRows, row => {
        const columns = row.querySelectorAll('td');
        return Array.from(columns, column => column.innerText);
      });
    });
    allData.push(...data);
    
    if (i < 28) {
      console.log('Navigating to next page...');
      const firstRowBefore = await page.evaluate(() => {
        const firstRow = document.querySelector('#players_table tbody tr');
        return firstRow ? firstRow.innerText : null;
      });
      await page.click('#players_table_next');
      await page.waitForFunction(
        firstRowBefore => {
          const firstRowAfter = document.querySelector('#players_table tbody tr');
          return firstRowAfter && firstRowAfter.innerText !== firstRowBefore;
        },
        {},
        firstRowBefore
      );
    }
  }
  
  console.log('Converting data to CSV...');
  const csvContent = allData.map(row => row.join(',')).join('\n');
  
  console.log('Saving CSV content to file...');
  fs.writeFileSync('table-data.csv', csvContent);
  
  console.log('Closing browser...');
  await browser.close();
  
  console.log('Script completed.');
})();
