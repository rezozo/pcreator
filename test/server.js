/*
* server.js
*
* Created by codeuser
* May the force be with you.
*/

var express = require('express')
var app = express()

app.set('view engine', 'hjs')

app.get('/', function (req, res) {
  res.render('main', { name: 'codeuser' })
})

app.listen(3000, function () {
  console.log('Magic happens on port 3000')
})

