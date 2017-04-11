### USAGE
# ruby projects.rb GITHUB_TOKEN
#

require 'typhoeus' # gem install typhoeus
require 'json'

TOKEN = ARGV[0]
APIROOT = 'https://api.github.com/'.freeze

def generate_request(url, timeout = 15_000)
  headers = { 'Accept' => 'application/vnd.github.inertia-preview+json',
              'Authorization' => 'token ' + TOKEN, 'User-Agent' => 'BioNode' }
  Typhoeus::Request.new(url, headers: headers, timeout: timeout)
end

def get_url(url)
  hydra = Typhoeus::Hydra.new
  request = generate_request(url)
  hydra.queue(request)
  hydra.run
  JSON.parse(request.response.body)
end

def get_org_projects(org)
  url = APIROOT + 'orgs/' + org + '/projects'
  org_project = get_url(url)
  org_project[0]['columns_url']
end

def map_requests(obj, url_key, hydra)
  obj.map do |e|
    request = generate_request(e[url_key])
    hydra.queue(request)
    request
  end
end

def get_card_data(cards)
  hydra = Typhoeus::Hydra.new
  requests = map_requests(cards, 'cards_url', hydra)
  hydra.run
  requests.map { |r| JSON.parse(r.response.body) }
end

def get_card_issues(data, cards)
  col_names = get_column_names(cards)
  results = {}
  data.each do |col|
    hydra = Typhoeus::Hydra.new
    requests = map_requests(col, 'content_url', hydra)
    hydra.run
    col_name = get_column_name(col[0], col_names)
    results[col_name] = requests.map { |r| JSON.parse(r.response.body) }
  end
  results
end

def get_column_names(cards)
  results = {}
  cards.each { |col| results[col['id'].to_s] = col['name'] }
  results
end

def get_column_name(card, col_names)
  col_id = card['column_url'].split('/')[-1].to_s
  col_names[col_id]
end

def run(org)
  columns_url = get_org_projects(org)
  cards       = get_url(columns_url) # get  columns urls
  data        = get_card_data(cards) # get cards in each column
  get_card_issues(data, cards) # get more info on each card
end

output = run('bionode')
# puts output.to_json
File.open('_data.json', 'w+') { |io| io.puts output.to_json }
