begin
  path = "app/lib/location_name_aliases.json"
  LOCATION_NAME_ALIASES = JSON.parse(File.read(path))
rescue SystemCallError, JSON::ParserError => err
  Rails.logger.error("Couldn't load location name aliases. #{err.message}")
  LOCATION_NAME_ALIASES = {}.freeze
end
