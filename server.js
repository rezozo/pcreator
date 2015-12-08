var mkdirp = require('mkdirp')
var path = require('path')
var inquirer = require('inquirer')
var async = require('async')
var request = require('request')
var fs = require('fs')

Object.prototype.toString = function () {
  return JSON.stringify(this, null, 2)
}

Object.prototype.without = function (a) {
  var k = Object.keys(this)
  var o = {}
  var f = this
  k = k.filter(function (n) {
    if (a.indexOf(n) !== -1) return false
    o[n] = f[n]
    return true
  })
  return o
}

Object.prototype.justWith = function (a) {
  var k = Object.keys(this)
  var o = {}
  var f = this
  k = k.filter(function (n) {
    if (a.indexOf(n) !== -1) {
      o[n] = f[n]
      return true
    } else {
      return false
    }
  })
  return o
}

function init (pTitle, p, viewd, publicd) {
  function createPackageJSON (l, desc) {
    var lines = {
      name: pTitle,
      version: '1.0.0',
      description: desc,
      main: 'server.js',
      scripts: {
        test: 'echo \"Error: no test specified\" && exit 1'
      },
      author: process.env.USER,
      license: l || 'MIT',
      dependencies: {}
    }
    return lines
  }

  function getDependency (name, cb) {
    var baseUrl = 'http://registry.npmjs.org/'
    if (typeof name === 'string') {
      request(baseUrl + name + '/latest', function (err, res, body) {
        if (err) return cb(err)
        body = JSON.parse(body)
        var o = body.justWith(['version', 'name'])
        return cb(null, o)
      })
    } else {
      var mods = []
      name.forEach(function (mod, i) {
        request(baseUrl + mod + '/latest', function (err, res, body) {
          if (err) return cb(err)
          body = JSON.parse(body)
          var o = body.justWith(['version', 'name'])
          mods.push(o)
          if (i === name.length - 1) return cb(null, mods)
        })
      })
    }
  }

  function addDepends (obj, depends, cb) {
    getDependency(depends, function (err, mods) {
      if (err) return cb(err)
      mods.forEach(function (o, i) {
        obj[o.name] = '^' + o.version
        if (i === depends.length - 1) {
          return cb(null, obj)
        }
      })
    })
  }

  function createMainViewFile (title) {
    var lines = [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '  <head>',
      '    <meta charset="UTF-8" />',
      '    <title>' + title + '</title>',
      '    <style>',
      '    html, body {',
      '      width: 100%;',
      '      height: 100%;',
      '      margin: 0;',
      '      padding: 0;',
      '      display: flex;',
      '      justify-content: center;',
      '      align-items: center;',
      '    }',
      '    h1 {',
      '      font-family: "HelveticaNeue-Light", "Helvetica Neue Light", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif;',
      '      font-weight: 300;',
      '      color: #ecf0f1;',
      '    }',
      '    </style>',
      '  </head>',
      '  <body>',
      '    <h1>Hello, {{ name }}!</h1>',
      '  </body>',
      '</html>'
    ].join('\n')
    return lines
  }

  function createViewsDir (engine, cb) {
    console.log('Started initializing the views directory...')
    mkdirp(viewd, function (err) {
      if (err) return cb(err)
      console.log('Created views directory!\nCreating main view file...')
      fs.writeFile(path.join(viewd, 'main.hjs'), createMainViewFile(pTitle), function (err) {
        if (err) return cb(err)
        return cb()
      })
    })
  }

  function createRequires (mods) {
    var lines = []
    for (var i in mods) {
      if (!/\n/.test(mods[i]) && mods[i] !== 'hjs') {
        var s = 'var ' + mods[i] + ' = require(\'' + mods[i] + '\')'
        lines.push(s)
      }
    }
    return lines.join('\n')
  }

  function createMainAppFile (mods, cb) {
    console.log('Creating server file...')
    var lines = [
      '/*',
      '* server.js',
      '*',
      '* Created by ' + process.env.USER,
      '* May the force be with you.',
      '*/',
      '',
      createRequires(mods),
      'var app = express()',
      '',
      'app.set(\'view engine\', \'hjs\')',
      '',
      'app.get(\'/\', function (req, res) {',
      '  res.render(\'main\', { name: \'' + process.env.USER + '\' })',
      '})',
      '',
      'app.listen(3000, function () {',
      '  console.log(\'Magic happens on port 3000\')',
      '})',
      '\n'
    ].join('\n')
    fs.writeFile(path.join(p, 'server.js'), lines, function (err) {
      if (err) return cb(err)
      return cb(null)
    })
  }

  function createPublicDir (cb) {
    mkdirp(publicd, function (err) {
      if (err) return cb(err)
      return cb(null)
    })
  }

  function backEnd (l, desc, mods, cb) {
    mkdirp(p, function (err) {
      if (err) return cb(err)
      console.log('Created server directory!')
      async.parallel([
        function (callback) {
          createMainAppFile(mods, function (err) {
            if (err) return callback(err)
            console.log('Finished creating server file!')
            return callback()
          })
        },
        function (callback) {
          createViewsDir(function (err) {
            if (err) return callback(err)
            console.log('Finished initializing the views directory!')
            return callback()
          })
        },
        function (callback) {
          var ls = createPackageJSON(l, desc)
          console.log('Started creating the package.json file!')
          addDepends(ls.dependencies, mods, function (err, obj) {
            if (err) return callback(err)
            var lns = obj.toString()
            fs.writeFile(path.join(p, 'package.json'), lns, function (err) {
              if (err) return callback(err)
              console.log('Finished creating the package.json file!')
              return callback()
            })
          })
        },
        function (callback) {
          createPublicDir(function (err) {
            if (err) return callback(err)
            console.log('Created public directory!')
            return cb(null)
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
        type: 'input',
        name: 'desc',
        message: 'Type here your app\'s short description: '
      }, {
        type: 'input',
        name: 'license',
        message: 'Type here your app\'s license (deafult: MIT): '
      }], function (answers) {
        backEnd(answers.license || 'MIT', answers.desc, ['express', 'hjs'], function (err) {
          if (err) return cb(err)
          return cb(null)
        })
      })
    }
  }

  return ex
}

module.exports = init
