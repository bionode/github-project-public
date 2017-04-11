//// USAGE:
//  node projects.js GITHUB_TOKEN

var fs = require('fs')
var through = require('through2')
var pumpify = require('pumpify')
var request = require('request')

var APIROOT = 'https://api.github.com/'
var TOKEN = process.argv[2]

var getProjects = function (org, cb) {
  var stream = pumpify.obj(
    getOrgProjects(org),
    sendRequest(),
    getColumnsUrl(),
    sendRequest(),
    getCardUrl(), 
    sendRequest(), // runs for each column (i.e. produces a set of issues for each column )
    getIssueUrl(), 
    sendRequest() // runs for each issue ( i.e. produces one set of issues (ideally this would produce a set of issues for each column))
  )
  if (cb) { stream.pipe(concat(cb)) } else { return stream }
}

function getOrgProjects (org) {
  var stream = through.obj(transform)
  return stream

  function transform (obj, enc, next) {
    var url = APIROOT + 'orgs/' + org + '/projects'
    this.push(url)
    next()
  }
}

// SendRequest
function sendRequest () {
  var headers = {
    'Accept': 'application/vnd.github.inertia-preview+json',
    'Authorization': 'token ' + TOKEN,
    'User-Agent': 'BioNode'
  }

  var stream = through.obj(transform)
  return stream

  function transform (url, enc, next) {
    var self = this
    var options = { url: url, headers: headers }
    request(options, gotData)
    function gotData (err, res, body) {
      self.push(body)
      next()
    }
  }
}

function getColumnsUrl () {
  var stream = through.obj(transform)
  return stream

  function transform (obj, enc, next) {
    var data = JSON.parse(obj)
    this.push(data[0].columns_url)
    next()
  }
}

function getCardUrl () {
  var stream = through.obj(transform)
  return stream

  function transform (obj, enc, next) {
    var data = JSON.parse(obj)
    fs.writeFile('columns.json', obj)
    data.forEach(arr => this.push(arr.cards_url)) // push once for each column
    next()
  }
}

function getIssueUrl () {
  var stream = through.obj(transform)
  return stream

  function transform (obj, enc, next) {
    var data = JSON.parse(obj)
    data.forEach(arr => this.push(arr.content_url)) // push for each issue... 
    next()
  }
}

var pipeline = getProjects('bionode')
pipeline.write()
pipeline.pipe(process.stdout)
