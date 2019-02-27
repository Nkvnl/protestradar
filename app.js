//DATA
const cities = require('./data/locations.js');
const citiesArr = cities.a
const e = [];
const rssFeeds = require('./data/feeds.js');
const keyWordsArr = require('./data/keywords.js');
//MODELS
const dataEntry = require("./models/dataEntry");
//GEOCODER API
var options = {
  provider: 'google',
  httpAdapter: 'https', 
  apiKey: 'AIzaSyBDyUrjezuxZCyN3QnNcpAG1x8ZtBqiXWU', 
  formatter: null         
};
//PACKAGES
const bodyParser = require("body-parser");
const LanguageDetect = require('languagedetect');
const lngDetector = new LanguageDetect();
const translate = require('@vitalets/google-translate-api');
const NodeGeocoder = require('node-geocoder');
const geocoder = NodeGeocoder(options);
const express = require("express");
const path = require('path');
const logger = require('morgan');
const expressHbs = require('express-handlebars');
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const Parser = require('rss-parser');
const parser = new Parser({maxRedirects: 100});
//GLOBAL VARIABLES
var result = [];
var protestsArr = [];
var filteredArr = [];
var dataEntryObj = {};
// var day = 86400000;
var translateCount = 0;
var day = 864;
var timeOut = {status:false,count:0,timer:1000};
var count = 0;
var a = null;
var scanCount = 0;
var type = null;
var link = null;
var checkDupeTitle = null;
var fullHeadline = null;
var returnedValue = null;
var today = new Date();
var timeStamp = today.getTime();
var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
var date = date+' '+time;
var app = express();
//DATABASE SETUP
mongoose.connect("mongodb://protestradar.com:fVEhZm2ZbqFZveE@ds349045.mlab.com:49045/protests");
//APP SETUP
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.engine('.hbs', expressHbs({defaultLayout: 'layout', extname: '.hbs'}));
app.set('view engine', '.hbs');
app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));
//INTERVAL
setInterval(feedData,600000);
// setInterval(setToExpired,600000);
//ROUTES

function detectLanguage(input){
  let a = lngDetector.detect(input);
  if(a !== undefined || !a){
  let language = a[0][0];
      translateCount++
  if(language === 'french'|| language === 'italian' || language === 'portuguese' || language === 'german' || language === 'dutch' || language === 'spanish'){
    setTimeout(function() {
      if(timeOut.status === false){
      return translateText(language,input);
      }
    }, 1000 * translateCount)
  } else if(timeOut.status === true) {
    checkTimeout();
  }
  } else {
    return undefined;
  }
}

var f = citiesArr.splice(1,1)
console.log(f)

function checkTimeout(){
  setTimeout(function() {
    timeOut.status = false;
    timeOut.timer = 1000;
  },100000)
}

function translateText(language,input){
  a++
  translate(input, {from: language, to: 'en'}).then(res => {
      console.log(res.from.text.value);
      return res.from.text.value;
  }).catch(err => {
    if(err.code === 'BAD_REQUEST'){
      console.log(err.code)
      console.log(timeOut.status)
      timeOut.status = true;
      timeOut.timer = 100000;
      timeOut.count++
      return input
    } else {
      console.log(err)
      return input
    }
  });
}

app.get('/', function(req, res, next){
  dataEntry.aggregate(
     {
      $match : {$or:[{status:'Ongoing'},{status:'Inactive'}]}},
      { $group:{"_id": "$place", 
      count:{$sum:1},
      headline:{$first:"$headline"},
      status:{$first:"$status"},
      latitude:{$first:"$latitude"},
      longitude:{$first:"$longitude"},
      link:{$push:"$link"},
      from:{$first:"$date"},
      untill:{$last:"$date"}
      },
      },
    { $sort: {count: -1}},
    function(err,protests){
      if(err){
        console.log(err)
      } else {
        dataEntry.find(function(err,results){
    res.render('index',{protests:protests,results:results});
    })
  };
});
});

app.get('/accept/:id',function(req,res){
  dataEntry.findById(req.params.id,function(err,acceptedResult){
    geocoder.geocode(acceptedResult.place, function(err, a) {
      if(err){
        e.push(err)
      }
      let coordinates = a[0]
      dataEntry.findByIdAndUpdate(req.params.id,{$set:{latitude:coordinates.latitude,longitude:coordinates.longitude,GPID:coordinates.extra.googlePlaceId,status:'Ongoing',place:coordinates.formattedAddress}},function(err,saved){
        res.redirect('/')
      })
    })
  });
});


app.post('/edit/send', function(req,res){
  cities.addEntry(req.body.place)
  geocoder.geocode(req.body.place, function(err, a) {
    if(err){
      e.push(err)
    }
    let coordinates = a[0]
    dataEntry.findByIdAndUpdate(req.body.id,{$set:{latitude:coordinates.latitude,longitude:coordinates.longitude,GPID:coordinates.extra.googlePlaceId,status:'Ongoing',place:coordinates.formattedAddress}},function(err,saved){
      res.redirect('/')
    })
  });
});

app.get('/edit/:id',function(req,res){
  dataEntry.findById(req.params.id,function(err,edit){
    cities.deleteEntry(edit.place)
    res.render('edit',{edit:edit})
  });
});

app.get('/decline/:id',function(req,res){
  dataEntry.findByIdAndRemove(req.params.id,function(){
    res.redirect('/')
  })
});
//FUNCTIONS
function findAndRemove(input){
  var found = citiesArr.find(function(element) {
    return element === input
  });
  if(found){
  let a = citiesArr.indexOf(found)
  citiesArr.splice(a,1)
  }
}

function feedData(){
  scanCount++
  console.log('Scanning for protests... #' + scanCount + " @" + date )
rssFeeds.forEach(function(elem){
(async () => {
  try{
  let feed = await parser.parseURL(elem);
  feed.items.forEach(item => {
    // if(timeOut.status === true){
      // console.log('no translation')
    returnedValue = checkString(item.title)
    // } else {
    // let translatedText = detectLanguage(item.title)
    // returnedValue = checkString(translatedText)
    // if(translatedText === undefined || returnedValue === undefined){};
    // }
    if(item.date){
    let a = item.date.split('+',1);
    date = a[0].replace(/T|Z/," ");
    } 
    if(returnedValue.length >= 2 && returnedValue[0].type !== returnedValue[1].type){
      dataEntryObj = {date : date,timeStamp:timeStamp,headline : item.title,link : item.link, content:item.contentSnippet};
      if(returnedValue[0].type === 'City'){
        dataEntryObj.place = returnedValue[0].found; 
        dataEntryObj.event = returnedValue[1].found; 
      } else {
        dataEntryObj.place = returnedValue[1].found; 
        dataEntryObj.event = returnedValue[0].found; 
      }
      find(dataEntryObj)
    };
      empty()
  });
  } catch(err){
  }
})();
})
}

function find(dataEntryObj){
    dataEntry.find({headline:dataEntryObj.headline},function(err,res){
      if(!err){
        if(res.length > 0){
          console.log('Dupe')
        } else {
          return saveToDB(dataEntryObj)
        }
      } else {
        console.log('Error ' + err)
      }
  });
}


function saveToDB(dataEntryObj){
  console.log('save')
  var newDataEntry = new dataEntry({
    date:dataEntryObj.date,
    timeStamp:dataEntryObj.timeStamp,
    headline:dataEntryObj.headline,
    link:dataEntryObj.link,
    content:dataEntryObj.content,
    place:dataEntryObj.place,
    event:dataEntryObj.event
  });
  newDataEntry.save(function(err,res) {
    if(!err){
      console.log('Saved item ' + dataEntryObj.headline)
      verification(res);
    } else {
      console.log(err)
    }
  });
}

function verification(c){
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        auth: {
            user: 'mailserver163@gmail.com',
            pass: 'HIB56JIB79BONc'
        }
    });
    let mailOptions = {
        from: '"www.protestradar.com" <mailserver163@gmail.com>',
        to: 'niek_losenoord@hotmail.com',
        subject: c.headline + 'ID A7U623',
        text: '',
        html: "<a href='https://protests-niekavanlosenoord.c9users.io/accept/" + c.id + "'>  Accept  </a><a href='https://protests-niekavanlosenoord.c9users.io/edit/" + c.id + "'>  Edit  </a> <h5>" + c.headline + "</h5><h5>" + c.link + "</h5><h5>" + c.event + "</h5><h5>" + c.place + "</h5><h5>" + c.date + "</h5><h5>" + c.content + "</h5>" 
    };
    dataEntryObj={};
    transporter.sendMail(mailOptions, (err, info) => {
        if (!err) {
            console.log('Verification sent ' + c.headline)
        } else {
            return console.log(err);
        }
    });
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
    // console.log('Undefined input')
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
  }
}

function empty(){
  returnedValue = [];
  // b = {};
  protestsArr = [];
}
//DELETE ENTRIES AFTER 24 HOURS
function cleanDataBase(status){
  dataEntry.find({status:status},function(err,pending){
    if(err){
      console.log(err)
    }
    if(pending){
      pending.forEach(function(i){
        if(i.timeStamp > i.timeStamp + day){
          if(i.status === 'pending'){
          dataEntry.findByIdAndDelete({_id:i.id},function(removed){
            console.log(removed);
          });
          } else if(i.status === 'accepted'){
            dataEntry.findOneAndUpdate({id:i.id},{$set:{status:'inactive'}},function(updated){
              console.log(updated);
            });
          }
        }
      });
    }
  });
}

function removeDuplicates(){
  dataEntry.find({},function(err,allItems){
      if(!err){
        allItems.forEach(function(i){
          dataEntry.find({headline:i.headline},function(err,dupe){
          console.log(i.headline)
            if(dupe){
              dupe.forEach(function(y){
                dataEntry.findByIdAndRemove({id:y.id},function(removed){
                  console.log(removed)
                })
              })
            }
          })
        })
    } else {
      console.log(err)
    }
  })
}

//SERVER
app.listen(process.env.PORT, process.env.IP, function() {
    console.log("https://www.protestradar.com server online");
})

// getLocation('France')
// feedData()
// removeDuplicates()
// cleanDataBase('pending');





