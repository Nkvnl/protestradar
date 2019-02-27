//DATA
const cities = require('./data/locations.js');
const citiesArr = cities.a
const e = [];
const rssFeeds = require('./data/feeds.js');
const keyWordsArr = require('./data/keywords.js');
//MODELS
const dataEntry = require("./models/dataEntry");
const sourcesDataEntry = require("./models/sourcesData");
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
var day = 86400000;
var tenMinutes = 600000;
var result = [];
var protestsArr = [];
var filteredArr = [];
var dataEntryObj = {};
var source = null;
var translateCount = 0;
var timeOut = {status:false,count:0,timer:1000};
var count = 0;
var a = null;
var b = null;
var scanCount = 0;
var type = null;
var link = null;
var checkDupeTitle = null;
var fullHeadline = null;
var fullContent = null;
var returnedValue = null;
var today = new Date();
var timeStamp = today.getTime();
var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
var date = date+' '+time;
var app = express();
//DATABASE SETUP
mongoose.connect("mongodb://protestradar.com:fVEhZm2ZbqFZveE@ds349045.mlab.com:49045/protests",{ useMongoClient: true });
//APP SETUP
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.engine('.hbs', expressHbs({defaultLayout: 'layout', extname: '.hbs'}));
app.set('view engine', '.hbs');
app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));
//INTERVAL
// setInterval(feedData,tenMinutes);
// setInterval(checkAge,tenMinutes);
//ROUTES

app.get('/', function(req, res, next){
  dataEntry.aggregate(
     {
      $match : {$or:[{status:'Inactive'},{status:'Ongoing'}]}
     },
      { $group:{"_id": "$place", 
      count:{$sum:1},
      headline:{$first:"$headline"},
      status:{$first:"$status"},
      latitude:{$first:"$latitude"},
      longitude:{$first:"$longitude"},
      timeStamp:{$first:"$timeStamp"},
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
function feedData(){
  scanCount++
  console.log('Scanning for protests... #' + scanCount + " first @ " + date)
rssFeeds.forEach(function(elem){
(async () => {
  try{
  let feed = await parser.parseURL(elem);
  feed.items.forEach(item => {
    dataEntry.find({headline:item.title},function(err,res){
      if(err){
        console.log(err)
      } else if(res && res.length > 0){
        return undefined
      } else {
        returnedValue = checkString(item.title, item.contentSnippet);
        if(item.date){
        let a = item.date.split('+',1);
        date = a[0].replace(/T|Z/," ");
        } 
        if(returnedValue && returnedValue.length >= 2 && returnedValue[0].type !== returnedValue[1].type){
          var newSourcesDataEntry = new sourcesDataEntry({
            source:item.link.split('.',2)[1],
          });
          newSourcesDataEntry.save(function(err,res) {});
          dataEntryObj = {date : date,timeStamp:timeStamp,headline : item.title,link : item.link, content:item.contentSnippet};
          if(returnedValue[0].type === 'City'){
            dataEntryObj.place = returnedValue[0].found; 
            dataEntryObj.event = returnedValue[1].found; 
          } else {
            dataEntryObj.place = returnedValue[1].found; 
            dataEntryObj.event = returnedValue[0].found; 
          }
            saveToDB(dataEntryObj)
          };
            empty()
          }
        })
      });
    } catch(err){
  }
})();
})
}

function saveToDB(dataEntryObj){
  // console.log('Saving item...')
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
  // console.log('Sending verification' + c.headline)
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
        html: "<a href='https://protests-niekavanlosenoord.c9users.io/accept/" + c.id + "'>  Accept  </a><br><a href='https://protests-niekavanlosenoord.c9users.io/edit/" + c.id + "'>  Edit  </a> <h5>" + c.headline + "</h5><h5>" + c.link + "</h5><h5>" + c.event + "</h5><h5>" + c.place + "</h5><h5>" + c.date + "</h5><h5>" + c.content + "</h5>" 
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

function checkString(e,c){
  if(e){
  b = e.split(' ')
  if(c){
  b = b.concat(c.split(' '));
  }
    fullHeadline = e;
    fullContent = c;
    for(var x = 0; x <= b.length ; x++){
      let checkedForCities = check(citiesArr,b,x)
      let checkedForKeywords = check(keyWordsArr,b,x)
    }
    return protestsArr;
  }
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
      protestsArr.push({
        type:type,
        found:found,
        content:fullContent,
        headline:fullHeadline,
        date:date,
        link:link
        
      })
  }
}

function empty(){
  returnedValue = [];
  protestsArr = [];
}
//DELETE ENTRIES AFTER 24 HOURS
// function cleanDataBase(status){
//   dataEntry.find({status:status},function(err,pending){
//     if(err){
//       console.log(err)
//     }
//     if(pending){
//       pending.forEach(function(i){
//         if(i.timeStamp > i.timeStamp + day){
//           if(i.status === 'pending'){
//           dataEntry.findByIdAndDelete({_id:i.id},function(removed){
//             console.log(removed);
//           });
//           } else if(i.status === 'accepted'){
//             dataEntry.findOneAndUpdate({id:i.id},{$set:{status:'inactive'}},function(updated){
//               console.log(updated);
//             });
//           }
//         }
//       });
//     }
//   });
// }


function checkAge(){
  dataEntry.find({status:'Ongoing'},function(err,res){
    res.forEach(function(e,i){
      let _24HoursAgo = Date.now() - day
      if(_24HoursAgo > e.timeStamp){
        setToInactive(e._id)
      }
    })
  })
}

function setToInactive(ID){
  dataEntry.findByIdAndUpdate(ID,{status:'Inactive'},function(err,res){
    console.log('saved' + res.headline)
  })
}

function activate(){
  dataEntry.update({status:'Inactive'},{status:'Ongoing'},function(err,res){
    // console.log(res)
  })
}

// activate()


//SERVER
app.listen(process.env.PORT, process.env.IP, function() {
    console.log("https://www.protestradar.com server online");
})

// checkAge()
// getLocation('France')
// feedData()
// test()
// removeDuplicates()
// cleanDataBase('pending');



function test(){
  (async () => {
  try{
    let feed = await parser.parseURL('https://www.rt.com/rss/');
  feed.items.forEach(item => {
    console.log(item.link)
    let dupe = dataEntry.find({headline:'Somali man who illegally entered Canada to flee Trump immigrant crackdown has refugee claim rejected'},function(err,res){
      if(err){
        console.log(err)
      } else if(res && res.length > 0){
        // console.log('Dupe ' + res.headline)
    //     return undefined
      } else {
       console.log('No dupe') 
      }
    })
    })
  }catch(err){
    console.log(err)
  }
  })();
}

