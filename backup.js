const citiesArr = require('locations/locations.js');
const express = require("express")
const Parser = require('rss-parser');
const parser = new Parser({maxRedirects: 100});
const keyWordsArr = ['outcry','Outcry','revolt','Revolt','revolts','revolt','Rally','rally','Rallies','rallies','demo','Demo','Demonstration','Demonstrations','demonstration','demonstrations','Protest','Protests','protests','Riots','protest','riots','scuffles','Scuffles','protesting','Protesting','Hooligan','Hooligans','hooligan','hooligans','Anarchists','anarchist'];
const rssFeeds = ['http://feeds.feedburner.com/cgsblog','http://worldunitednews.blogspot.com/feeds/posts/default','http://justworldnews.org/feed','http://apushcurrentevents.blogspot.com/feeds/posts/default','https://www.blogger.com/feeds/2886832199291333748/posts/default','http://asiandefencenewschannel.blogspot.com/','https://newslanes.com/feed','http://justworldeducational.org/category/blog/feed','http://usahint.com/feed','https://ppapiblogue.blogspot.com/feeds/posts/default?alt=rss','https://cloutwork.com/feed','http://smallwarsjournal.com/rss/blogs','http://www.worldaffairsjournal.org/headlines.xml','https://blog.wan-ifra.org/feed/index.rss','https://www.neweurope.eu/category/world/feed','https://world.wng.org/taxonomy/term/72/feed','https://www.eveningexpress.co.uk/category/news/world/feed','https://www.thelocal.es/feeds/rss.php','https://www.pri.org/stories/feed/everything','http://rss.csmonitor.com/feeds/world','http://www.todayonline.com/feed/world','http://www1.cbn.com/cbnnews/world/feed','http://www.dailytelegraph.com.au/news/world/rss','http://www.channelnewsasia.com/rssfeeds/8395884','http://talkingpointsmemo.com/world-news/feed','http://www.seattletimes.com/nation-world/world/feed','https://www.france24.com/en/rss','https://www.washingtontimes.com/rss/headlines/news/world','http://www.ctvnews.ca/world','https://www.thestar.com/feeds.articles.news.world.rss','https://www.euronews.com/rss?level=theme&name=news','http://feeds.news24.com/articles/news24/World/rss','http://en.rfi.fr/general/rss','http://www.smh.com.au/rssheadlines/world/article/rss.xml','http://feeds.skynews.com/feeds/rss/world.xml','https://www.vox.com/rss/world/index.xml','http://www.abc.net.au/news/feed/52278/rss.xml','http://abcnews.go.com/abcnews/internationalheadlines','http://www.latimes.com/world/rss2.0.xml','https://www.thesun.co.uk/news/worldnews/feed','https://www.cbsnews.com/latest/rss/world','http://feeds.feedburner.com/time/world','https://www.cbc.ca/cmlink/rss-world','http://www.mirror.co.uk/news/world-news/rss.xml','https://www.cnbc.com/id/100727362/device/rss/rss.html','http://feeds.feedburner.com/daily-express-world-news','http://www.independent.co.uk/news/world/rss','https://www.feedspot.com/?followfeedid=4721813','http://timesofindia.indiatimes.com/rssfeeds/296589292.cms','http://feeds.washingtonpost.com/rss/world','https://www.theguardian.com/world/rss','https://www.themoscowtimes.com/feeds/main.xml','http://rss.cnn.com/rss/edition_world.rss','https://www.yahoo.com/news/rss/world','https://www.thecipherbrief.com/feed','http://www.globalissues.org/news/feed','https://www.aljazeera.com/xml/rss/all.xml','https://www.buzzfeed.com/world.xml','https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/world/rss.xml','http://feeds.bbci.co.uk/news/world/rss.xml','https://www.reddit.com/r/worldnews/.rss','https://www.rt.com/rss/','http://feeds.reuters.com/Reuters/PoliticsNews','https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en'];
var result = [];
var protestsArr = [];
var type = null;
var filteredArr = [];
var filteredArrObj = {};
var a = null;
var link = null;
var checkDupeTitle = null;
var fullHeadline = null;
var returnedValue = null;
var count = 0;
var today = new Date();
var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
var date = date+' '+time;

setInterval(feedData, 10000); // Time in milliseconds

function feedData(){
  console.log('Scanning for protests...')
rssFeeds.forEach(function(elem){
(async () => {
  try{
  let feed = await parser.parseURL(elem);
  feed.items.forEach(item => {
    returnedValue = checkString(item.title)
    if(item.date){
    let a = item.date.split('+',1);
    date = a[0].replace(/T|Z/," ");
    } else {}
    if(returnedValue.length >= 2 && returnedValue[0].type !== returnedValue[1].type){
      let filteredArrObj = {date : date,headline : item.title,link : item.link, content:item.contentSnippet};
      if(returnedValue[0].type === 'City'){
        filteredArrObj.city = returnedValue[0].found; 
        filteredArrObj.kw = returnedValue[1].found; 
      } else {
        filteredArrObj.city = returnedValue[1].found; 
        filteredArrObj.kw = returnedValue[0].found; 
      }
      checkDupeTitle = filteredArrObj.headline
      let duplicate = filteredArr.find(dupe);
      if(!duplicate){
        console.log(filteredArrObj)
        filteredArr.push(filteredArrObj)
      } else {}
    } else {}
    empty()
  });
  } catch(err){console.log(err)}
})();
})
}

function checkString(e){
  if(e){
    fullHeadline = e;
  let arr = e.split(' ');
    for(var x = 0; x <= arr.length ; x++){
      check(citiesArr,arr,x)
      check(keyWordsArr,arr,x)
    }
    return protestsArr;
  } else {
    console.log('Undefined input')
  }
}

function dupe(b) { 
    return b.headline === checkDupeTitle;
}

function check(findArr,arr,x){
  let found = findArr.find(function(a) {
    return a === arr[x];
  });
  if(findArr.length > keyWordsArr.length){
    type = 'City'
  } else {
    type = 'Keyword'
  }
  return save(found,type);
}

function save(found,type){
  if(found){
    protestsArr.push({type:type,found:found,headline:fullHeadline,date:date,link:link})
  } else {}
}

function empty(){
  returnedValue = [];
  filteredArrObj = {}
  protestsArr = [];
}

feedData()




