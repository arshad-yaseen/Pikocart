var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var fileUpload = require('express-fileupload')
var userRouter = require('./routes/user');
var adminRouter = require('./routes/admin');
var hbs = require('express-handlebars')
var Handlebars = require('handlebars');
var app = express();
var fileUpload = require('express-fileupload')
var db = require('./config/connection')
var session = require('express-session')

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.engine('hbs', hbs.engine({
  extname: 'hbs',
  defaultLayout: 'layout',
  layoutsDir: __dirname + '/views/layout/',
  partialsDir: __dirname + '/views/partials'
}))
app.use(logger('dev'));
app.use(express.json());
app.use(fileUpload())
app.use(express.urlencoded({ extended: false }));    
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({secret:"Key",cookie:{maxAge:6000000000000000}}))

db.connect((err)=> {
  if (err){ console.log('Database Connection Error' + err) }
  else { console.log('Database Connected') }
})

app.use('/', userRouter);
app.use('/admin', adminRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404)); 
});

// CHANGE INDEX VALUE STARTS FROM 1
Handlebars.registerHelper("inc", function(value, options)
{
    return parseInt(value) + 1;
});

// CHECK ORDERTRACK IS EQUAL TO SHIPPED
Handlebars.registerHelper('ifCond', function(orderTrack, shipped, options) {
  if(orderTrack == shipped ) {
    return options.fn(this);
  }
  return options.inverse(this);
});
Handlebars.registerHelper('ifCond', function(orderTrack, delivered, options) {
  if(orderTrack == delivered ) {
    return options.fn(this);
  }
  return options.inverse(this);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
