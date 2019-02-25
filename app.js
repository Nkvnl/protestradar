//DATA
const citiesArr = require('./data/locations.js');
const rssFeeds = require('./data/feeds.js');
const keyWordsArr = require('./data/keywords.js')
//MODELS
const dataEntry = require("./models/dataEntry");
//PACKAGES
var NodeGeocoder = require('node-geocoder');
 
var options = {
  provider: 'google',
 
  httpAdapter: 'https', 
  apiKey: 'AIzaSyBDyUrjezuxZCyN3QnNcpAG1x8ZtBqiXWU', 
  formatter: null         
};
 
var geocoder = NodeGeocoder(options);
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
var day = 864;
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
//MONGODB
mongoose.connect("mongodb://protestradar.com:fVEhZm2ZbqFZveE@ds349045.mlab.com:49045/protests");
//APP SETUP
app.engine('.hbs', expressHbs({defaultLayout: 'layout', extname: '.hbs'}));
app.set('view engine', '.hbs');
app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));
//INTERVAL
setInterval(feedData,600000);
// setInterval(setToExpired,600000);
//ROUTES
app.get('/',function(req,res){
  dataEntry.find({status:'accepted'},function(err,events){
    res.render('index',{events:events})
  })
});

app.get('/accept/:id',function(req,res){
  dataEntry.findById(req.params.id,function(err,acceptedResult){
    geocoder.geocode(acceptedResult.place, function(err, coordinates) {
      console.log(coordinates)
      console.log(typeof coordinates)
      dataEntry.findByIdAndUpdate(req.params.id,{$set:{locationInfo:coordinates,status:'accepted'}},function(err,saved){
        console.log(saved)
      res.redirect('/')
      })
    })
  });
});

app.get('/decline/:id',function(req,res){
  dataEntry.findByIdAndRemove(req.params.id,function(){
    res.redirect('/')
  })
});
//FUNCTIONS
function feedData(){
  scanCount++
  console.log('Scanning for protests... #' + scanCount )
rssFeeds.forEach(function(elem){
(async () => {
  try{
  let feed = await parser.parseURL(elem);
  feed.items.forEach(item => {
    returnedValue = checkString(item.title)
    if(item.date){
    let a = item.date.split('+',1);
    date = a[0].replace(/T|Z/," ");
    } 
    if(returnedValue.title){
    console.log('Found ' + returnedValue.title)
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
          console.log('Dupe ' + res)
        } else {
          return saveToDB(dataEntryObj)
        }
      } else {
        console.log('Error ' + err)
      }
  });
}

function saveToDB(dataEntryObj){
  console.log(dataEntryObj)
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
        html: "<a href='https://protests-niekavanlosenoord.c9users.io/accept/" + c.id + "'>  Accept  </a><a href='https://protests-niekavanlosenoord.c9users.io/decline/" + c.id + "'>  Decline  </a><h5>" + c.headline + "</h5><h5>" + c.link + "</h5><h5>" + c.event + "</h5><h5>" + c.place + "</h5><h5>" + c.date + "</h5><h5>" + c.content + "</h5>" 
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
feedData()
// removeDuplicates()
// cleanDataBase('pending');





