var mkdirp = require('mkdirp')
var path = require('path')
var inquirer = require('inquirer')
var async = require('async')
var request = require('request')
var fs = require('fs')

var installedScripts = []

function init (pTitle, p, imgd, cssd, jsd) {
  function check (e, i, a) {
    if (e === 'react-dom.min.js' || e === 'react.min.js') return true
    return false
  }

  function getScript (u, cb) {
    request(u, function (err, res, body) {
      if (err) return cb(err)
      return cb(null, body)
    })
  }

  function handleRequest (lib, cb, err, res, body) {
    if (err) return cb(err)
    body = JSON.parse(body)
    if (body !== []) {
      if (lib === 'react' || lib === 'riot') {
        body[0].assets.forEach(function (a, i) {
          var v = body[0].versions[0]
          var ri = a.files.findIndex(function (e, i, a) { if (e === 'riot+compiler.min.js') { return true }; return false })
          if (lib === 'react' && a.files.findIndex(check) !== -1 && a.version === v) {
            var i1 = a.files.findIndex(function (e, i, a) {
              if (e === 'react-dom.min.js') {
                installedScripts.push(e)
                return true
              }
              return false
            })
            var i2 = a.files.findIndex(function (e, i, a) {
              if (e === 'react.min.js') {
                installedScripts.push(e)
                return true
              }
              return false
            })
            var m1 = a.files[i1]
            var m2 = a.files[i2]
            var u1 = 'http://cdn.jsdelivr.net/' + lib + '/' + v + '/' + m1
            var u2 = 'http://cdn.jsdelivr.net/' + lib + '/' + v + '/' + m2
            console.log('Version: %s, File: %s, URL: %s', v, m1, u1)
            console.log('Version: %s, File: %s, URL: %s', v, m2, u2)
            var o = { version: v, files: [m1, m2] }
            getScript(u1, function (err, s) {
              if (err) return cb(err)
              getScript(u2, function (err, s2) {
                if (err) return cb(err)
                return cb(null, [s, s2], o)
              })
            })
          } else if (ri !== -1) {
            var m = a.files[ri]
            var u = 'http://cdn.jsdelivr.net/' + lib + '/' + v + '/' + m
            console.log('Version: %s, Mainfile: %s, URL: %s', v, m, u)
            var o1 = { mainfile: m, version: v }
            getScript(u, function (err, s) {
              if (err) return cb(err)
              installedScripts.push(m)
              return cb(null, s, o1)
            })
          }
        })
      } else {
        var v = body[0].versions[0]
        var i = body[0].assets.findIndex(function (e, i, a) { if (e.version === v) { return true }; return false })
        var m = body[0].assets[i].mainfile
        var u = 'http://cdn.jsdelivr.net/' + lib + '/' + v + '/' + m
        console.log('Version: %s, Mainfile: %s, URL: %s', v, m, u)
        var o = { mainfile: m, version: v }
        getScript(u, function (err, s) {
          if (err) return cb(err)
          installedScripts.push(m)
          return cb(null, s, o)
        })
      }
    } else {
      var e = new Error('Library was not found.')
      return cb(e)
    }
  }

  function getUrls (lib, cb) {
    var baseUrl = 'http://api.jsdelivr.com/v1/jsdelivr/libraries/'
    if (typeof lib === 'string') {
      request(baseUrl + lib, function (err, res, body) {
        return handleRequest(lib, cb, err, res, body)
      })
    } else {
      lib.forEach(function (l) {
        request(baseUrl + l, function (err, res, body) {
          return handleRequest(l, cb, err, res, body)
        })
      })
    }
  }

  function createDocBlock (file) {
    var lines = [
      '/*',
      '* ' + file,
      '*',
      '* Created by ' + process.env.USER,
      '* May the force be with you.',
      '*/',
      '\n'
    ].join('\n')
    return lines
  }

  function createJSDir (lib, cb) {
    mkdirp(jsd, function (err) {
      if (err) return cb(err)
      console.log('Created JS directory!')
      var i = 0
      getUrls(lib, function (err, s, o) {
        i++
        if (err) return cb(err)
        async.parallel([
          function (callback) {
            if (typeof o.mainfile === 'string') {
              var p = path.join(jsd, o.mainfile)
              fs.writeFile(p, s, function (err) {
                if (err) return callback(err)
                callback()
              })
            } else {
              o.files.forEach(function (f, i) {
                var p = path.join(jsd, f)
                fs.writeFile(p, s[i], function (err) {
                  if (err) return callback(err)
                })
              })
              callback()
            }
          }
        ], function (err) {
          if (err) return cb(err)
          if (i > lib.length - 1) {
            console.log('Created library main script file!')
            fs.writeFile(path.join(jsd, 'app.js'), createDocBlock('main.js'), function (err) {
              if (err) return cb(err)
              console.log('Created app main script file!')
              return cb(null)
            })
          }
        })
      })
    })
  }

  function createCSSDir (cb) {
    console.log('Created CSS directory!')
    mkdirp(cssd, function (err) {
      if (err) return cb(err)
      fs.writeFile(path.join(cssd, 'main.css'), createDocBlock('main.css'), function (err) {
        if (err) return cb(err)
        console.log('Created main CSS file!')
        return cb(null)
      })
    })
  }

  function createScriptHTMLTags (space) {
    var s = []
    for (var i in installedScripts) {
      var sc = installedScripts[i]
      if (!/\n/.test(sc)) {
        var line = space + '<script type="text/javascript" src="' + path.join('js', sc) + '"></script>'
        s.push(line)
      }
    }
    return s.join('\n')
  }

  function createMainHTMLContent (title) {
    var lines = [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '  <head>',
      '    <meta charset="UTF-8" />',
      '    <title>' + title + '</title>',
      '  </head>',
      '  <body>',
      '    <!-- Start from here! -->',
      '    ',
      createScriptHTMLTags('    '),
      '  </body>',
      '</html>'
    ].join('\n')
    return lines
  }

  function createMainHTMLFile (cb) {
    fs.writeFile(path.join(p, 'index.html'), createMainHTMLContent(pTitle), function (err) {
      if (err) return cb(err)
      console.log('Created index.html file!')
      return cb(null)
    })
  }

  function createIMGDir (cb) {
    mkdirp(imgd, function (err) {
      if (err) return cb(err)
      console.log('Created img folder!')
      return cb(null)
    })
  }

  function frontEnd (lib, cb) {
    mkdirp(p, function (err) {
      if (err) return cb(err)
      console.log('Created project directory!')
      async.parallel([
        function (callback) {
          createJSDir(lib, function (err) {
            if (err) return callback(err)
            console.log('Finished JS initialization process!')
            createMainHTMLFile(function (err) { // This is done for adding the script tags to the index.html file
              if (err) return callback(err)
              console.log('Finished HTML initialization process!')
              return callback(null)
            })
          })
        },
        function (callback) {
          createCSSDir(function (err) {
            if (err) return callback(err)
            console.log('Finished CSS initialization process!')
            return callback(null)
          })
        },
        function (callback) {
          createIMGDir(function (err) {
            if (err) return callback(err)
            console.log('Finished creating the IMG folder!')
            return callback(null)
          })
        }
      ], function (err) {
        if (err) return cb(err)
        return cb(null)
      })
    })
  }

  var ex = {
    prompt: function (cb) {
      inquirer.prompt([{
        type: 'checkbox',
        name: 'lib',
        message: 'What code libraries do you want to use in your project?',
        choices: [{
          name: 'AngularJS',
          value: 'angularjs'
        }, {
          name: 'Riot.js',
          value: 'riot'
        }, {
          name: 'jQuery',
          value: 'jquery'
        }, {
          name: 'React',
          value: 'react'
        }, {
          name: 'Ember.js',
          value: 'emberjs'
        }, {
          name: 'BackboneJS',
          value: 'backbonejs'
        }, {
          name: 'Knockout.js',
          value: 'knockout'
        }, {
          name: 'Vue.js',
          value: 'vue'
        }, {
          name: 'D3.js',
          value: 'd3js'
        }]
      }], function (answers) {
        frontEnd(answers.lib, function (err) {
          if (err) return cb(err)
          return cb(null)
        })
      })
    }
  }

  return ex
}

module.exports = init
