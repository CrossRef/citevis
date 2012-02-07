require "sinatra"
require "mongo"
require "json"
require "net/http"
require "uri"

configure do
  conn = Mongo::Connection.new("192.168.1.152")
  
  set :conn, conn
  set :citations, conn["crossref"]["citations"]

  if defined?(PhusionPassenger)
    PhusionPassenger.on_event(:starting_worker_process) do |forked|
      conn = Mongo::Connection.new("192.168.1.152")
      set :conn, conn
      set :citations, conn["crossref"]["citations"]
    end
  else
    conn = Mongo::Connection.new("192.168.1.152")
    set :conn, conn
    set :citations, conn["crossref"]["citations"]
  end
end

helpers do

  def data_response object
    content_type "application/json"
    object.to_json
  end

end

post "/refs" do
  doi = env["rack.input"].read.strip
  doi = doi.gsub /^http:\/\/dx\.doi\.org\//, ""
  doi = doi.gsub /^dx\.doi\.org\//, ""
  doi = doi.gsub /^doi:/, ""
  
  coll = settings.citations
  docs = coll.find({"from.doi" => doi, "to.doi" => {"$exists" => true}})

  citations = []

  docs.each do |doc|
    citations << {
      :from => doc["from"]["doi"],
      :to => doc["to"]["doi"]
    }
  end

  data_response citations
end

post "/bibo" do
  doi = env["rack.input"].read.strip
  doi = doi.gsub /^http:\/\/dx\.doi\.org\//, ""
  doi = doi.gsub /^dx\.doi\.org\//, ""
  doi = doi.gsub /^doi:/, ""

  response = Net::HTTP.start("data.crossref.org") do |http|
    req = Net::HTTP::Get.new "/#{URI.escape(doi)}", {
      "Accept" => "application/citeproc+json"
    }
    http.request req
  end

  data_response JSON.parse(response.body)
end

get "/" do
  haml :index
end
