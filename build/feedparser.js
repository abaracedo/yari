import fs from "fs";
import path from "path";
import { promisify } from "util";

import got from "got";
import parser from "fast-xml-parser";
import cheerio from "cheerio";
import tempy from "tempy";

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

async function getFeedEntries(url) {
  const savedFeedEntriesFilePath = path.join(tempy.root, url2filename(url));

  let feedText;
  if (fs.existsSync(savedFeedEntriesFilePath)) {
    console.log(
      `Reusing previously downloaded feed entries from ${savedFeedEntriesFilePath}`
    );
    feedText = (await readFile(savedFeedEntriesFilePath)).toString();
  } else {
    const buffer = await got(url, {
      responseType: "buffer",
      resolveBodyOnly: true,
      timeout: 5000,
      retry: 5,
    });
    feedText = buffer.toString();
    await writeFile(savedFeedEntriesFilePath, feedText);
  }

  const feed = parser.parse(feedText);
  const entries = [];
  for (const item of feed.rss.channel.item) {
    const description = cheerio.load(item.description);
    const summary = description("p").text();
    const title = cheerio.load(item.title).text();
    entries.push({
      url: item.link,
      title,
      pubDate: new Date(item.pubDate),
      creator: item["dc:creator"],
      summary,
    });
  }
  return entries;
}

function url2filename(url, suffix = "txt", prefix = "feedentries") {
  const parsed = new URL(url);
  const pathnameParts = parsed.pathname.split("/").filter(Boolean);
  return `${prefix}-${parsed.hostname}-${pathnameParts.join("-")}.${suffix}`;
}

export { getFeedEntries };
