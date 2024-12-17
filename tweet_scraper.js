const Apify = require('apify');
const puppeteer = require('puppeteer'); // Import Puppeteer directly

Apify.Actor.main(async () => {
    // Launch Puppeteer in headless mode
    const browser = await puppeteer.launch({
        headless: true, // Set to false for visible debugging
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    // Target Twitter account username
    const targetUsername = 'lloydblankfein'; // Replace with desired account

    // Open a new browser page
    const page = await browser.newPage();
    console.log(`Opening Twitter profile for @${targetUsername}...`);

    // Set a user agent to avoid blocks
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    );

    // Go to the target Twitter page
    const url = `https://x.com/${targetUsername}`;
    await page.goto(url, { waitUntil: 'networkidle2' });

    console.log('Starting to scrape tweets...');

    let previousHeight;
    const tweetData = new Set(); // Use a Set to avoid duplicates

    // Scroll and scrape tweets dynamically
    while (true) {
        // Extract visible tweets using updated selectors
        const newTweets = await page.$$eval('div[data-testid="tweetText"]', (tweetElements) => {
            return tweetElements.map((element) => element.innerText.trim());
        });

        // Add new tweets to the Set
        newTweets.forEach((tweet) => tweetData.add(tweet));

        // Scroll to the bottom of the page
        previousHeight = await page.evaluate(() => document.body.scrollHeight);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

        // Pause to let new tweets load
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Check if we reached the end
        const newHeight = await page.evaluate(() => document.body.scrollHeight);
        if (newHeight === previousHeight) {
            console.log('No more tweets to load. Finishing up...');
            break;
        }
    }

    // Convert Set to Array and display results
    const tweets = Array.from(tweetData);
    console.log(`Scraped ${tweets.length} tweets!`);

    // Save the tweets to Apify storage or a JSON file
    await Apify.Actor.setValue('tweets', tweets);

    // Close the browser
    await browser.close();

    console.log('Tweets saved successfully!');
});