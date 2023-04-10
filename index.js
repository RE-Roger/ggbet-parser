const puppeteer = require("puppeteer");

class NoMatchInfoException extends Error {
  constructor(message) {
    super(message);
    this.name = "NoMatchInfoException";
  }
}

const handleMatched = function (matches, result) {
  for (const match of matches.filter(Boolean)) {
    try {
      const { id, fixture, markets, meta } = match;
      const { competitors, score, status, startTime, tournament } = fixture;

      const { value: mapIndex } =
        meta.find((spec) => spec.name === "state_number") || {};
      const { value: sideAway } =
        meta.find((spec) => spec.name === "side_away") || {};
      const { value: sideHome } =
        meta.find((spec) => spec.name === "side_home") || {};

      const { value: bo } = meta.find((spec) => spec.name === "bo") || {};

      const filtered_markets = markets.filter((item) => {
        return (
          item.id.startsWith("7m") ||
          item.id.startsWith("299h") ||
          item.id.startsWith("300m")
        );
      });

      const { name: tournamentName, id: tournamentId } = tournament;
      const {
        name: home,
        score: homeScore,
        id: homeId,
      } = competitors.find((cmp) => /home/i.test(cmp.homeAway));
      const {
        name: away,
        score: awayScore,
        id: awayId,
      } = competitors.find((cmp) => /away/i.test(cmp.homeAway));

      const { points: homeCurrentPoint } = homeScore.find(
        (score) => score.number === parseInt(mapIndex)
      );
      const { points: awayCurrentPoint } = awayScore.find(
        (score) => score.number === parseInt(mapIndex)
      );

      result[id] = {
        id,
        originalId: id.length > 36 ? id.slice(-36) : id,
        score,
        status,
        startTime: +new Date(startTime),
        home: {
          id: homeId,
          name: home,
          currentPoint: homeCurrentPoint,
          side: sideHome,
        },
        away: {
          id: awayId,
          name: away,
          currentPoint: awayCurrentPoint,
          side: sideAway,
        },
        markets: filtered_markets,
        mapIndex,
        tournamentName,
        tournamentId,
        bo,
      };
    } catch (e) {
      console.log(e);
    }
  }
};


async function getAllMatches(browserPage, resolve) {
  const handleWebSocketFrameReceived = async (params, resolve) => {
    const result = {};
    try {
      const data = JSON.parse(params.response.payloadData);
      if (
        data &&
        data.payload &&
        data.payload.data &&
        data.payload.data.matches
      ) {
        const { matches } = data.payload.data;
        handleMatched(matches, result);
        if (Object.keys(result).length) resolve(result);
      } else if (
        data &&
        data.payload &&
        data.payload.data &&
        data.payload.data.sportEventListByFilters
      ) {
        const matches = data.payload.data.sportEventListByFilters.sportEvents;
        handleMatched(matches, result);
        if (Object.keys(result).length) resolve(result);
      }
    } catch (e) {
      // console.log(e)
    }
  };
  const f12 = await browserPage.target().createCDPSession();
  await f12.send("Network.enable");
  await f12.send("Page.enable");

  f12.on("Network.webSocketFrameReceived", (params) =>
    handleWebSocketFrameReceived(params, resolve)
  );
}

async function getAllNotLiveMatches(browserPage) {
  const handleWebSocketFrameReceived = async (params, resolve) => {
    const result = {};
    try {
      const data = JSON.parse(params.response.payloadData);
      if (
        data &&
        data.payload &&
        data.payload.data &&
        data.payload.data.matches
      ) {
        const { matches } = data.payload.data;
        handleMatched(matches, result);
        const asArray = Object.entries(result);
        const filtered = asArray.filter(([id, item]) => {
          return item.status == "NOT_STARTED";
        });
        const filtered_result = Object.fromEntries(filtered);
        if (Object.keys(result).length) resolve(filtered_result);
      } else if (
        data &&
        data.payload &&
        data.payload.data &&
        data.payload.data.sportEventListByFilters
      ) {
        const matches = data.payload.data.sportEventListByFilters.sportEvents;
        handleMatched(matches, result);
        const asArray = Object.entries(result);
        const filtered = asArray.filter(([id, item]) => {
          return item.status == "NOT_STARTED";
        });
        const filtered_result = Object.fromEntries(filtered);
        if (Object.keys(result).length) resolve(filtered_result);
      }
    } catch (e) {
      // console.log(e)
    }
  };
  const f12 = await browserPage.target().createCDPSession();
  await f12.send("Network.enable");
  await f12.send("Page.enable");

  const result = await new Promise((resolve) => {
    f12.on("Network.webSocketFrameReceived", (params) =>
      handleWebSocketFrameReceived(params, resolve)
    );
  });
  return result;
}

async function getMatches(browserPage, matchListUpdateCb, matchUpdateCb, re_start_page) {
  matchList = [];
  const handleWebSocketFrameReceived = async (
    params,
    matchListUpdateCb,
    matchUpdateCb
  ) => {
    function get_team_score(id, competitors) {
      if (matchList[id]) {
        const home_comp = competitors.find(
          (competitor) => competitor.id === matchList[id].home.id
        );
        const away_comp = competitors.find(
          (competitor) => competitor.id === matchList[id].away.id
        );
        return {
          home: home_comp.score,
          away: away_comp.score,
        };
      } else {
        re_start_page();
        throw new NoMatchInfoException("no match detail info");
      }
    }

    try {
      const data = JSON.parse(params.response.payloadData);
      // console.log("received data", data);
      if (
        data &&
        data.payload &&
        data.payload.data &&
        data.payload.data.matches
      ) {
        const result = {};
        const { matches } = data.payload.data;
        handleMatched(matches, result);
        matchList = result;
        const asArray = Object.entries(result);
        const filtered = asArray.filter(([id, item]) => { return item.status == "LIVE" })
        const filtered_result = Object.fromEntries(filtered);
        matchListUpdateCb(filtered_result)
      } else if (
        data &&
        data.payload &&
        data.payload.data &&
        data.payload.data.sportEventListByFilters
      ) {
        const result = {};
        const matches = data.payload.data.sportEventListByFilters.sportEvents;
        handleMatched(matches, result);
        matchList = result;
        const asArray = Object.entries(result);
        const filtered = asArray.filter(([id, item]) => { return item.status == "LIVE" })
        const filtered_result = Object.fromEntries(filtered);
        matchListUpdateCb(filtered_result)
      } else if (
        data &&
        data.payload &&
        data.payload.data &&
        data.payload.data.onUpdateSportEvent
      ) {
        // update single match data
        let result = {};
        match = data.payload.data.onUpdateSportEvent;
        try {
          const { id, fixture, meta, markets } = match;
          const { competitors, score, status } = fixture;

          const filtered_markets = markets.filter((item) => {
            return (
              item.id.startsWith("7m") ||
              item.id.startsWith("299h") ||
              item.id.startsWith("300m")
            );
          });

          const { value: mapIndex } =
            meta.find((spec) => spec.name === "state_number") || {};
          const { value: sideAway } =
            meta.find((spec) => spec.name === "side_away") || {};
          const { value: sideHome } =
            meta.find((spec) => spec.name === "side_home") || {};

          const { home: homeScore } = get_team_score(id, competitors);
          const { away: awayScore } = get_team_score(id, competitors);

          const { points: homeCurrentPoint } = homeScore.find(
            (score) => score.number === parseInt(mapIndex)
          );
          const { points: awayCurrentPoint } = awayScore.find(
            (score) => score.number === parseInt(mapIndex)
          );

          result = {
            id,
            originalId: id.length > 36 ? id.slice(-36) : id,
            score,
            status,
            markets: filtered_markets,
            home: {
              currentPoint: homeCurrentPoint,
              side: sideHome,
              score: homeScore,
            },
            away: {
              currentPoint: awayCurrentPoint,
              side: sideAway,
              score: awayScore,
            },
            mapIndex,
          };

          matchUpdateCb(result);
        } catch (e) {
          if (error instanceof NoMatchInfoException) {
            throw new NoMatchInfoException("no match info restart")
          } else {
            console.log(e);
          }
        }
      }
    } catch (e) {
      // console.log(e)
    }
  };

  const f12 = await browserPage.target().createCDPSession();
  await f12.send("Network.enable");
  await f12.send("Page.enable");
  f12.on("Network.webSocketFrameReceived", (params) =>
    handleWebSocketFrameReceived(params, matchListUpdateCb, matchUpdateCb)
  );
}

/*

list of naming discipline in ggbet
- counter-strike
- dota2
- starcraft2
- league-of-legends
- battlegrounds
- call-of-duty
- hearthstone
- overwatch
- and etc

*/

async function createBrowserAndPage(args) {
  const browser = await puppeteer.launch({ headless: true, args: args });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.117 Safari/537.36"
  );
  await page.setViewport({ width: 1920, height: 1080 });
  const environment = process.env.NODE_ENV;
  if (environment != "production") {
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
  }
  return { browser, page };
}

function generateUrl(baseUrl, discipline) {
  return `${baseUrl}/en/${discipline}`;
}

/**
 *
 * @param {string} discipline
 * @param {function} [matchListUpdateCb]
 * @param {function} [matchUpdateCb]
 * @param {object} [args]
 * @param {string} [options.mirrorUrl='https://ggbet.com/en']
 * @returns {Promise<object>}
 */
async function getLiveLine(
  discipline,
  matchListUpdateCb,
  matchUpdateCb,
  args,
  { mirrorUrl = "https://ggbet.com" } = {}
) {
  if (!discipline) {
    throw new Error("No discipline provided");
  }
  const { browser, page } = await createBrowserAndPage(args);

  console.log("start get live odds");
  async function re_start_page() {
    try {
      const [Allbutton] = await page.$x("//span[contains(., 'All')]/parent::div");
      if (Allbutton) {
        await Allbutton.click();
      } else {
        throw new Error("no All button");
      }

      await page.waitForXPath("//div[contains(@class, 'tournamentHeader')]", {
        timeout: 60000,
      });
      const [button] = await page.$x("//span[contains(., 'Live')]/parent::div");

      if (button) {
        await button.click();
      }
    } catch (e) {
      await page.screenshot({
        path: "error.png",
        fullPage: true,
      });
    }
  }

  const url = generateUrl(mirrorUrl, discipline);
  await getMatches(page, matchListUpdateCb, matchUpdateCb, re_start_page);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  // 修改ws请求参数，让其返回完整的market数据
  page.evaluate(() => {
    WebSocket.prototype.oldSend = WebSocket.prototype.send;

    WebSocket.prototype.send = function (data) {
      obj = JSON.parse(data);
      if (obj.type == "start") {
        // show all market
        obj.payload.variables.isTopMarkets = false;
        console.log(data)
      } else if (obj.type == "stop") {
        // do not unsubsribe live odds change
        return;
      }
      WebSocket.prototype.oldSend.apply(this, [JSON.stringify(obj)]);
    };
  });

  try {
    await page.waitForXPath("//span[contains(., 'Live')]/parent::div", {
      timeout: 60000,
    });

    const [button] = await page.$x("//span[contains(., 'Live')]/parent::div");

    if (button) {
      await button.click();
    }

    async function autoScroll(page) {
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          var totalHeight = 0;
          var distance = 100;
          var timer = setInterval(() => {
            var scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= scrollHeight - window.innerHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 2000);
        });
      });
    }

    await page.waitForXPath("//div[contains(@class, 'tournamentHeader')]", {
      timeout: 60000,
    });

    await autoScroll(page);
  } catch (e) {
    await page.screenshot({
      path: "error.png",
      fullPage: true,
    });
    process.exit(1);
  }

  await page.screenshot({
    path: "yoursite.png",
    fullPage: true,
  });

  setInterval(async () => {
    re_start_page();
  }, 1000 * 60 * 5);

  await new Promise(async () => { });
}


function getLine(
  discipline,
  args,
  { mirrorUrl = "https://ggbet.com" } = {}
) {
  return new Promise(async (resolve) => {
    if (!discipline) {
      throw new Error("No discipline provided");
    }

    const { browser, page } = await createBrowserAndPage(args);
    const url = generateUrl(mirrorUrl, discipline);

    getAllMatches(page, async (matches) => {
      console.log("start get all odds");
      resolve(matches);
      await page.close();
      await browser.close();
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    // 修改ws请求参数，让其返回完整的market数据
    await page.evaluate(() => {
      WebSocket.prototype.oldSend = WebSocket.prototype.send;

      WebSocket.prototype.send = function (data) {
        obj = JSON.parse(data);
        if (obj.type == "start") {
          obj.payload.variables.isTopMarkets = false;
          if (obj?.payload?.variables?.marketLimit) {
            obj.payload.variables.marketLimit = 0;
          }
        }
        WebSocket.prototype.oldSend.apply(this, [JSON.stringify(obj)]);
      };
    });

    await page.setViewport({
      width: 1098,
      height: 3196,
      deviceScaleFactor: 1,
    });

    try {
      await page.waitForXPath("//div[contains(@class, 'tournamentHeader')]", {
        timeout: 60000,
      });

    } catch (e) {
      await page.screenshot({
        path: "error.png",
        fullPage: true,
      });
    }
  })
}
/**
 *
 * @param {string} discipline
 * @param {function} [matchListUpdateCb]
 * @param {function} [matchUpdateCb]
 * @param {object} [args]
 * @param {string} [options.mirrorUrl='https://ggbet.com/en']
 * @returns {Promise<object>}
 */
async function getAllLine(
  discipline,
  args,
  { mirrorUrl = "https://ggbet.com" } = {}
) {
  if (!discipline) {
    throw new Error("No discipline provided");
  }

  const { browser, page } = await createBrowserAndPage(args);
  const url = generateUrl(mirrorUrl, discipline);

  const matches = await getAllNotLiveMatches(page);

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  // 修改ws请求参数，让其返回完整的market数据
  await page.evaluate(() => {
    WebSocket.prototype.oldSend = WebSocket.prototype.send;

    WebSocket.prototype.send = function (data) {
      obj = JSON.parse(data);
      if (obj.type == "start") {
        obj.payload.variables.isTopMarkets = false;
        if (obj?.payload?.variables?.marketLimit) {
          obj.payload.variables.marketLimit = 0;
        }
      }
      WebSocket.prototype.oldSend.apply(this, [JSON.stringify(obj)]);
    };
  });

  await page.waitForXPath("//span[contains(., 'Upcoming')]/parent::div", {
    timeout: 60000,
  });
  const [button] = await page.$x("//span[contains(., 'Upcoming')]/parent::div");

  if (button) {
    await button.click();
  }

  await page.setViewport({
    width: 1098,
    height: 3196,
    deviceScaleFactor: 1,
  });

  console.log("start get all odds");


  await page.close();
  await browser.close();

  return matches;
}

module.exports = {
  getLine,
  getLiveLine,
  getAllLine,
};
