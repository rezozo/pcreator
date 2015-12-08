#!/usr/bin/env node

var path = require('path')
var inquirer = require('inquirer')
var client = require('./client')
var server = require('./server')

Array.prototype.findIndex = function (predicate) {
  if (this === null) {
    throw new TypeError('Array.prototype.findIndex called on null or undefined')
  }
  if (typeof predicate !== 'function') {
    throw new TypeError('predicate must be a function')
  }
  var list = Object(this)
  var length = list.length >>> 0
  var thisArg = arguments[1]
  var value

  for (var i = 0; i < length; i++) {
    value = list[i]
    if (predicate.call(thisArg, value, i, list)) {
      return i
    }
  }
  return -1
}

function getFilePath () {
  if (!process.argv[3]) {
    return process.env.PWD
  } else if (!/\//.test(process.argv[2]) || !/\\/.test(process.argv[2]) || /..\//.test(process.argv[2]) || /..\\/.test(process.argv[2])) {
    return path.join(process.env.PWD, process.argv[3])
  } else {
    return process.argv[3]
  }
}

function printHelp (err) {
  if (err) {
    var lines = [
      'Error: ' + err,
      '',
      'Welcome to the PCreator v1.0 help!',
      '',
      'Usage:',
      '  pcreator <project name> <project path> [flags]',
      '',
      'Flags:',
      '  -h or --help - Shows help.'
    ]
    console.log(lines.join('\n'))
    return process.exit(1)
  } else {
    var lns = [
      'Welcome to the PCreator v1.0 help!',
      '',
      'Usage:',
      '  pcreator <project name> <project path> [flags]',
      '',
      'Flags:',
      '  -h or --help - Shows help.'
    ]
    console.log(lns.join('\n'))
    return process.exit(1)
  }
}

if (!process.argv[2]) {
  printHelp('Project name is required')
} else {
  var pTitle = process.argv[2]
  var p = path.join(getFilePath(), process.argv[2])
  var jsd = path.join(p, 'js')
  var cssd = path.join(p, 'css')
  var imgd = path.join(p, 'img')
  var viewd = path.join(p, 'views')
  var publicd = path.join(p, 'public')
}

function init () {
  if (process.argv[4]) {
    if (process.argv[4] === '-h' || process.argv[4] === '--help') {
      return printHelp()
    } else {
      return printHelp('Flag (' + process.argv[4].replace(/\-/g, '') + ') not found.')
    }
  } else {
    inquirer.prompt([{
      type: 'list',
      name: 'type',
      message: 'What\'s the type of your project?',
      choices: [
        'Server (comming soon)',
        'Client'
      ]
    }], function (answers) {
      if (answers.type === 'Client') {
        client(pTitle, p, imgd, cssd, jsd).prompt(function (err) {
          if (err) throw err
          console.log('Done! The new project is located in %s', p)
        })
      } else {
        console.log('Server project creation is not yet implemented... Sorry :(')
        // server(pTitle, p, viewd, publicd).prompt(function (err) {
        //   if (err) throw err
        //   console.log('Done! The new project is located in %s', p)
        // })
      }
    })
  }
}

init()
