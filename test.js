const ggbetURL = 'https://ggbetily.com'
const ggbetParser = require('./index.js')

ggbetParser.getLine('counter-strike', (matchList) => {
  console.log(matchList)
}, (match) => {
  console.log(match)
}, {
  mirrorUrl: ggbetURL
})
  .then(data => {
    console.log('###########')
    console.log(data)
  })
  .catch(e => console.log(e))
