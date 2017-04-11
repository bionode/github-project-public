#!/usr/bin/env node
// USAGE:
// Set environment var GH_TOKEN
// node projects.js organization

var pumpify = require('pumpify')
var requestStream = require('requesturl-stream')
var ts = require('tool-stream')

var TOKEN = process.env.GH_TOKEN

var APIROOT = 'https://api.github.com/'
var organization = process.argv[2]
var projectURL = APIROOT + 'orgs/' + organization + '/projects'

var requestOptions = {
  json: true,
  headers: headers = {
    'Accept': 'application/vnd.github.inertia-preview+json',
    'Authorization': 'token ' + TOKEN,
    'User-Agent': 'request'
  }
}

var columnsNames = {}
var issuesColumn = {}

var pipeline = pumpify.obj(
  requestStream(requestOptions),
  ts.arraySplit(),
  ts.extractProperty('columns_url'),
  requestStream(requestOptions),
  ts.arraySplit(),
  ts.storeToObject(columnsNames, '{{url}}', 'name'),
  ts.extractProperty('cards_url'),
  requestStream(requestOptions),
  ts.arraySplit(),
  ts.storeToObject(issuesColumn, '{{content_url}}', 'column_url'),
  ts.extractProperty('content_url'),
  requestStream(requestOptions),
  ts.attachStoredValue(issuesColumn, 'url', 'column_url'),
  ts.attachStoredValue(columnsNames, 'column_url', 'column_name'),
  ts.JSONToBuffer(),
  process.stdout
)

pipeline.write(projectURL)
