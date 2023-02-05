const puppeteer = require('puppeteer')

async function getAllMatches(browserPage) {
  const handleMatched = function (matches, result) {
    for (const match of matches.filter(Boolean)) {
      try {
        const { id, fixture, markets, meta } = match
        const { competitors, score, status, startTime, tournament } = fixture

        const { value: mapIndex } = meta.find(spec => spec.name === "state_number") || {}
        const { value: sideAway } = meta.find(spec => spec.name === "side_away") || {}
        const { value: sideHome } = meta.find(spec => spec.name === "side_home") || {}
        const { value: bo } = meta.find(spec => spec.name === "bo") || {}

        const filtered_markets = markets.filter((item) => { return item.id == "7m1" || item.id == "7m2" })

        const { name: tournamentName, id: tournamentId } = tournament
        const { name: home, score: homeScore } = competitors.find(cmp => /home/i.test(cmp.homeAway))
        const { name: away, score: awayScore } = competitors.find(cmp => /away/i.test(cmp.homeAway))

        const { points: homeCurrentPoint } = homeScore.find(score => score.number === parseInt(mapIndex))
        const { points: awayCurrentPoint } = awayScore.find(score => score.number === parseInt(mapIndex))

        result[id] = {
          id,
          originalId: id.length > 36 ? id.slice(-36) : id,
          score,
          status,
          startTime: +new Date(startTime),
          home: {
            name: home,
            currentPoint: homeCurrentPoint,
            side: sideHome
          },
          away: {
            name: away,
            currentPoint: awayCurrentPoint,
            side: sideAway
          },
          markets: filtered_markets,
          mapIndex,
          tournamentName,
          tournamentId,
          bo
        }
      } catch (e) {
        console.log(e)
      }
    }
  }
  const handleWebSocketFrameReceived = async (params, resolve) => {
    const result = {}
    try {
      const data = JSON.parse(params.response.payloadData)
      // console.log("received data", data);
      if (data && data.payload && data.payload.data && data.payload.data.matches) {
        const { matches } = data.payload.data
        handleMatched(matches, result)
      } else if (data && data.payload && data.payload.data && data.payload.data.sportEventListByFilters) {
        const matches = data.payload.data.sportEventListByFilters.sportEvents
        handleMatched(matches, result)
      }
      if (Object.keys(result).length)
        resolve(result)
    } catch (e) {
      // console.log(e)
    }
  }
  const f12 = await browserPage.target().createCDPSession()
  await f12.send('Network.enable')
  await f12.send('Page.enable')

  const result = await new Promise((resolve) => {
    f12.on('Network.webSocketFrameReceived', params => handleWebSocketFrameReceived(params, resolve))
  })
  return result
}

async function getMatches(browserPage, matchListUpdateCb, matchUpdateCb) {

  const handleWebSocketFrameReceived = async (params, matchListUpdateCb, matchUpdateCb) => {

    try {
      const data = JSON.parse(params.response.payloadData)
      // console.log("received data", data);
      if (data && data.payload && data.payload.data && data.payload.data.matches) {
        const result = {}
        const { matches } = data.payload.data

        for (const match of matches.filter(Boolean)) {
          try {
            const { id, fixture } = match
            const { competitors, score, status, startTime, tournament } = fixture
            const { markets } = match
            const { meta } = match

            const { value: mapIndex } = meta.find(spec => spec.name === "state_number") || {}
            const { value: sideAway } = meta.find(spec => spec.name === "side_away") || {}
            const { value: sideHome } = meta.find(spec => spec.name === "side_home") || {}
            const { value: bo } = meta.find(spec => spec.name === "bo") || {}


            // only handle live game
            if (status != "LIVE" && status != "ENDED") continue;


            const { name: tournamentName, id: tournamentId } = tournament
            const { name: home, score: homeScore } = competitors.find(cmp => /home/i.test(cmp.homeAway))
            const { name: away, score: awayScore } = competitors.find(cmp => /away/i.test(cmp.homeAway))

            const { points: homeCurrentPoint } = homeScore.find(score => score.number === parseInt(mapIndex))
            const { points: awayCurrentPoint } = awayScore.find(score => score.number === parseInt(mapIndex))

            result[id] = {
              id,
              originalId: id.length > 36 ? id.slice(-36) : id,
              score,
              status,
              startTime: +new Date(startTime),
              home: {
                name: home,
                currentPoint: homeCurrentPoint,
                side: sideHome
              },
              away: {
                name: away,
                currentPoint: awayCurrentPoint,
                side: sideAway
              },
              mapIndex,
              tournamentName,
              tournamentId,
              bo
            }
            matchListUpdateCb(result)
          } catch (e) {
            console.log(e)
          }
        }
      } else if (data && data.payload && data.payload.data && data.payload.data.sportEventListByFilters) {
        const result = {}
        const matches = data.payload.data.sportEventListByFilters.sportEvents

        for (const match of matches.filter(Boolean)) {
          try {
            const { id, fixture } = match
            const { competitors, score, status, startTime, tournament } = fixture
            const { meta } = match

            const { value: mapIndex } = meta.find(spec => spec.name === "state_number") || {}
            const { value: sideAway } = meta.find(spec => spec.name === "side_away") || {}
            const { value: sideHome } = meta.find(spec => spec.name === "side_home") || {}
            const { value: bo } = meta.find(spec => spec.name === "bo") || {}


            // only handle live game
            if (status != "LIVE" && status != "ENDED") continue;


            const { name: tournamentName, id: tournamentId } = tournament
            const { name: home, score: homeScore } = competitors.find(cmp => /home/i.test(cmp.homeAway))
            const { name: away, score: awayScore } = competitors.find(cmp => /away/i.test(cmp.homeAway))

            const { points: homeCurrentPoint } = homeScore.find(score => score.number === parseInt(mapIndex))
            const { points: awayCurrentPoint } = awayScore.find(score => score.number === parseInt(mapIndex))

            result[id] = {
              id,
              originalId: id.length > 36 ? id.slice(-36) : id,
              score,
              status,
              startTime: +new Date(startTime),
              home: {
                name: home,
                currentPoint: homeCurrentPoint,
                side: sideHome
              },
              away: {
                name: away,
                currentPoint: awayCurrentPoint,
                side: sideAway
              },
              mapIndex,
              tournamentName,
              tournamentId,
              bo
            }
            matchListUpdateCb(result)
          } catch (e) {
            console.log(e)
          }
        }
      } else if (data && data.payload && data.payload.data && data.payload.data.onUpdateSportEvent) {
        // update single match data
        let result = {}
        match = data.payload.data.onUpdateSportEvent
        try {
          const { id, fixture, meta, markets } = match
          const { competitors, score, status } = fixture

          const { value: mapIndex } = meta.find(spec => spec.name === "state_number") || {}
          const { value: sideAway } = meta.find(spec => spec.name === "side_away") || {}
          const { value: sideHome } = meta.find(spec => spec.name === "side_home") || {}

          const { score: homeScore } = competitors[0]
          const { score: awayScore } = competitors[1]

          const { points: homeCurrentPoint } = homeScore.find(score => score.number === parseInt(mapIndex))
          const { points: awayCurrentPoint } = awayScore.find(score => score.number === parseInt(mapIndex))

          result = {
            id,
            originalId: id.length > 36 ? id.slice(-36) : id,
            score,
            status,
            markets,
            home: {
              currentPoint: homeCurrentPoint,
              side: sideHome
            },
            away: {
              currentPoint: awayCurrentPoint,
              side: sideAway
            },
            mapIndex,
          }

          matchUpdateCb(result)
        } catch (e) {
          console.log(e)
        }

      }
    } catch (e) {
      // console.log(e)
    }
  }
  const f12 = await browserPage.target().createCDPSession()
  await f12.send('Network.enable')
  await f12.send('Page.enable')

  await new Promise(() => {
    f12.on('Network.webSocketFrameReceived', params => handleWebSocketFrameReceived(params, matchListUpdateCb, matchUpdateCb))
  })

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
  const browser = await puppeteer.launch({ headless: true, args: args, })
  const page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.117 Safari/537.36')
  await page.setViewport({ width: 1920, height: 1080 })
  const environment = process.env.NODE_ENV
  if (environment != "production") {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  }
  return { browser, page }
}

function generateUrl(baseUrl, discipline) {
  return `${baseUrl}/en/${discipline}`
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
async function getLiveLine(discipline, matchListUpdateCb, matchUpdateCb, args, {
  mirrorUrl = 'https://ggbet.com',
} = {}) {

  if (!discipline) {
    throw new Error('No discipline provided')
  }

  const { browser, page } = await createBrowserAndPage(args)

  const url = generateUrl(mirrorUrl, discipline)

  await page.goto(url, { waitUntil: 'domcontentloaded' })

  // 修改ws请求参数，让其返回完整的market数据
  await page.evaluate(() => {
    WebSocket.prototype.oldSend = WebSocket.prototype.send;

    WebSocket.prototype.send = function (data) {

      obj = JSON.parse(data)
      if (obj.type == "start") {
        obj.payload.variables.isTopMarkets = false
      }
      WebSocket.prototype.oldSend.apply(this, [JSON.stringify(obj)]);
    };
  })

  await page.waitForXPath("//span[contains(., 'Live')]/parent::div", { timeout: 0 })
  const [button] = await page.$x("//span[contains(., 'Live')]/parent::div");

  if (button) {
    await button.click();
  }

  await page.setViewport({
    width: 1098,
    height: 3196,
    deviceScaleFactor: 1,
  });

  console.log("start get live odds");


  const matches = await getMatches(page, matchListUpdateCb, matchUpdateCb)
  await page.close()
  await browser.close()

  return matches
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
async function getAllLine(discipline, args, {
  mirrorUrl = 'https://ggbet.com',
} = {}) {
  if (!discipline) {
    throw new Error('No discipline provided')
  }

  const { browser, page } = await createBrowserAndPage(args)
  const url = generateUrl(mirrorUrl, discipline)

  await page.goto(url, { waitUntil: 'domcontentloaded' })

  // 修改ws请求参数，让其返回完整的market数据
  await page.evaluate(() => {
    WebSocket.prototype.oldSend = WebSocket.prototype.send;

    WebSocket.prototype.send = function (data) {

      obj = JSON.parse(data)
      if (obj.type == "start") {
        obj.payload.variables.isTopMarkets = false
        if (obj?.payload?.variables?.marketLimit) {
          obj.payload.variables.marketLimit = 0
        }
      }
      WebSocket.prototype.oldSend.apply(this, [JSON.stringify(obj)]);
    };
  })

  await page.waitForXPath("//span[contains(., 'Upcoming')]/parent::div", { timeout: 0 })
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

  const matches = await getAllMatches(page)
  await page.close()
  await browser.close()

  return matches
}

module.exports = {
  getLiveLine,
  getAllLine
}
