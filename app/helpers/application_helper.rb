require 'csv'
require 'json'

module ApplicationHelper

  def rds_host
    Rails.env == 'development' ? 'db' : '$RDS_ADDRESS'
  end

  def hash_array_json2csv(input_file, output_file, keys)
    f = CSV.open(output_file, "w") do |csv|
      JSON.parse(File.open(input_file).read).each do |hash|
        csv << hash.values_at(*keys)
      end
    end
    f.close
  end
end
