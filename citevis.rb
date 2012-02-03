require "sinatra"
require "mongo"
require "json"

configure do
  conn = Mongo::Connection.new("192.168.1.152")
  
  set :conn, conn
  set :citations, conn["crossref"]["citations"] 
end

helpers do

  def data_response object
    content_type "application/json"
    object.to_json
  end

end

post "/doi" do
  doi = request.body.read.strip
  
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

get "/:doi" do
  # TODO start visualisation with a DOI
end

get "/" do
  haml :index
end
